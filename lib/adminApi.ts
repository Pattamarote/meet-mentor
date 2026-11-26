import 'server-only';
import { readSession } from './session';
import { db } from './db';

/** ตรวจสิทธิ์ Admin สำหรับ Route Handler (ดาวน์โหลดไฟล์) */
export async function adminFromRequest() {
  const s = await readSession();
  if (!s || s.role !== 'admin') return null;
  const { data } = await db().from('admins').select('id,username').eq('id', s.id).maybeSingle();
  return data;
}
