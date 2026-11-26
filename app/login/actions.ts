'use server';
import { redirect } from 'next/navigation';
import { verifyLogin, isEmpCode, isPin } from '@/lib/auth';
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

export async function logoutAction() {
  const s = await readSession();
  await destroySession();
  redirect(s?.role === 'admin' ? '/admin/login' : '/login');
}
