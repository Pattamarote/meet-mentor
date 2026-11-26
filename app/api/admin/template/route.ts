import { adminFromRequest } from '@/lib/adminApi';
import { db } from '@/lib/db';
import { ExcelJS, sendWorkbook, styleHeader } from '@/lib/excel';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await adminFromRequest())) return new Response('ไม่มีสิทธิ์', { status: 401 });
  const { data: mentors } = await db().from('mentors').select('name').eq('is_active', true).order('name');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('ตารางเวลา');
  ws.columns = [
    { header: 'ชื่อ Mentor', key: 'mentor', width: 24 },
    { header: 'วันที่', key: 'date', width: 14, style: { numFmt: '@' } },
    { header: 'เวลาเริ่ม', key: 'start', width: 11, style: { numFmt: '@' } },
    { header: 'เวลาสิ้นสุด', key: 'end', width: 11, style: { numFmt: '@' } },
    { header: 'สถานที่หรือลิงก์ (ไม่บังคับ)', key: 'loc', width: 36 },
  ];
  styleHeader(ws);
  const first = mentors?.[0]?.name ?? 'Mentor A';
  ws.addRow({ mentor: first, date: '2026-12-08', start: '09:00', end: '10:00', loc: 'ห้องประชุม 3A' });
  ws.addRow({ mentor: first, date: '2026-12-08', start: '10:00', end: '11:00', loc: 'https://meet.example.com/abc' });

  const help = wb.addWorksheet('คำอธิบาย');
  help.columns = [{ width: 90 }];
  [
    'วิธีกรอก',
    '• ชื่อ Mentor ต้องตรงกับชื่อในระบบ (ดูรายชื่อด้านล่าง)',
    '• วันที่ รูปแบบ YYYY-MM-DD เช่น 2026-12-08 (หรือ 8/12/2026)',
    '• เวลาเริ่ม / เวลาสิ้นสุด รูปแบบ HH:MM แบบ 24 ชม. เวลาไทย เช่น 09:00 / 10:00',
    '• ช่วงเวลาของ Mentor คนเดียวกันต้องไม่ซ้ำหรือทับซ้อนกัน และต้องไม่ทับช่วงที่มีอยู่ในระบบแล้ว',
    '• ระบบจะไม่เขียนทับช่วงเวลาที่มีอยู่/มีคนจองแล้ว',
    '',
    'รายชื่อ Mentor ที่เปิดใช้งานอยู่:',
    ...(mentors ?? []).map((m) => `   ${m.name}`),
  ].forEach((t) => help.addRow([t]));
  return sendWorkbook(wb, 'meet-mentor-template.xlsx');
}
