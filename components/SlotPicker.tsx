import { db } from '@/lib/db';
import { fmtDate, fmtTime } from '@/lib/time';

/** รายการช่วงเวลาว่างในอนาคต สำหรับย้ายนัด/จองแทน */
export async function SlotPicker({ name = 'slot_id' }: { name?: string }) {
  const { data } = await db().from('slot_view').select('id,mentor_name,start_at,end_at').eq('status', 'available').gt('start_at', new Date().toISOString()).order('mentor_name').order('start_at').limit(1000);
  const groups: Record<string, { id: string; start_at: string; end_at: string }[]> = {};
  for (const s of data ?? []) (groups[s.mentor_name] ??= []).push(s);
  return (
    <select name={name} required defaultValue="">
      <option value="" disabled>เลือกช่วงเวลาที่ว่าง</option>
      {Object.entries(groups).map(([mentor, list]) => (
        <optgroup key={mentor} label={mentor}>
          {list.map((s) => <option key={s.id} value={s.id}>{fmtDate(s.start_at)} {fmtTime(s.start_at)}-{fmtTime(s.end_at)}</option>)}
        </optgroup>
      ))}
    </select>
  );
}
