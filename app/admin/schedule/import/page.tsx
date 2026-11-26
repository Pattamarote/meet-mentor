import { requireAdmin } from '@/lib/session';
import { AdminNav, ScheduleTabs } from '@/components/AdminNav';
import { Flash } from '@/components/ui';
import { ImportForm } from './ImportForm';

export const dynamic = 'force-dynamic';

export default async function ImportPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  return (
    <>
      <AdminNav active="schedule" username={me.username} />
      <main className="container">
        <h1>จัดการตาราง Mentor</h1>
        <ScheduleTabs active="import" />
        <Flash sp={sp} />
        <div className="card">
          <h2 style={{ marginTop: 0 }}>นำเข้าตารางเวลาจาก Excel</h2>
          <p className="small">คอลัมน์: <b>ชื่อ Mentor</b> | <b>วันที่</b> (2026-12-08) | <b>เวลาเริ่ม</b> (09:00) | <b>เวลาสิ้นสุด</b> (10:00) | สถานที่หรือลิงก์ (ไม่บังคับ)</p>
          <p className="small muted">ระบบจะตรวจสอบทุกแถวก่อน หากมีแถวผิดพลาดจะไม่บันทึกเลยจนกว่าจะแก้ไข และจะไม่เขียนทับช่วงที่มีอยู่หรือมีคนจองแล้ว</p>
          <a className="btn secondary" href="/api/admin/template">ดาวน์โหลดไฟล์ Template</a>
        </div>
        <ImportForm />
      </main>
    </>
  );
}
