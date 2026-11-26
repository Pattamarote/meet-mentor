'use server';
import { db, dbMessage } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { back, safePath, isUuid } from '@/lib/redirect';
import { fmtDateLong, fmtTime } from '@/lib/time';

async function describe(bookingId: string) {
  const { data } = await db().from('bookings').select('booking_no,members(name),slots(start_at,end_at,mentors(name))').eq('id', bookingId).maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = data as any;
  return d ? `${d.booking_no} ${d.members.name} กับ ${d.slots.mentors.name} ${fmtDateLong(d.slots.start_at)} ${fmtTime(d.slots.start_at)}-${fmtTime(d.slots.end_at)}` : '';
}

export async function cancelBookingAction(fd: FormData) {
  const me = await requireAdmin();
  const id = String(fd.get('id') ?? '');
  const ret = safePath(fd.get('ret'), `/admin/bookings/${id}`);
  const reason = String(fd.get('reason') ?? '').trim();
  if (!isUuid(id)) back('/admin/bookings', { err: 'ไม่พบรายการ' });
  const { error } = await db().rpc('cancel_booking', { p_booking_id: id, p_actor: `admin:${me.username}`, p_reason: reason });
  if (error) back(ret, { err: dbMessage(error) });
  back(ret, { ok: `ยกเลิกแล้ว: ${await describe(id)} — กรุณาแจ้งผู้จองและ Mentor` });
}

export async function moveBookingAction(fd: FormData) {
  const me = await requireAdmin();
  const id = String(fd.get('id') ?? '');
  const slot = String(fd.get('slot_id') ?? '');
  const ret = safePath(fd.get('ret'), `/admin/bookings/${id}`);
  const reason = String(fd.get('reason') ?? '').trim();
  if (!isUuid(id) || !isUuid(slot)) back(ret, { err: 'กรุณาเลือกช่วงเวลาใหม่' });
  const { error } = await db().rpc('move_booking', { p_booking_id: id, p_new_slot_id: slot, p_actor: `admin:${me.username}`, p_reason: reason });
  if (error) back(ret, { err: `ย้ายไม่สำเร็จ นัดเดิมยังคงอยู่ — ${dbMessage(error)}` });
  back(ret, { ok: `ย้ายนัดแล้ว: ${await describe(id)} — กรุณาแจ้งผู้จองและ Mentor` });
}

export async function bookOnBehalf(fd: FormData) {
  const me = await requireAdmin();
  const ret = safePath(fd.get('ret'), '/admin/bookings');
  const code = String(fd.get('code') ?? '').trim();
  const slot = String(fd.get('slot_id') ?? '');
  const note = String(fd.get('note') ?? '').trim() || null;
  if (!isUuid(slot)) back(ret, { err: 'กรุณาเลือกช่วงเวลา' });
  const { data: m } = await db().from('members').select('id').eq('employee_code', code).maybeSingle();
  if (!m) back(ret, { err: `ไม่พบรหัสพนักงาน ${code}` });
  const { data, error } = await db().rpc('book_slot', { p_member_id: m.id, p_slot_id: slot, p_actor: `admin:${me.username}`, p_note: note });
  if (error) back(ret, { err: `จองแทนไม่สำเร็จ — ${dbMessage(error)}` });
  back(ret, { ok: `จองแทนแล้ว: ${await describe(data.id)} — กรุณาแจ้งผู้จองและ Mentor` });
}
