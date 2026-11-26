import bcrypt from 'bcryptjs';
import { db, getSettings } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { AdminNav } from '@/components/AdminNav';
import { Flash } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { saveSettings, changePassword } from './actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const s = await getSettings();
  const { data: admin } = await db().from('admins').select('password_hash').eq('id', me.id).single();
  const defaultPw = admin ? await bcrypt.compare('1234', admin.password_hash) : false;
  return (
    <>
      <AdminNav active="settings" username={me.username} />
      <main className="container" style={{ maxWidth: 760 }}>
        <h1>ตั้งค่า</h1>
        <Flash sp={sp} />
        {defaultPw && <div className="alert err">คุณยังใช้รหัสผ่านเริ่มต้น (1234) กรุณาเปลี่ยนรหัสผ่านด้านล่างทันที</div>}
        <form action={saveSettings} className="card">
          <h2 style={{ marginTop: 0 }}>เงื่อนไขการจอง</h2>
          <label>จำนวนครั้งสูงสุดต่อคนต่อเดือน (เว้นว่าง = จองได้ตามเวลาว่าง)</label>
          <input name="max_bookings_per_month" inputMode="numeric" defaultValue={s.max_bookings_per_month} />
          <label><input type="checkbox" name="show_booker_name" defaultChecked={s.show_booker_name === 'true'} /> แสดงชื่อผู้จองในตารางให้ User คนอื่นเห็น (ถ้าองค์กรอนุญาต)</label>
          <label>ช่องทางติดต่อ Admin (แสดงในหน้ารายการจองและหน้าลืมรหัสผ่าน)</label>
          <textarea name="admin_contact" rows={2} defaultValue={s.admin_contact} />
          <div className="mt"><SubmitButton>บันทึกการตั้งค่า</SubmitButton></div>
        </form>
        <form action={changePassword} className="card">
          <h2 style={{ marginTop: 0 }}>เปลี่ยนรหัสผ่าน Admin ({me.username})</h2>
          <label>รหัสผ่านปัจจุบัน</label><input type="password" name="current" required autoComplete="current-password" />
          <label>รหัสผ่านใหม่ (อย่างน้อย 10 ตัวอักษร)</label><input type="password" name="next" required minLength={10} autoComplete="new-password" />
          <label>ยืนยันรหัสผ่านใหม่</label><input type="password" name="next2" required minLength={10} autoComplete="new-password" />
          <div className="mt"><SubmitButton>เปลี่ยนรหัสผ่าน</SubmitButton></div>
        </form>
      </main>
    </>
  );
}
