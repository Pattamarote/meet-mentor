import { BrandHero } from '@/components/ui';
import Link from 'next/link';
import { LoginForm } from '@/app/login/LoginForm';
import { adminLogin } from './actions';

export default function AdminLogin() {
  return (
    <main className="narrow">
      <BrandHero />
      <p className="muted" style={{ textAlign: 'center' }}>สำหรับผู้ดูแลระบบ (Admin)</p>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>เข้าสู่ระบบ Admin</h2>
        <LoginForm
          action={adminLogin}
          submit="เข้าสู่ระบบ"
          fields={[
            { name: 'username', label: 'ชื่อผู้ใช้', autoComplete: 'username' },
            { name: 'password', label: 'รหัสผ่าน', type: 'password', autoComplete: 'current-password' },
          ]}
        />
      </div>
      <p className="small muted" style={{ textAlign: 'center' }}><Link href="/login">ไปหน้าผู้ใช้งาน</Link></p>
    </main>
  );
}
