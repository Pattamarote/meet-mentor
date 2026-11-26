'use server';
import { redirect } from 'next/navigation';
import { db, dbMessage, getSettings } from '@/lib/db';
import { verifyLogin, hashPassword, isEmpCode, isPin } from '@/lib/auth';
import { createSession, destroySession, readSession } from '@/lib/session';

export type FormState = { error?: string; ok?: string } | undefined;

export async function memberLogin(_: FormState, fd: FormData): Promise<FormState> {
  const code = String(fd.get('code') ?? '').trim();
  const pin = String(fd.get('pin') ?? '').trim();
  if (!isEmpCode(code) || !isPin(pin)) return { error: 'รหัสพนักงานต้องเป็นตัวเลข 5-6 หลัก และรหัสผ่านเป็นตัวเลข 4 หลัก' };
  const r = await verifyLogin('members', 'employee_code', code, pin);
  if (!r.ok) return { error: r.error };
  if (r.row.status === 'pending') return { error: 'บัญชีของคุณอยู่ระหว่าง "รออนุมัติ" กรุณาติดต่อ Admin' };
  if (r.row.status === 'suspended') return { error: 'บัญชีของคุณถูก "ระงับการใช้งาน" กรุณาติดต่อ Admin' };
  await createSession({ role: 'member', id: r.row.id, code: r.row.employee_code, name: r.row.name });
  redirect('/mentors');
}

export async function register(_: FormState, fd: FormData): Promise<FormState> {
  const settings = await getSettings();
  if (settings.allow_self_register !== 'true') return { error: 'ปิดการสมัครด้วยตนเอง กรุณาติดต่อ Admin' };
  const name = String(fd.get('name') ?? '').trim();
  const code = String(fd.get('code') ?? '').trim();
  const pin = String(fd.get('pin') ?? '').trim();
  const pin2 = String(fd.get('pin2') ?? '').trim();
  if (!name) return { error: 'กรุณากรอกชื่อ-นามสกุล' };
  if (!isEmpCode(code)) return { error: 'รหัสพนักงานต้องเป็นตัวเลข 5 หรือ 6 หลัก' };
  if (!isPin(pin)) return { error: 'รหัสผ่านต้องเป็นตัวเลข 4 หลัก' };
  if (pin !== pin2) return { error: 'รหัสผ่านทั้งสองช่องไม่ตรงกัน' };
  const { error } = await db().from('members').insert({ name, employee_code: code, password_hash: await hashPassword(pin), status: 'pending' });
  if (error) return { error: error.code === '23505' ? 'รหัสพนักงานนี้มีในระบบแล้ว หากลืมรหัสผ่านกรุณาติดต่อ Admin' : dbMessage(error) };
  return { ok: 'สมัครเรียบร้อย สถานะ "รออนุมัติ" — เข้าสู่ระบบได้เมื่อ Admin อนุมัติแล้ว' };
}

export async function logoutAction() {
  const s = await readSession();
  await destroySession();
  redirect(s?.role === 'admin' ? '/admin/login' : '/login');
}
