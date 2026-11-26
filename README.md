# meet-mentor — ระบบนัดหมาย Mentor

Next.js 15 (App Router) + Supabase (PostgreSQL) · Deploy บน Vercel · UI ภาษาไทย · เวลาไทย (UTC+7)

## โครงสร้าง
- `supabase/migrations/0001_init.sql` — ตาราง, กติกาการจอง (ฟังก์ชัน `book_slot`, `move_booking`, `cancel_booking`), สิทธิ์, bucket รูป Mentor, Admin เริ่มต้น
- `app/` — หน้าเว็บ: User (`/login`, `/register`, `/mentors`, `/calendar`, `/book/[id]`, `/my-bookings`) และ Admin (`/admin/...`)
- `lib/` — เชื่อมฐานข้อมูล (service role ฝั่ง Server เท่านั้น), session, เวลาไทย, Excel

## ความปลอดภัย
- รหัสผ่านเก็บแบบ bcrypt · กรอกผิด 5 ครั้งล็อก 15 นาที
- Session เป็น JWT ใน cookie httpOnly/secure · ตรวจสิทธิ์ User/Admin ที่ Server ทุกหน้า/ทุก action
- ทุกตารางเปิด RLS และไม่ให้ anon/authenticated เข้าถึง — เว็บใช้ service role จากฝั่ง Server เท่านั้น
- การจองพร้อมกัน: ล็อกแถวในฐานข้อมูล + unique index ⇒ สำเร็จเพียงคนเดียว, กดซ้ำไม่สร้างรายการเพิ่ม
- **Admin เริ่มต้น `superadmin` / `1234` — เปลี่ยนรหัสที่เมนู “ตั้งค่า” ทันทีหลังเข้าใช้ครั้งแรก**

## วิธี Deploy
1. **Supabase**: สร้างโปรเจกต์ (Region: Singapore) → SQL Editor → วางเนื้อหา `supabase/migrations/0001_init.sql` แล้ว Run
   (หรือ `supabase link --project-ref <ref>` แล้ว `supabase db push`)
2. คัดลอกค่า **Project URL** และ **service_role key** จาก Project Settings → API
3. **Vercel**: Import โปรเจกต์นี้ (Framework: Next.js) แล้วตั้ง Environment Variables
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SESSION_SECRET` (สุ่มยาว ≥ 32 ตัวอักษร เช่น `openssl rand -base64 48`)
4. Deploy แล้วเข้า `/admin/login`

## สำรองข้อมูล
Supabase มี Daily backup ในแพ็กเกจ Pro ขึ้นไป · แพ็กเกจ Free ให้ใช้ `supabase db dump -f backup.sql` เป็นระยะ

## พัฒนาบนเครื่อง
```
cp .env.example .env.local   # ใส่ค่าให้ครบ
npm install
npm run dev
```
