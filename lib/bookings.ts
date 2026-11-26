import 'server-only';
import { db } from './db';
import { monthRange } from './time';

export type BookingFilter = { month: string; mentor?: string; status?: string; q?: string };
export type BookingRow = {
  id: string; booking_no: string; status: string; note: string | null; created_at: string; booked_by: string;
  cancel_reason: string | null; cancelled_at: string | null;
  members: { id: string; name: string; employee_code: string };
  slots: { id: string; start_at: string; end_at: string; location: string | null; mentor_id: string; mentors: { id: string; name: string; default_location: string | null } };
};

export const clean = (q: string) => q.replace(/[%,()*\\"'.:]/g, ' ').trim().slice(0, 60);

export async function findBookings(f: BookingFilter): Promise<BookingRow[]> {
  const { from, to } = monthRange(f.month);
  let q = db().from('bookings')
    .select('id,booking_no,status,note,created_at,booked_by,cancel_reason,cancelled_at,members!inner(id,name,employee_code),slots!inner(id,start_at,end_at,location,mentor_id,mentors!inner(id,name,default_location))')
    .gte('slots.start_at', from).lt('slots.start_at', to);
  if (f.mentor) q = q.eq('slots.mentor_id', f.mentor);
  if (f.status === 'confirmed' || f.status === 'cancelled') q = q.eq('status', f.status);
  const term = clean(f.q ?? '');
  if (term) {
    if (/^mm-?\d+$/i.test(term.replace(/\s/g, ''))) {
      q = q.ilike('booking_no', `%${term.replace(/\s/g, '').replace(/^mm-?/i, '')}%`);
    } else {
      const { data: ms } = await db().from('members').select('id').or(`name.ilike.%${term}%,employee_code.ilike.%${term}%`).limit(500);
      const ids = (ms ?? []).map((m) => m.id);
      if (!ids.length) return [];
      q = q.in('member_id', ids);
    }
  }
  const { data, error } = await q.limit(5000);
  if (error) throw error;
  return ((data ?? []) as unknown as BookingRow[]).sort((a, b) => a.slots.start_at.localeCompare(b.slots.start_at));
}

/** หมายเหตุสำหรับรายงาน: หมายเหตุผู้จอง + เหตุผลยกเลิก/ย้าย */
export async function historyNotes(ids: string[]): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await db().from('booking_history').select('booking_id,action,reason,actor,created_at').in('booking_id', ids.slice(i, i + 200)).neq('action', 'create').order('id');
    for (const h of data ?? []) (out[h.booking_id] ??= []).push(`${h.action === 'move' ? 'ย้ายนัด' : h.action === 'cancel' ? 'ยกเลิก' : 'บันทึก'}: ${h.reason ?? '-'} (${h.actor})`);
  }
  return out;
}
