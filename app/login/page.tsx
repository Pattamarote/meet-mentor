import { BrandHero } from '@/components/ui';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/db';
import { readSession } from '@/lib/session';
import { memberLogin } from './actions';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const s = await readSession();
  if (s?.role === 'member' && !sp.e) redirect('/mentors');
  const settings = await getSettings();
  return (
    <main className="narrow">
      <BrandHero />
      <p className="muted" style={{ textAlign: 'center' }}>ระบบนัดหมาย Mentor</p>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>เข้าสู่ระบบ</h2>
        {sp.e === 'inactive' && <div className="alert err">บัญชีของคุณไม่ได้อยู่ในสถานะเปิดใช้งาน กรุณาติดต่อ Admin</div>}
        <LoginForm
          action={memberLogin}
          submit="เข้าสู่ระบบ"
          fields={[
            { name: 'code', label: 'รหัสพนักงาน (5-6 หลัก)', inputMode: 'numeric', pattern: '[0-9]{5,6}', maxLength: 6, autoComplete: 'username' },
            { name: 'pin', label: 'รหัสผ่าน (4 หลัก)', type: 'password', inputMode: 'numeric', pattern: '[0-9]{4}', maxLength: 4, autoComplete: 'current-password' },
          ]}
        />
        <details className="mt">
          <summary>ลืมรหัสผ่าน?</summary>
          <p className="small">เพื่อความปลอดภัย กรุณาติดต่อ Admin เพื่อยืนยันตัวตนและตั้งรหัสผ่านใหม่<br />{settings.admin_contact}</p>
        </details>
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}><Link href="/admin/login">สำหรับผู้ดูแลระบบ</Link></p>
    </main>
  );
}
