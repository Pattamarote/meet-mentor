'use server';
import bcrypt from 'bcryptjs';
import { db, dbMessage } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { back } from '@/lib/redirect';
import { hashPassword } from '@/lib/auth';

const P = '/admin/settings';

export async function saveSettings(fd: FormData) {
  await requireAdmin();
  const max = String(fd.get('max_bookings_per_month') ?? '').trim();
  if (max && !/^\d{1,3}$/.test(max)) back(P, { err: 'จำนวนครั้งสูงสุดต้องเป็นตัวเลข (เว้นว่าง = ไม่จำกัด)' });
  const rows = [
    { key: 'max_bookings_per_month', value: max === '0' ? '' : max },
    { key: 'show_booker_name', value: fd.get('show_booker_name') === 'on' ? 'true' : 'false' },
    { key: 'admin_contact', value: String(fd.get('admin_contact') ?? '').trim().slice(0, 300) },
  ];
  const { error } = await db().from('settings').upsert(rows);
  if (error) back(P, { err: dbMessage(error) });
  back(P, { ok: 'บันทึกการตั้งค่าแล้ว' });
}

export async function changePassword(fd: FormData) {
  const me = await requireAdmin();
  const cur = String(fd.get('current') ?? '');
  const next = String(fd.get('next') ?? '');
  const next2 = String(fd.get('next2') ?? '');
  const { data } = await db().from('admins').select('password_hash').eq('id', me.id).single();
  if (!data || !(await bcrypt.compare(cur, data.password_hash))) back(P, { err: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
  if (next.length < 10) back(P, { err: 'รหัสผ่านใหม่ต้องยาวอย่างน้อย 10 ตัวอักษร' });
  if (next !== next2) back(P, { err: 'รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน' });
  const { error } = await db().from('admins').update({ password_hash: await hashPassword(next), updated_at: new Date().toISOString() }).eq('id', me.id);
  if (error) back(P, { err: dbMessage(error) });
  back(P, { ok: 'เปลี่ยนรหัสผ่าน Admin แล้ว' });
}
