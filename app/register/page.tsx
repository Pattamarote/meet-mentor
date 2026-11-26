import Link from 'next/link';
import { getSettings } from '@/lib/db';
import { register } from '../login/actions';
import { LoginForm } from '../login/LoginForm';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const settings = await getSettings();
  return (
    <main className="narrow">
      <h1 style={{ textAlign: 'center', color: 'var(--brand)' }}>meet-mentor</h1>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>สมัครใช้งาน</h2>
        {settings.allow_self_register !== 'true' ? (
          <div className="alert info">ปิดการสมัครด้วยตนเอง กรุณาติดต่อ Admin<br />{settings.admin_contact}</div>
        ) : (
          <>
            <p className="small muted">หลังสมัคร บัญชีจะอยู่ในสถานะ “รออนุมัติ” จนกว่า Admin จะอนุมัติ</p>
            <LoginForm
              action={register}
              submit="สมัครใช้งาน"
              fields={[
                { name: 'name', label: 'ชื่อ-นามสกุล', autoComplete: 'name' },
                { name: 'code', label: 'รหัสพนักงาน (5-6 หลัก)', inputMode: 'numeric', pattern: '[0-9]{5,6}', maxLength: 6 },
                { name: 'pin', label: 'ตั้งรหัสผ่าน (ตัวเลข 4 หลัก)', type: 'password', inputMode: 'numeric', pattern: '[0-9]{4}', maxLength: 4, autoComplete: 'new-password' },
                { name: 'pin2', label: 'ยืนยันรหัสผ่าน', type: 'password', inputMode: 'numeric', pattern: '[0-9]{4}', maxLength: 4, autoComplete: 'new-password' },
              ]}
            />
          </>
        )}
        <p className="small mt"><Link href="/login">กลับไปหน้าเข้าสู่ระบบ</Link></p>
      </div>
    </main>
  );
}
