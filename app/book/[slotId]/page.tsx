import Link from 'next/link';
import { db } from '@/lib/db';
import { requireMember } from '@/lib/session';
import { UserNav } from '@/components/UserNav';
import { Flash, LocationText, SlotBadge, Avatar } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { fmtDateLong, fmtTime, isoDate } from '@/lib/time';
import { confirmBooking } from './actions';
import type { SlotRow } from '@/lib/status';

export const dynamic = 'force-dynamic';

export default async function BookPage({ params, searchParams }: { params: Promise<{ slotId: string }>; searchParams: Promise<Record<string, string>> }) {
  const me = await requireMember();
  const { slotId } = await params;
  const sp = await searchParams;
  const valid = /^[0-9a-f-]{36}$/i.test(slotId);
  const { data } = valid ? await db().from('slot_view').select('*').eq('id', slotId).maybeSingle() : { data: null };
  const s = data as SlotRow | null;
  const { data: mentor } = s ? await db().from('mentors').select('photo_url').eq('id', s.mentor_id).maybeSingle() : { data: null };
  const mine = s?.member_id === me.id;

  return (
    <>
      <UserNav active="book" name={me.name} />
      <main className="container" style={{ maxWidth: 640 }}>
        {s && <p className="small"><Link href={`/calendar?mentor=${s.mentor_id}&month=${isoDate(s.start_at).slice(0, 7)}`}>← กลับไปที่ตาราง</Link></p>}
        <h1>ตรวจสอบรายละเอียดก่อนยืนยัน</h1>
        <Flash sp={sp} />
        {!s || !s.mentor_active ? (
          <div className="card">ไม่พบช่วงเวลานี้ <Link href="/mentors">เลือก Mentor ใหม่</Link></div>
        ) : (
          <div className="card">
            <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
              <div className="shrink"><Avatar name={s.mentor_name} url={mentor?.photo_url} size="sm" /></div>
              <div><strong>{s.mentor_name}</strong><br /><SlotBadge s={mine ? 'booked' : s.status} /></div>
            </div>
            <dl className="dl">
              <dt>Mentor</dt><dd>{s.mentor_name}</dd>
              <dt>วันที่</dt><dd>{fmtDateLong(s.start_at)}</dd>
              <dt>เวลา</dt><dd>{fmtTime(s.start_at)} - {fmtTime(s.end_at)} น. (เวลาไทย)</dd>
              <dt>สถานที่/ลิงก์</dt><dd><LocationText loc={s.location} /></dd>
              <dt>ผู้จอง</dt><dd>{me.name} ({me.code})</dd>
            </dl>
            {mine ? (
              <div className="alert ok mt">คุณจองช่วงเวลานี้แล้ว <Link href="/my-bookings">ดูรายการจองของฉัน</Link></div>
            ) : s.status !== 'available' ? (
              <div className="alert err mt">ช่วงเวลานี้ไม่สามารถจองได้ ({s.status === 'booked' ? 'ถูกจองแล้ว' : s.status === 'closed' ? 'ปิดการจอง' : 'หมดเวลา'})</div>
            ) : (
              <form action={confirmBooking} className="mt">
                <input type="hidden" name="slot_id" value={s.id} />
                <label htmlFor="note">หัวข้อที่อยากปรึกษา (ไม่บังคับ)</label>
                <textarea id="note" name="note" rows={3} maxLength={500} />
                <p className="small muted">หลังยืนยันแล้ว หากต้องการเปลี่ยนแปลงหรือยกเลิก กรุณาติดต่อ Admin</p>
                <div className="row">
                  <Link className="btn ghost" href={`/calendar?mentor=${s.mentor_id}&month=${isoDate(s.start_at).slice(0, 7)}`}>ย้อนกลับ</Link>
                  <SubmitButton pendingText="กำลังจอง...">ยืนยันการจอง</SubmitButton>
                </div>
              </form>
            )}
          </div>
        )}
      </main>
    </>
  );
}
