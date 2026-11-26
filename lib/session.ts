import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';

export const COOKIE = 'mm_session';
const MAX_AGE = 60 * 60 * 8; // 8 ชั่วโมง

export type Session =
  | { role: 'admin'; id: string; username: string }
  | { role: 'member'; id: string; code: string; name: string };

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET ต้องยาวอย่างน้อย 32 ตัวอักษร');
  return new TextEncoder().encode(s);
}

export async function createSession(s: Session) {
  const token = await new SignJWT(s as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function readSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

/** ตรวจสิทธิ์ Admin ที่ Backend ทุกครั้ง */
export async function requireAdmin() {
  const s = await readSession();
  if (!s || s.role !== 'admin') redirect('/admin/login');
  const { data } = await db().from('admins').select('id,username').eq('id', s.id).maybeSingle();
  if (!data) redirect('/admin/login');
  return s;
}

/** ตรวจสิทธิ์ User และสถานะบัญชีจากฐานข้อมูลทุกครั้ง (ระงับแล้วเข้าไม่ได้ทันที) */
export async function requireMember() {
  const s = await readSession();
  if (!s || s.role !== 'member') redirect('/login');
  const { data } = await db().from('members').select('id,employee_code,name,status').eq('id', s.id).maybeSingle();
  if (!data || data.status !== 'active') redirect('/login?e=inactive');
  return { ...s, name: data.name as string, code: data.employee_code as string };
}
