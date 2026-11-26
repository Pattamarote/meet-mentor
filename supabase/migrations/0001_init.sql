-- meet-mentor : โครงสร้างฐานข้อมูล (Supabase / PostgreSQL)
-- รันไฟล์นี้ครั้งเดียวใน Supabase SQL Editor หรือ `supabase db push`
-- เว็บเข้าถึงฐานข้อมูลจากฝั่ง Server เท่านั้น (service role) ทุกตารางเปิด RLS และไม่มี policy ให้ anon

create extension if not exists btree_gist;

-- ---------------------------------------------------------------- tables
create table if not exists public.admins (
  id              uuid primary key default gen_random_uuid(),
  username        text not null unique,
  password_hash   text not null,
  failed_attempts int  not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.members (
  id              uuid primary key default gen_random_uuid(),
  employee_code   text not null unique check (employee_code ~ '^[0-9]{5,6}$'),
  name            text not null check (length(trim(name)) > 0),
  password_hash   text not null,
  status          text not null default 'active' check (status in ('pending','active','suspended')),
  failed_attempts int  not null default 0,
  locked_until    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.mentors (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique check (length(trim(name)) > 0),
  photo_url        text,
  default_location text,
  bio              text,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.slots (
  id         uuid primary key default gen_random_uuid(),
  mentor_id  uuid not null references public.mentors(id) on delete restrict,
  start_at   timestamptz not null,
  end_at     timestamptz not null,
  location   text,
  is_open    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slots_time_ok check (end_at > start_at),
  -- ช่วงเวลาของ Mentor คนเดียวกันห้ามทับซ้อน
  constraint slots_no_overlap exclude using gist (mentor_id with =, tstzrange(start_at, end_at) with &&)
);
create index if not exists slots_start_idx on public.slots (start_at);

create sequence if not exists public.booking_no_seq start 1;

create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  booking_no    text not null unique default ('MM-' || lpad(nextval('public.booking_no_seq')::text, 6, '0')),
  member_id     uuid not null references public.members(id) on delete restrict,
  slot_id       uuid not null references public.slots(id) on delete restrict,
  status        text not null default 'confirmed' check (status in ('confirmed','cancelled')),
  note          text,
  booked_by     text not null,              -- 'member:<code>' หรือ 'admin:<username>'
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  cancelled_at  timestamptz,
  cancel_reason text
);
-- หนึ่งช่วงเวลามีการจองที่ยืนยันได้เพียงรายการเดียว (กันจองพร้อมกันที่ระดับฐานข้อมูล)
create unique index if not exists bookings_one_per_slot on public.bookings (slot_id) where status = 'confirmed';
create index if not exists bookings_member_idx on public.bookings (member_id);

create table if not exists public.booking_history (
  id          bigserial primary key,
  booking_id  uuid not null references public.bookings(id) on delete restrict,
  action      text not null check (action in ('create','move','cancel','note')),
  old_slot_id uuid references public.slots(id),
  new_slot_id uuid references public.slots(id),
  reason      text,
  actor       text not null,
  created_at  timestamptz not null default now()
);
create index if not exists booking_history_booking_idx on public.booking_history (booking_id);

create table if not exists public.settings (
  key   text primary key,
  value text
);

insert into public.settings (key, value) values
  ('max_bookings_per_month', ''),           -- ว่าง = ไม่จำกัด
  ('show_booker_name', 'false'),            -- แสดงชื่อผู้จองให้ User อื่นเห็นหรือไม่
  ('admin_contact', 'ติดต่อ Admin: อีเมล admin@example.com / โทร 02-000-0000'),
  ('allow_self_register', 'true')           -- ให้ User สมัครเอง (สถานะ รออนุมัติ)
on conflict (key) do nothing;

-- ผู้ดูแลเริ่มต้น superadmin / 1234 (เก็บแบบ bcrypt) — กรุณาเปลี่ยนรหัสผ่านหลังเข้าใช้งานครั้งแรก
insert into public.admins (username, password_hash)
values ('superadmin', '$2b$10$iEsJtnd0PuEGDl/lN.YJZu3xwReTA0Q6jh2k21.Wx8ge6v8V.P.PK')
on conflict (username) do nothing;

-- ---------------------------------------------------------------- security
alter table public.admins          enable row level security;
alter table public.members         enable row level security;
alter table public.mentors         enable row level security;
alter table public.slots           enable row level security;
alter table public.bookings        enable row level security;
alter table public.booking_history enable row level security;
alter table public.settings        enable row level security;
-- ปิดการเข้าถึงตารางจาก anon/authenticated (เว็บใช้ service role ฝั่ง Server เท่านั้น)
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on all tables in schema public from anon, authenticated;
    revoke all on all sequences in schema public from anon, authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------- helpers
create or replace function public.mm_err(msg text) returns void
language plpgsql as $$ begin raise exception using message = msg, errcode = 'P0001'; end $$;

-- ---------------------------------------------------------------- book_slot
-- จองช่วงเวลา: ตรวจทุกกติกาและบันทึกใน transaction เดียว
--  * ล็อกแถว slot และแถว member (FOR UPDATE) เพื่อให้คนที่กดพร้อมกันสำเร็จเพียงคนเดียว
--  * กดยืนยันซ้ำ (slot เดิม คนเดิม) จะคืนรายการเดิม ไม่สร้างใหม่
create or replace function public.book_slot(p_member_id uuid, p_slot_id uuid, p_actor text, p_note text default null)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot    public.slots;
  v_member  public.members;
  v_mentor  public.mentors;
  v_existing public.bookings;
  v_limit   int;
  v_count   int;
  v_month_start timestamptz;
  v_booking public.bookings;
begin
  select * into v_member from public.members where id = p_member_id for update;
  if not found then perform mm_err('ไม่พบผู้ใช้งาน'); end if;
  if v_member.status <> 'active' then perform mm_err('บัญชีนี้ยังไม่เปิดใช้งาน'); end if;

  select * into v_slot from public.slots where id = p_slot_id for update;
  if not found then perform mm_err('ไม่พบช่วงเวลานี้'); end if;

  -- กดยืนยันซ้ำ: คืนรายการเดิม
  select * into v_existing from public.bookings
   where slot_id = p_slot_id and status = 'confirmed';
  if found then
    if v_existing.member_id = p_member_id then return v_existing; end if;
    perform mm_err('ช่วงเวลานี้ถูกจองแล้ว');
  end if;

  select * into v_mentor from public.mentors where id = v_slot.mentor_id;
  if not v_mentor.is_active then perform mm_err('Mentor ท่านนี้ปิดใช้งานแล้ว'); end if;
  if not v_slot.is_open then perform mm_err('ช่วงเวลานี้ปิดการจอง'); end if;
  if v_slot.start_at <= now() then perform mm_err('ช่วงเวลานี้หมดเวลาแล้ว'); end if;

  -- ห้ามทับซ้อนกับนัดอื่นของตนเอง (แม้เป็นคนละ Mentor)
  if exists (
    select 1 from public.bookings b join public.slots s on s.id = b.slot_id
     where b.member_id = p_member_id and b.status = 'confirmed'
       and tstzrange(s.start_at, s.end_at) && tstzrange(v_slot.start_at, v_slot.end_at)
  ) then perform mm_err('ช่วงเวลานี้ทับซ้อนกับนัดหมายอื่นของคุณ'); end if;

  -- จำนวนครั้งสูงสุดต่อคนต่อเดือน (นับตามเดือนของวันนัด เวลาไทย)
  select nullif(value,'')::int into v_limit from public.settings where key = 'max_bookings_per_month';
  if v_limit is not null and v_limit > 0 then
    v_month_start := (date_trunc('month', v_slot.start_at at time zone 'Asia/Bangkok')) at time zone 'Asia/Bangkok';
    select count(*) into v_count from public.bookings b join public.slots s on s.id = b.slot_id
     where b.member_id = p_member_id and b.status = 'confirmed'
       and s.start_at >= v_month_start and s.start_at < v_month_start + interval '1 month';
    if v_count >= v_limit then
      perform mm_err(format('จองได้สูงสุด %s ครั้งต่อเดือน', v_limit));
    end if;
  end if;

  insert into public.bookings (member_id, slot_id, booked_by, note)
  values (p_member_id, p_slot_id, p_actor, p_note)
  returning * into v_booking;

  insert into public.booking_history (booking_id, action, new_slot_id, reason, actor)
  values (v_booking.id, 'create', p_slot_id, p_note, p_actor);

  return v_booking;
end $$;

-- ---------------------------------------------------------------- move_booking
-- ย้ายนัด (Admin): ตรวจช่วงใหม่ก่อน ถ้าไม่ผ่านจะ raise และนัดเดิมคงอยู่ (rollback ทั้งหมด)
create or replace function public.move_booking(p_booking_id uuid, p_new_slot_id uuid, p_actor text, p_reason text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_slot    public.slots;
  v_mentor  public.mentors;
  v_old     uuid;
begin
  if coalesce(trim(p_reason),'') = '' then perform mm_err('กรุณาระบุเหตุผล'); end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then perform mm_err('ไม่พบรายการจอง'); end if;
  if v_booking.status <> 'confirmed' then perform mm_err('รายการนี้ถูกยกเลิกแล้ว'); end if;
  if v_booking.slot_id = p_new_slot_id then perform mm_err('เป็นช่วงเวลาเดิม'); end if;

  perform 1 from public.members where id = v_booking.member_id for update;

  select * into v_slot from public.slots where id = p_new_slot_id for update;
  if not found then perform mm_err('ไม่พบช่วงเวลาใหม่'); end if;
  select * into v_mentor from public.mentors where id = v_slot.mentor_id;
  if not v_mentor.is_active then perform mm_err('Mentor ของช่วงใหม่ปิดใช้งานแล้ว'); end if;
  if not v_slot.is_open then perform mm_err('ช่วงเวลาใหม่ปิดการจอง'); end if;
  if v_slot.start_at <= now() then perform mm_err('ช่วงเวลาใหม่หมดเวลาแล้ว'); end if;
  if exists (select 1 from public.bookings where slot_id = p_new_slot_id and status = 'confirmed') then
    perform mm_err('ช่วงเวลาใหม่ถูกจองแล้ว');
  end if;
  if exists (
    select 1 from public.bookings b join public.slots s on s.id = b.slot_id
     where b.member_id = v_booking.member_id and b.status = 'confirmed' and b.id <> p_booking_id
       and tstzrange(s.start_at, s.end_at) && tstzrange(v_slot.start_at, v_slot.end_at)
  ) then perform mm_err('ช่วงเวลาใหม่ทับซ้อนกับนัดอื่นของผู้จอง'); end if;

  v_old := v_booking.slot_id;
  update public.bookings set slot_id = p_new_slot_id, updated_at = now()
   where id = p_booking_id returning * into v_booking;

  insert into public.booking_history (booking_id, action, old_slot_id, new_slot_id, reason, actor)
  values (p_booking_id, 'move', v_old, p_new_slot_id, p_reason, p_actor);
  return v_booking;
end $$;

-- ---------------------------------------------------------------- cancel_booking
-- ยกเลิก (Admin): ช่วงเวลาจะกลับเป็น "ว่าง" เองถ้ายังเปิดจองและยังไม่หมดเวลา
create or replace function public.cancel_booking(p_booking_id uuid, p_actor text, p_reason text)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare v_booking public.bookings;
begin
  if coalesce(trim(p_reason),'') = '' then perform mm_err('กรุณาระบุเหตุผล'); end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then perform mm_err('ไม่พบรายการจอง'); end if;
  if v_booking.status <> 'confirmed' then perform mm_err('รายการนี้ถูกยกเลิกแล้ว'); end if;

  update public.bookings
     set status = 'cancelled', cancelled_at = now(), cancel_reason = p_reason, updated_at = now()
   where id = p_booking_id returning * into v_booking;

  insert into public.booking_history (booking_id, action, old_slot_id, reason, actor)
  values (p_booking_id, 'cancel', v_booking.slot_id, p_reason, p_actor);
  return v_booking;
end $$;

-- ---------------------------------------------------------------- slot_view
-- สถานะช่วงเวลา: ถูกจองแล้ว > หมดเวลา > ปิดการจอง > ว่าง
create or replace view public.slot_view with (security_invoker = true) as
select s.id, s.mentor_id, m.name as mentor_name, m.is_active as mentor_active,
       s.start_at, s.end_at, coalesce(nullif(s.location,''), m.default_location) as location, s.is_open,
       b.id as booking_id, b.booking_no, b.member_id,
       mem.name as member_name, mem.employee_code,
       case when b.id is not null then 'booked'
            when s.start_at <= now() then 'expired'
            when not s.is_open or not m.is_active then 'closed'
            else 'available' end as status
  from public.slots s
  join public.mentors m on m.id = s.mentor_id
  left join public.bookings b on b.slot_id = s.id and b.status = 'confirmed'
  left join public.members mem on mem.id = b.member_id;

-- ไม่ให้ anon / authenticated เรียกฟังก์ชันหรือ view ผ่าน API สาธารณะ
revoke all on function public.book_slot(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.move_booking(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.cancel_booking(uuid, text, text) from public, anon, authenticated;
revoke all on function public.mm_err(text) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.book_slot(uuid, uuid, text, text) to service_role;
    grant execute on function public.move_booking(uuid, uuid, text, text) to service_role;
    grant execute on function public.cancel_booking(uuid, text, text) to service_role;
    grant execute on function public.mm_err(text) to service_role;
  end if;
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.slot_view from anon, authenticated;
  end if;
end $$;

-- ---------------------------------------------------------------- storage (รูป Mentor)
do $$ begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('mentor-photos', 'mentor-photos', true)
    on conflict (id) do nothing;
  end if;
end $$;
