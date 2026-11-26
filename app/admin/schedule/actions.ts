'use server';
import { db, dbMessage } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { back, safePath, isUuid } from '@/lib/redirect';
import { toUtc, isValidDate, isValidTime, isoDate } from '@/lib/time';

const MAX_GEN = 500;

export async function addSlots(fd: FormData) {
  await requireAdmin();
  const ret = safePath(fd.get('ret'), '/admin/schedule');
  const mentor_id = String(fd.get('mentor_id') ?? '');
  const date = String(fd.get('date') ?? '');
  const until = String(fd.get('until') ?? '') || date;
  const start = String(fd.get('start') ?? '');
  const end = String(fd.get('end') ?? '');
  const split = Number(fd.get('split') ?? 0);
  const location = String(fd.get('location') ?? '').trim() || null;
  const weekdays = fd.getAll('wd').map(Number);
  if (!mentor_id) back(ret, { err: 'กรุณาเลือก Mentor' });
  if (!isValidDate(date) || !isValidDate(until) || until < date) back(ret, { err: 'วันที่ไม่ถูกต้อง' });
  if (!isValidTime(start) || !isValidTime(end) || end <= start) back(ret, { err: 'เวลาเริ่มต้องน้อยกว่าเวลาสิ้นสุด' });

  const rows: { mentor_id: string; start_at: string; end_at: string; location: string | null }[] = [];
  for (let d = toUtc(date, '12:00'); isoDate(d) <= until; d = new Date(d.getTime() + 86400000)) {
    const day = isoDate(d);
    const dow = new Date(`${day}T00:00:00Z`).getUTCDay();
    if (until !== date && weekdays.length && !weekdays.includes(dow)) continue;
    const s0 = toUtc(day, start).getTime();
    const e0 = toUtc(day, end).getTime();
    const step = split > 0 ? split * 60000 : e0 - s0;
    for (let t = s0; t + step <= e0; t += step) {
      rows.push({ mentor_id, start_at: new Date(t).toISOString(), end_at: new Date(t + step).toISOString(), location });
    }
    if (rows.length > MAX_GEN) back(ret, { err: `สร้างได้ครั้งละไม่เกิน ${MAX_GEN} ช่วง` });
  }
  if (rows.length === 0) back(ret, { err: 'ไม่มีช่วงเวลาที่จะสร้าง (ตรวจสอบวันในสัปดาห์/ความยาวช่วง)' });
  if (rows.some((r) => new Date(r.start_at) <= new Date())) back(ret, { err: 'มีช่วงเวลาที่ผ่านมาแล้ว กรุณาเลือกวัน/เวลาในอนาคต' });
  const { error } = await db().from('slots').insert(rows);
  if (error) back(ret, { err: dbMessage(error) + ' (ไม่ได้บันทึกช่วงใดเลย)' });
  back(ret, { ok: `เพิ่มช่วงเวลา ${rows.length} ช่วงแล้ว` });
}

export async function toggleSlot(fd: FormData) {
  await requireAdmin();
  const ret = safePath(fd.get('ret'), '/admin/schedule');
  const ids = fd.getAll('id').map(String).filter(isUuid);
  if (!ids.length) back(ret, { err: 'ไม่มีช่วงเวลาที่เลือก' });
  const open = fd.get('open') === '1';
  const { error } = await db().from('slots').update({ is_open: open, updated_at: new Date().toISOString() }).in('id', ids);
  if (error) back(ret, { err: dbMessage(error) });
  back(ret, { ok: open ? 'เปิดให้จองแล้ว' : 'ปิดการจองแล้ว (นัดที่จองไว้ก่อนหน้ายังคงอยู่)' });
}

export async function updateSlot(fd: FormData) {
  await requireAdmin();
  const ret = safePath(fd.get('ret'), '/admin/schedule');
  const id = String(fd.get('id') ?? '');
  const date = String(fd.get('date') ?? '');
  const start = String(fd.get('start') ?? '');
  const end = String(fd.get('end') ?? '');
  const location = String(fd.get('location') ?? '').trim() || null;
  const { data: booked } = await db().from('bookings').select('id').eq('slot_id', id).eq('status', 'confirmed').maybeSingle();
  const row: Record<string, unknown> = { location, updated_at: new Date().toISOString() };
  if (!booked) {
    if (!isValidDate(date) || !isValidTime(start) || !isValidTime(end) || end <= start) back(ret, { err: 'วันหรือเวลาไม่ถูกต้อง' });
    row.start_at = toUtc(date, start).toISOString();
    row.end_at = toUtc(date, end).toISOString();
  }
  const { error } = await db().from('slots').update(row).eq('id', id);
  if (error) back(ret, { err: dbMessage(error) });
  back(ret, { ok: booked ? 'แก้ไขสถานที่แล้ว (ช่วงที่มีคนจองแล้วเปลี่ยนวันเวลาไม่ได้ ให้ใช้ “ย้ายนัด” แทน)' : 'แก้ไขช่วงเวลาแล้ว' });
}

export async function deleteSlot(fd: FormData) {
  await requireAdmin();
  const ret = safePath(fd.get('ret'), '/admin/schedule');
  const id = String(fd.get('id') ?? '');
  if (!isUuid(id)) back(ret, { err: 'ไม่พบช่วงเวลา' });
  const { count } = await db().from('bookings').select('id', { count: 'exact', head: true }).eq('slot_id', id);
  const { count: hist } = await db().from('booking_history').select('id', { count: 'exact', head: true }).or(`old_slot_id.eq.${id},new_slot_id.eq.${id}`);
  if ((count ?? 0) > 0 || (hist ?? 0) > 0) back(ret, { err: 'ช่วงนี้มีประวัติการจอง ลบไม่ได้ ให้ใช้ “ปิดการจอง” แทน' });
  const { error } = await db().from('slots').delete().eq('id', id);
  if (error) back(ret, { err: dbMessage(error) });
  back(ret, { ok: 'ลบช่วงเวลาแล้ว' });
}
