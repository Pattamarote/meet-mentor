import Link from 'next/link';
import { requireAdmin } from '@/lib/session';
import { AdminNav } from '@/components/AdminNav';
import { Flash } from '@/components/ui';
import { MemberImportForm } from './MemberImportForm';

export const dynamic = 'force-dynamic';

export default async function MemberImport({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  return (
    <>
      <AdminNav active="members" username={me.username} />
      <main className="container">
        <p className="small"><Link href="/admin/members">← ผู้ใช้งาน</Link></p>
        <h1>อัปโหลดรายชื่อสมาชิก</h1>
        <Flash sp={sp} />
        <div className="card">
          <p className="small">คอลัมน์: <b>ชื่อ-นามสกุล</b> | <b>รหัสพนักงาน</b> (5-6 หลัก) | <b>รหัสผ่าน</b> (4 หลัก) — บัญชีที่นำเข้าจะมีสถานะ “เปิดใช้งาน”</p>
          <a className="btn secondary" href="/api/admin/members-template">ดาวน์โหลดไฟล์ Template</a>
        </div>
        <MemberImportForm />
      </main>
    </>
  );
}
