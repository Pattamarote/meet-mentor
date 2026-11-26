import 'server-only';
import bcrypt from 'bcryptjs';
import { db } from './db';

const MAX_FAILS = 5;
const LOCK_MINUTES = 15;

type Table = 'admins' | 'members';

/** ตรวจรหัสผ่าน + ล็อกบัญชีชั่วคราวเมื่อกรอกผิดหลายครั้ง (กันการเดารหัส 4 หลัก) */
export async function verifyLogin(table: Table, column: 'username' | 'employee_code', value: string, password: string) {
  const { data: row } = await db().from(table).select('*').eq(column, value).maybeSingle();
  // ใช้เวลาใกล้เคียงกันแม้ไม่พบผู้ใช้
  const hash = row?.password_hash ?? '$2b$10$IXrh77tnzTloqMT3BTjGhu7uyaAITMUbC.RlfsBxwfxVeZWdWUfFW';
  if (row?.locked_until && new Date(row.locked_until) > new Date()) {
    return { ok: false as const, error: `กรอกรหัสผิดหลายครั้ง บัญชีถูกล็อกชั่วคราว กรุณาลองใหม่ภายหลัง หรือติดต่อ Admin` };
  }
  const ok = await bcrypt.compare(password, hash);
  if (!row || !ok) {
    if (row) {
      const fails = (row.failed_attempts ?? 0) + 1;
      await db().from(table).update({
        failed_attempts: fails >= MAX_FAILS ? 0 : fails,
        locked_until: fails >= MAX_FAILS ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null,
      }).eq('id', row.id);
    }
    return { ok: false as const, error: 'รหัสผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };
  }
  if (row.failed_attempts || row.locked_until) {
    await db().from(table).update({ failed_attempts: 0, locked_until: null }).eq('id', row.id);
  }
  return { ok: true as const, row };
}

export const hashPassword = (p: string) => bcrypt.hash(p, 10);
export const isPin = (p: string) => /^\d{4}$/.test(p);
export const isEmpCode = (c: string) => /^\d{5,6}$/.test(c);
