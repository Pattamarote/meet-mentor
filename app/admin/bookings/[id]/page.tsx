import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { AdminNav } from '@/components/AdminNav';
import { Flash, BookingBadge, LocationText } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { SlotPicker } from '@/components/SlotPicker';
import { fmtDateLong, fmtTime, fmtDateTime, fmtDate } from '@/lib/time';
import { HISTORY_ACTION } from '@/lib/status';
import { isUuid } from '@/lib/redirect';
import { cancelBookingAction, moveBookingAction } from '../actions';

export const dynamic = 'force-dynamic';

export default async function BookingDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const { data } = isUuid(id)
    ? await db().from('bookings').select('*,members(name,employee_code,status),slots(start_at,end_at,location,mentors(name,default_location))').eq('id', id).maybeSingle()
    : { data: null };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b = data as any;
  const { data: hist } = b ? await db().from('booking_history').select('*,old:slots!booking_history_old_slot_id_fkey(start_at,end_at,mentors(name)),new:slots!booking_history_new_slot_id_fkey(start_at,end_at,mentors(name))').eq('booking_id', id).order('id') : { data: [] };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const slotText = (s: any) => s ? `${s.mentors.name} ${fmtDate(s.start_at)} ${fmtTime(s.start_at)}-${fmtTime(s.end_at)}` : '';

  return (
    <>
      <AdminNav active="bookings" username={me.username} />
      <main className="container" style={{ maxWidth: 800 }}>
        <p className="small"><Link href="/admin/bookings">← รายการจอง</Link></p>
        <Flash sp={sp} />
        {!b ? <div className="card">ไม่พบรายการ</div> : (
          <>
            <div className="card">
              <h1>การจอง {b.booking_no} <BookingBadge s={b.status} /></h1>
              <dl className="dl">
                <dt>ผู้จอง</dt><dd>{b.members.name} ({b.members.employee_code})</dd>
                <dt>Mentor</dt><dd>{b.slots.mentors.name}</dd>
                <dt>วันที่</dt><dd>{fmtDateLong(b.slots.start_at)}</dd>
                <dt>เวลา</dt><dd>{fmtTime(b.slots.start_at)} - {fmtTime(b.slots.end_at)} น.</dd>
                <dt>สถานที่/ลิงก์</dt><dd><LocationText loc={b.slots.location || b.slots.mentors.default_location} /></dd>
                <dt>หมายเหตุผู้จอง</dt><dd>{b.note || '-'}</dd>
                <dt>จองเมื่อ</dt><dd>{fmtDateTime(b.created_at)} โดย {b.booked_by}</dd>
                {b.cancel_reason && <><dt>เหตุผลยกเลิก</dt><dd>{b.cancel_reason}</dd></>}
              </dl>
            </div>
            {b.status === 'confirmed' && (
              <div className="grid g2">
                <form action={moveBookingAction} className="card">
                  <h2 style={{ marginTop: 0 }}>ย้ายไปช่วงที่ว่าง</h2>
                  <input type="hidden" name="id" value={b.id} />
                  <label>ช่วงเวลาใหม่</label><SlotPicker />
                  <label>เหตุผล *</label><input name="reason" required />
                  <p className="small muted">ระบบตรวจช่วงใหม่ก่อน หากย้ายไม่สำเร็จ นัดเดิมจะยังคงอยู่</p>
                  <SubmitButton>ย้ายนัด</SubmitButton>
                </form>
                <form action={cancelBookingAction} className="card">
                  <h2 style={{ marginTop: 0 }}>ยกเลิกการจอง</h2>
                  <input type="hidden" name="id" value={b.id} />
                  <label>เหตุผล *</label><input name="reason" required />
                  <p className="small muted">ช่วงเวลาจะกลับเป็น “ว่าง” หากยังเปิดจองและยังไม่หมดเวลา</p>
                  <SubmitButton className="btn danger" confirm="ยืนยันยกเลิกการจองนี้?">ยกเลิกการจอง</SubmitButton>
                </form>
              </div>
            )}
            <h2>ประวัติการแก้ไข</h2>
            <div className="table-wrap">
              <table>
                <thead><tr><th>เวลา</th><th>การดำเนินการ</th><th>รายละเอียด</th><th>เหตุผล</th><th>ผู้แก้ไข</th></tr></thead>
                <tbody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(hist ?? []).map((h: any) => (
                    <tr key={h.id}>
                      <td className="small">{fmtDateTime(h.created_at)}</td>
                      <td>{HISTORY_ACTION[h.action] ?? h.action}</td>
                      <td className="small">{h.action === 'move' ? <>จาก {slotText(h.old)}<br />เป็น {slotText(h.new)}</> : slotText(h.new ?? h.old)}</td>
                      <td>{h.reason || '-'}</td>
                      <td>{h.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </>
  );
}
