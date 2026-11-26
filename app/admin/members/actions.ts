'use server';
import { db, dbMessage } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { back, safePath, isUuid } from '@/lib/redirect';
import { hashPassword, isEmpCode, isPin } from '@/lib/auth';
import { readSheet, str } from '@/lib/excel';

const P = '/admin/members';

export async function addMember(fd: FormData) {
  await requireAdmin();
  const ret = safePath(fd.get('ret'), P);
  const name = String(fd.get('name') ?? '').trim();
  const code = String(fd.get('code') ?? '').trim();
  const pin = String(fd.get('pin') ?? '').trim();
  if (!name) back(ret, { err: 'กรุณากรอกชื่อ' });
  if (!isEmpCode(code)) back(ret, { err: 'รหัสพนักงานต้องเป็นตัวเลข 5 หรือ 6 หลัก' });
  if (!isPin(pin)) back(ret, { err: 'รหัสผ่านต้องเป็นตัวเลข 4 หลัก' });
  const { error } = await db().from('members').insert({ name, employee_code: code, password_hash: await hashPassword(pin), status: 'active' });
  if (error) back(ret, { err: error.code === '23505' ? `รหัสพนักงาน ${code} มีในระบบแล้ว` : dbMessage(error) });
  back(ret, { ok: `เพิ่มผู้ใช้งาน ${name} (${code}) แล้ว` });
}

export async function updateMember(fd: FormData) {
  await requireAdmin();
  const ret = safePath(fd.get('ret'), P);
  const id = String(fd.get('id') ?? '');
  if (!isUuid(id)) back(ret, { err: 'ไม่พบผู้ใช้งาน' });
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const name = fd.get('name');
  const code = fd.get('code');
  const status = fd.get('status');
  const pin = String(fd.get('pin') ?? '').trim();
  if (typeof name === 'string') { if (!name.trim()) back(ret, { err: 'กรุณากรอกชื่อ' }); row.name = name.trim(); }
  if (typeof code === 'string') { if (!isEmpCode(code.trim())) back(ret, { err: 'รหัสพนักงานต้องเป็นตัวเลข 5 หรือ 6 หลัก' }); row.employee_code = code.trim(); }
  if (typeof status === 'string') { if (!['pending', 'active', 'suspended'].includes(status)) back(ret, { err: 'สถานะไม่ถูกต้อง' }); row.status = status; }
  if (pin) {
    if (!isPin(pin)) back(ret, { err: 'รหัสผ่านใหม่ต้องเป็นตัวเลข 4 หลัก' });
    row.password_hash = await hashPassword(pin);
    row.failed_attempts = 0;
    row.locked_until = null;
  }
  const { error } = await db().from('members').update(row).eq('id', id);
  if (error) back(ret, { err: error.code === '23505' ? 'รหัสพนักงานนี้มีในระบบแล้ว' : dbMessage(error) });
  const msg = status === 'active' ? 'เปิดใช้งาน/อนุมัติบัญชีแล้ว' : status === 'suspended' ? 'ระงับการใช้งานแล้ว' : pin ? 'ตั้งรหัสผ่านใหม่แล้ว กรุณาแจ้งผู้ใช้งานผ่านช่องทางที่ยืนยันตัวตนได้' : 'บันทึกแล้ว';
  back(ret, { ok: msg });
}

export type MemberImportState = { error?: string; errors?: { line: number; msg: string }[]; rows?: { line: number; name: string; code: string; pin: string }[] } | undefined;

export async function checkMembers(_: MemberImportState, fd: FormData): Promise<MemberImportState> {
  await requireAdmin();
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'กรุณาเลือกไฟล์ .xlsx' };
  if (!file.name.toLowerCase().endsWith('.xlsx')) return { error: 'รองรับเฉพาะไฟล์ .xlsx' };
  let sheet: unknown[][];
  try { sheet = await readSheet(file); } catch { return { error: 'อ่านไฟล์ไม่ได้ กรุณาใช้ไฟล์ Template' }; }
  const raw = sheet.slice(1).map((r, i) => ({ line: i + 2, name: str(r[0]), code: str(r[1]), pin: str(r[2]) })).filter((r) => r.name || r.code || r.pin);
  if (!raw.length) return { error: 'ไม่พบข้อมูลในไฟล์' };
  if (raw.length > 5000) return { error: 'นำเข้าได้ครั้งละไม่เกิน 5,000 คน' };
  const errors: { line: number; msg: string }[] = [];
  const seen = new Map<string, number>();
  for (const r of raw) {
    // Excel อาจตัดเลข 0 นำหน้ารหัสผ่าน 4 หลัก
    if (/^\d{1,3}$/.test(r.pin)) r.pin = r.pin.padStart(4, '0');
    const e: string[] = [];
    if (!r.name) e.push('ไม่มีชื่อ');
    if (!isEmpCode(r.code)) e.push('รหัสพนักงานต้องเป็นตัวเลข 5-6 หลัก');
    if (!isPin(r.pin)) e.push('รหัสผ่านต้องเป็นตัวเลข 4 หลัก');
    if (seen.has(r.code)) e.push(`รหัสพนักงานซ้ำกับแถวที่ ${seen.get(r.code)}`);
    seen.set(r.code, r.line);
    if (e.length) errors.push({ line: r.line, msg: e.join(', ') });
  }
  const codes = raw.map((r) => r.code).filter(isEmpCode);
  for (let i = 0; i < codes.length; i += 300) {
    const { data } = await db().from('members').select('employee_code').in('employee_code', codes.slice(i, i + 300));
    for (const d of data ?? []) {
      const r = raw.find((x) => x.code === d.employee_code)!;
      errors.push({ line: r.line, msg: `รหัสพนักงาน ${d.employee_code} มีในระบบแล้ว` });
    }
  }
  errors.sort((a, b) => a.line - b.line);
  return { errors, rows: raw };
}

export async function commitMembers(fd: FormData) {
  await requireAdmin();
  let rows: { name: string; code: string; pin: string }[];
  try { rows = JSON.parse(String(fd.get('rows') ?? '[]')); } catch { back(`${P}/import`, { err: 'ข้อมูลไม่ถูกต้อง' }); }
  if (!rows.length || rows.some((r) => !r.name || !isEmpCode(r.code) || !isPin(r.pin))) back(`${P}/import`, { err: 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบใหม่' });
  const data = [];
  for (const r of rows) data.push({ name: r.name.trim(), employee_code: r.code, password_hash: await hashPassword(r.pin), status: 'active' });
  const { error } = await db().from('members').insert(data);
  if (error) back(`${P}/import`, { err: dbMessage(error) + ' (ไม่ได้บันทึกใครเลย)' });
  back(P, { ok: `นำเข้าผู้ใช้งาน ${rows.length} คนแล้ว` });
}
