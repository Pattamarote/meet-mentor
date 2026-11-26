import Link from 'next/link';
import { db, getSettings } from '@/lib/db';
import { requireMember } from '@/lib/session';
import { UserNav } from '@/components/UserNav';
import { Avatar } from '@/components/ui';
import { MonthCalendar, CalSlot } from '@/components/MonthCalendar';
import { validMonth, monthRange, shiftMonth, monthLabel } from '@/lib/time';
import type { SlotRow } from '@/lib/status';
import { isUuid } from '@/lib/redirect';
import { AutoSubmitSelect } from '@/components/AutoSubmitSelect';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireMember();
  const sp = await searchParams;
  const month = validMonth(sp.month);
  const mentorParam = isUuid(sp.mentor ?? '') ? sp.mentor : '';
  const range = monthRange(month);
  let q = db().from('slot_view').select('*').eq('mentor_active', true).gte('start_at', range.from).lt('start_at', range.to).order('start_at');
  if (mentorParam) q = q.eq('mentor_id', mentorParam);
  // ดึงข้อมูลพร้อมกันเพื่อให้หน้าโหลดเร็วขึ้น
  const [settings, { data: mentors }, { data }] = await Promise.all([
    getSettings(),
    db().from('mentors').select('id,name,photo_url,bio').eq('is_active', true).order('name'),
    q,
  ]);
  const showName = settings.show_booker_name === 'true';
  const mentor = (mentors ?? []).find((m) => m.id === mentorParam) ?? null;
  const rows = (data ?? []) as SlotRow[];

  // ไม่ส่งข้อมูลผู้จองคนอื่นออกไปที่หน้าเว็บ เว้นแต่องค์กรอนุญาต
  const slots: CalSlot[] = rows.map((r) => {
    const mine = r.member_id === me.id;
    return {
      id: r.id, start_at: r.start_at, end_at: r.end_at, status: r.status, mentor_name: r.mentor_name, mine,
      label: r.status === 'booked' && !mine && showName && r.member_name ? `จองโดย ${r.member_name}` : null,
      href: r.status === 'available' ? `/book/${r.id}` : null,
    };
  });
  const available = rows.filter((r) => r.status === 'available').length;

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...(mentor ? { mentor: mentor.id } : {}), month, ...over });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/calendar?${p}`;
  };

  return (
    <>
      <UserNav active="book" name={me.name} />
      <main className="container">
        <p className="small"><Link href="/mentors">← เลือก Mentor</Link></p>
        <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
          {mentor ? (
            <div className="row" style={{ alignItems: 'center', flex: '1 1 auto' }}>
              <div className="shrink"><Avatar name={mentor.name} url={mentor.photo_url} size="sm" /></div>
              <div><h1 style={{ margin: 0 }}>{mentor.name}</h1>{mentor.bio && <span className="small muted">{mentor.bio}</span>}</div>
            </div>
          ) : <h1 style={{ margin: 0 }}>ตารางทุก Mentor</h1>}
        </div>

        <form className="card" method="get" action="/calendar" style={{ padding: 12 }}>
          <input type="hidden" name="month" value={month} />
          <label htmlFor="mentor" style={{ marginTop: 0 }}>เลือก Mentor</label>
          <AutoSubmitSelect id="mentor" name="mentor" defaultValue={mentor?.id ?? ''}>
            <option value="">ทุก Mentor</option>
            {(mentors ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </AutoSubmitSelect>
        </form>

        <div className="row" style={{ alignItems: 'center' }}>
          <div className="shrink"><Link className="btn ghost sm" href={qs({ month: shiftMonth(month, -1) })}>‹ เดือนก่อน</Link></div>
          <h2 style={{ margin: 0, textAlign: 'center' }}>{monthLabel(month)}</h2>
          <div className="shrink"><Link className="btn ghost sm" href={qs({ month: shiftMonth(month, 1) })}>เดือนถัดไป ›</Link></div>
        </div>
        <div className="legend">
          <span className="slot available">ว่าง (คลิกเพื่อจอง)</span>
          <span className="slot booked">ถูกจองแล้ว</span>
          <span className="slot closed">ปิดการจอง</span>
          <span className="slot expired">หมดเวลา</span>
          <span className="slot booked mine">นัดของฉัน</span>
          <span className="muted">· ว่าง {available} ช่วง (เวลาไทย)</span>
        </div>
        <MonthCalendar month={month} slots={slots} showMentor={!mentor} />
      </main>
    </>
  );
}
