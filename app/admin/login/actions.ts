'use server';
import { redirect } from 'next/navigation';
import { verifyLogin } from '@/lib/auth';
import { createSession } from '@/lib/session';
import type { FormState } from '@/app/login/actions';

export async function adminLogin(_: FormState, fd: FormData): Promise<FormState> {
  const username = String(fd.get('username') ?? '').trim();
  const password = String(fd.get('password') ?? '');
  if (!username || !password) return { error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' };
  const r = await verifyLogin('admins', 'username', username, password);
  if (!r.ok) return { error: r.error };
  await createSession({ role: 'admin', id: r.row.id, username: r.row.username });
  redirect('/admin/schedule');
}
