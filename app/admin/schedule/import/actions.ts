'use server';
import { db, dbMessage } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { back } from '@/lib/redirect';
import { readSheet, toDateStr, toTimeStr, str } from '@/lib/excel';
import { toUtc, isValidDate } from '@/lib/time';

export type ImportRow = { line: number; mentor: string; mentor_id: string; date: string; start: string; end: string; location: string | null; start_at: string; end_at: string };
export type ImportState = { error?: string; rows?: ImportRow[]; errors?: { line: number; msg: string }[]; fileName?: string } | undefined;

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

async function validate(raw: { line: number; mentor: string; date: unknown; start: unknown; end: unknown; location: string }[]) {
  const { data: mentors } = await db().from('mentors').select('id,name,is_active');
  const byName = new Map<string, { id: string; is_active: boolean }[]>();
  for (const m of mentors ?? []) {
    const k = norm(m.name);
    byName.set(k, [...(byName.get(k) ?? []), m]);
  }
  const errors: { line: number; msg: string }[] = [];
  const rows: ImportRow[] = [];
  const now = Date.now();
  for (const r of raw) {
    const errs: string[] = [];
    const found = byName.get(norm(r.mentor)) ?? [];
    if (!r.mentor) errs.push('ไม่ได้ระบุชื่อ Mentor');
    else if (found.length === 0) errs.push(`ไม่พบ Mentor ชื่อ “${r.mentor}” ในระบบ`);
    else if (found.length > 1) errs.push(`ชื่อ Mentor “${r.mentor}” ซ้ำกันหลายคน ระบุไม่ได้ชัดเจน`);
    else if (!found[0].is_active) errs.push(`Mentor “${r.mentor}” ปิดใช้งานอยู่`);
    const date = toDateStr(r.date);
    const start = toTimeStr(r.start);
    const end = toTimeStr(r.end);
    if (!date || !isValidDate(date)) errs.push('วันที่ไม่ถูกต้อง (ใช้ YYYY-MM-DD)');
    if (!start) errs.push('เวลาเริ่มไม่ถูกต้อง (ใช้ HH:MM)');
    if (!end) errs.push('เวลาสิ้นสุดไม่ถูกต้อง (ใช้ HH:MM)');
    if (start && end && end <= start) errs.push('เวลาสิ้นสุดต้องหลังเวลาเริ่ม');
    if (!errs.length && date && start && end) {
      const s = toUtc(date, start), e = toUtc(date, end);
      if (s.getTime() <= now) errs.push('เป็นวันเวลาที่ผ่านมาแล้ว');
      rows.push({ line: r.line, mentor: r.mentor, mentor_id: found[0].id, date, start, end, location: r.location || null, start_at: s.toISOString(), end_at: e.toISOString() });
    }
    if (errs.length) errors.push({ line: r.line, msg: errs.join(', ') });
  }
  // ซ้ำ/ทับซ้อนกันเองในไฟล์
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    if (a.mentor_id === b.mentor_id && a.start_at < b.end_at && b.start_at < a.end_at) {
      errors.push({ line: b.line, msg: a.start_at === b.start_at && a.end_at === b.end_at ? `ซ้ำกับแถวที่ ${a.line}` : `ทับซ้อนกับแถวที่ ${a.line}` });
    }
  }
  // ทับกับช่วงที่มีในระบบแล้ว
  if (rows.length) {
    const minS = rows.reduce((m, r) => (r.start_at < m ? r.start_at : m), rows[0].start_at);
    const maxE = rows.reduce((m, r) => (r.end_at > m ? r.end_at : m), rows[0].end_at);
    const { data: existing } = await db().from('slot_view').select('mentor_id,start_at,end_at,status')
      .in('mentor_id', [...new Set(rows.map((r) => r.mentor_id))]).lt('start_at', maxE).gt('end_at', minS);
    for (const r of rows) {
      const hit = (existing ?? []).find((x) => x.mentor_id === r.mentor_id && new Date(x.start_at) < new Date(r.end_at) && new Date(r.start_at) < new Date(x.end_at));
      if (hit) errors.push({ line: r.line, msg: hit.status === 'booked' ? 'ทับช่วงเวลาที่มีคนจองแล้ว (ระบบไม่เขียนทับ)' : 'ซ้ำ/ทับซ้อนกับช่วงเวลาที่มีอยู่ในระบบแล้ว' });
    }
  }
  errors.sort((a, b) => a.line - b.line);
  return { rows, errors };
}

export async function checkImport(_: ImportState, fd: FormData): Promise<ImportState> {
  await requireAdmin();
  const file = fd.get('file');
  if (!(file instanceof File) || file.size === 0) return { error: 'กรุณาเลือกไฟล์ .xlsx' };
  if (!file.name.toLowerCase().endsWith('.xlsx')) return { error: 'รองรับเฉพาะไฟล์ .xlsx' };
  let sheet: unknown[][];
  try { sheet = await readSheet(file); } catch { return { error: 'อ่านไฟล์ไม่ได้ กรุณาใช้ไฟล์ Template' }; }
  const raw = sheet.slice(1)
    .map((r, i) => ({ line: i + 2, mentor: str(r[0]), date: r[1], start: r[2], end: r[3], location: str(r[4]) }))
    .filter((r) => r.mentor || str(r.date) || str(r.start) || str(r.end));
  if (raw.length === 0) return { error: 'ไม่พบข้อมูลในไฟล์ (แถวแรกต้องเป็นหัวคอลัมน์)' };
  if (raw.length > 2000) return { error: 'นำเข้าได้ครั้งละไม่เกิน 2,000 แถว' };
  const { rows, errors } = await validate(raw);
  return { rows, errors, fileName: file.name };
}

export async function commitImport(fd: FormData) {
  await requireAdmin();
  let parsed: ImportRow[];
  try { parsed = JSON.parse(String(fd.get('rows') ?? '[]')); } catch { back('/admin/schedule/import', { err: 'ข้อมูลไม่ถูกต้อง' }); }
  // ตรวจซ้ำอีกครั้งจากฐานข้อมูลจริงก่อนบันทึก
  const { rows, errors } = await validate(parsed.map((r) => ({ line: r.line, mentor: r.mentor, date: r.date, start: r.start, end: r.end, location: r.location ?? '' })));
  if (errors.length) back('/admin/schedule/import', { err: `ข้อมูลเปลี่ยนไประหว่างตรวจสอบ พบ ${errors.length} แถวผิดพลาด กรุณาอัปโหลดใหม่` });
  const { error } = await db().from('slots').insert(rows.map((r) => ({ mentor_id: r.mentor_id, start_at: r.start_at, end_at: r.end_at, location: r.location })));
  if (error) back('/admin/schedule/import', { err: dbMessage(error) + ' (ไม่ได้บันทึกแถวใดเลย)' });
  back('/admin/schedule', { ok: `นำเข้าช่วงเวลา ${rows.length} ช่วงเรียบร้อย` });
}
