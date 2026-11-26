import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { AdminNav } from '@/components/AdminNav';
import { Flash, BookingBadge } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { SlotPicker } from '@/components/SlotPicker';
import { findBookings } from '@/lib/bookings';
import { validMonth, monthRange, monthLabel, fmtDate, fmtTime, fmtDateTime } from '@/lib/time';
import { isUuid } from '@/lib/redirect';
import { bookOnBehalf } from './actions';

export const dynamic = 'force-dynamic';

export default async function BookingsAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const month = validMonth(sp.month);
  const mentorId = isUuid(sp.mentor ?? '') ? sp.mentor : '';
  const status = sp.status ?? '';
  const q = sp.q ?? '';
  const { from, to } = monthRange(month);
  let sq = db().from('slot_view').select('status,is_open').gte('start_at', from).lt('start_at', to);
  if (mentorId) sq = sq.eq('mentor_id', mentorId);
  const [{ data: mentors }, rows, { data: slots }] = await Promise.all([
    db().from('mentors').select('id,name,is_active').order('name'),
    findBookings({ month, mentor: mentorId || undefined, status, q }),
    sq,
  ]);
  const cnt = (s: string) => (slots ?? []).filter((x) => x.status === s).length;
  const openCount = (slots ?? []).filter((x) => x.is_open).length;

  const filterQs = new URLSearchParams({ month, ...(mentorId ? { mentor: mentorId } : {}), ...(status ? { status } : {}), ...(q ? { q } : {}) });
  const ret = `/admin/bookings?${filterQs}`;

  return (
    <>
      <AdminNav active="bookings" username={me.username} />
      <main className="container">
        <h1>รายการจองและรายงาน</h1>
        <Flash sp={sp} />
        <form className="card row" method="get">
          <div><label>เดือน</label><input type="month" name="month" defaultValue={month} /></div>
          <div>
            <label>Mentor</label>
            <select name="mentor" defaultValue={mentorId}>
              <option value="">ทุก Mentor</option>
              {(mentors ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label>สถานะ</label>
            <select name="status" defaultValue={status}>
              <option value="">ทั้งหมด</option><option value="confirmed">ยืนยันการจองแล้ว</option><option value="cancelled">ยกเลิกแล้ว</option>
            </select>
          </div>
          <div><label>ค้นหาชื่อ / รหัสพนักงาน / เลขที่การจอง</label><input name="q" defaultValue={q} /></div>
          <div className="shrink"><button className="btn">ค้นหา</button></div>
          <div className="shrink"><a className="btn secondary" href={`/api/admin/report?${filterQs}`}>ดาวน์โหลด Excel</a></div>
        </form>

        <h2>สรุป {monthLabel(month)}{mentorId && ` · ${(mentors ?? []).find((m) => m.id === mentorId)?.name}`}</h2>
        <div className="grid g4">
          <div className="card stat"><div className="n">{openCount}</div><div className="muted">ช่วงที่เปิดจอง</div></div>
          <div className="card stat"><div className="n" style={{ color: 'var(--ok)' }}>{cnt('available')}</div><div className="muted">ว่าง</div></div>
          <div className="card stat"><div className="n" style={{ color: 'var(--brand)' }}>{cnt('booked')}</div><div className="muted">ถูกจองแล้ว</div></div>
          <div className="card stat"><div className="n" style={{ color: 'var(--muted)' }}>{cnt('closed')}</div><div className="muted">ปิดการจอง</div></div>
          <div className="card stat"><div className="n" style={{ color: 'var(--warn)' }}>{cnt('expired')}</div><div className="muted">หมดเวลา (ไม่มีผู้จอง)</div></div>
        </div>

        <details className="card">
          <summary><strong>+ จองแทนผู้ใช้งาน</strong></summary>
          <form action={bookOnBehalf} className="row mt">
            <input type="hidden" name="ret" value={ret} />
            <div><label>รหัสพนักงาน</label><input name="code" inputMode="numeric" pattern="[0-9]{5,6}" required /></div>
            <div><label>ช่วงเวลา</label><SlotPicker /></div>
            <div><label>หมายเหตุ</label><input name="note" /></div>
            <div className="shrink"><SubmitButton>จองแทน</SubmitButton></div>
          </form>
        </details>

        <h2>รายการจอง ({rows.length})</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>เลขที่</th><th>รหัสพนักงาน</th><th>ชื่อ-นามสกุล</th><th>Mentor</th><th>วันที่นัด</th><th>เวลา</th><th>จองเมื่อ</th><th>สถานะ</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={9} className="muted">ไม่พบรายการ</td></tr>}
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{r.booking_no}</td>
                  <td>{r.members.employee_code}</td>
                  <td>{r.members.name}</td>
                  <td>{r.slots.mentors.name}</td>
                  <td>{fmtDate(r.slots.start_at)}</td>
                  <td>{fmtTime(r.slots.start_at)}-{fmtTime(r.slots.end_at)}</td>
                  <td className="small">{fmtDateTime(r.created_at)}</td>
                  <td><BookingBadge s={r.status} /></td>
                  <td><Link className="btn ghost sm" href={`/admin/bookings/${r.id}`}>จัดการ</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
