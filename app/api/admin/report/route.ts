import { NextRequest } from 'next/server';
import { adminFromRequest } from '@/lib/adminApi';
import { findBookings, historyNotes } from '@/lib/bookings';
import { ExcelJS, sendWorkbook, styleHeader } from '@/lib/excel';
import { validMonth, isoDate, fmtTime } from '@/lib/time';
import { BOOKING_STATUS } from '@/lib/status';
import { isUuid } from '@/lib/redirect';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!(await adminFromRequest())) return new Response('ไม่มีสิทธิ์', { status: 401 });
  const p = req.nextUrl.searchParams;
  const month = validMonth(p.get('month'));
  const mentor = p.get('mentor') ?? '';
  const rows = await findBookings({ month, mentor: isUuid(mentor) ? mentor : undefined, status: p.get('status') ?? undefined, q: p.get('q') ?? undefined });
  const notes = await historyNotes(rows.map((r) => r.id));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(`รายงาน ${month}`);
  ws.columns = [
    { header: 'เลขที่การจอง', width: 14 }, { header: 'รหัสพนักงาน', width: 12 }, { header: 'ชื่อ-นามสกุล', width: 26 },
    { header: 'ชื่อ Mentor', width: 22 }, { header: 'วันที่นัด', width: 12 }, { header: 'เวลาเริ่ม', width: 10 },
    { header: 'เวลาสิ้นสุด', width: 10 }, { header: 'วันเวลาที่จอง', width: 20 }, { header: 'สถานะ', width: 16 }, { header: 'หมายเหตุ', width: 50 },
  ];
  styleHeader(ws);
  for (const r of rows) {
    const note = [r.note ? `ผู้จอง: ${r.note}` : '', r.booked_by.startsWith('admin:') ? `จองแทนโดย ${r.booked_by.slice(6)}` : '', ...(notes[r.id] ?? [])].filter(Boolean).join(' | ');
    ws.addRow([r.booking_no, r.members.employee_code, r.members.name, r.slots.mentors.name, isoDate(r.slots.start_at),
      fmtTime(r.slots.start_at), fmtTime(r.slots.end_at), `${isoDate(r.created_at)} ${fmtTime(r.created_at)}`, BOOKING_STATUS[r.status] ?? r.status, note]);
  }
  return sendWorkbook(wb, `meet-mentor-report-${month}.xlsx`);
}
