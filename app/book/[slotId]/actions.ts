'use server';
import { redirect } from 'next/navigation';
import { db, dbMessage } from '@/lib/db';
import { requireMember } from '@/lib/session';
import { back } from '@/lib/redirect';

export async function confirmBooking(fd: FormData) {
  const me = await requireMember();
  const slotId = String(fd.get('slot_id') ?? '');
  const note = String(fd.get('note') ?? '').trim().slice(0, 500) || null;
  if (!/^[0-9a-f-]{36}$/i.test(slotId)) back('/mentors', { err: 'ไม่พบช่วงเวลานี้' });
  const { data, error } = await db().rpc('book_slot', {
    p_member_id: me.id, p_slot_id: slotId, p_actor: `member:${me.code}`, p_note: note,
  });
  if (error) back(`/book/${slotId}`, { err: dbMessage(error, 'จองไม่สำเร็จ กรุณาลองใหม่') });
  redirect(`/my-bookings?ok=${encodeURIComponent(`จองสำเร็จ เลขที่การจอง ${data.booking_no}`)}`);
}
