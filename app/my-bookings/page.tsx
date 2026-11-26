import Link from 'next/link';
import { db, getSettings } from '@/lib/db';
import { requireMember } from '@/lib/session';
import { UserNav } from '@/components/UserNav';
import { Flash, BookingBadge, LocationText } from '@/components/ui';
import { fmtDate, fmtTime, fmtDateTime } from '@/lib/time';

export const dynamic = 'force-dynamic';

type Row = {
  id: string; booking_no: string; status: string; created_at: string; cancel_reason: string | null; note: string | null;
  slot: { start_at: string; end_at: string; location: string | null; mentor: { name: string; default_location: string | null } };
  history: { action: string }[];
};

export default async function MyBookings({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireMember();
  const sp = await searchParams;
  const settings = await getSettings();
  // ดึงเฉพาะรายการของผู้ใช้คนนี้ (ตรวจจาก session ฝั่ง Server)
  const { data } = await db()
    .from('bookings')
    .select('id,booking_no,status,created_at,cancel_reason,note,slot:slots(start_at,end_at,location,mentor:mentors(name,default_location)),history:booking_history(action)')
    .eq('member_id', me.id);
  const rows = ((data ?? []) as unknown as Row[]).sort((a, b) => a.slot.start_at.localeCompare(b.slot.start_at));
  const now = new Date().toISOString();
  const upcoming = rows.filter((r) => r.status === 'confirmed' && r.slot.end_at > now);
  const past = rows.filter((r) => !(r.status === 'confirmed' && r.slot.end_at > now)).reverse();

  const table = (list: Row[], isPast: boolean) => (
    <div className="table-wrap">
      <table>
        <thead><tr><th>เลขที่</th><th>Mentor</th><th>วันที่</th><th>เวลา</th><th>สถานที่/ลิงก์</th><th>สถานะ</th><th>จองเมื่อ</th></tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={7} className="muted">ไม่มีรายการ</td></tr>}
          {list.map((r) => (
            <tr key={r.id}>
              <td>{r.booking_no}</td>
              <td>{r.slot.mentor.name}</td>
              <td>{fmtDate(r.slot.start_at)}</td>
              <td>{fmtTime(r.slot.start_at)}-{fmtTime(r.slot.end_at)}</td>
              <td><LocationText loc={r.slot.location || r.slot.mentor.default_location} /></td>
              <td>
                <BookingBadge s={r.status} />
                {isPast && r.status === 'confirmed' && <div className="small muted">หมดเวลา</div>}
                {r.history.some((h) => h.action === 'move') && <div className="small muted">มีการเปลี่ยนนัดโดย Admin</div>}
                {r.cancel_reason && <div className="small muted">เหตุผล: {r.cancel_reason}</div>}
              </td>
              <td className="small">{fmtDateTime(r.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <UserNav active="mine" name={me.name} />
      <main className="container">
        <h1>รายการจองของฉัน</h1>
        <Flash sp={sp} />
        <div className="alert info">
          ต้องการแก้ไข ย้าย หรือยกเลิกนัดหมาย กรุณาติดต่อ Admin — {settings.admin_contact}
        </div>
        <h2>นัดหมายที่กำลังจะมาถึง ({upcoming.length})</h2>
        {table(upcoming, false)}
        <h2>รายการย้อนหลัง ({past.length})</h2>
        {table(past, true)}
        <p className="mt"><Link className="btn" href="/mentors">จอง Session เพิ่ม</Link></p>
      </main>
    </>
  );
}
