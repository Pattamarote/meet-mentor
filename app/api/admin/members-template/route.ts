import { adminFromRequest } from '@/lib/adminApi';
import { ExcelJS, sendWorkbook, styleHeader } from '@/lib/excel';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await adminFromRequest())) return new Response('ไม่มีสิทธิ์', { status: 401 });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('สมาชิก');
  ws.columns = [
    { header: 'ชื่อ-นามสกุล', width: 30 },
    { header: 'รหัสพนักงาน (5-6 หลัก)', width: 22, style: { numFmt: '@' } },
    { header: 'รหัสผ่าน (4 หลัก)', width: 18, style: { numFmt: '@' } },
  ];
  styleHeader(ws);
  ws.addRow(['สมชาย ใจดี', '12345', '0123']);
  ws.addRow(['สมหญิง รักเรียน', '123456', '4567']);
  return sendWorkbook(wb, 'meet-mentor-members-template.xlsx');
}
