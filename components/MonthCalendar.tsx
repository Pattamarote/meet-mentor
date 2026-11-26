import Link from 'next/link';
import { fmtTime, isoDate, fmtDateLong } from '@/lib/time';
import { SLOT_STATUS } from '@/lib/status';

export type CalSlot = {
  id: string; start_at: string; end_at: string; status: string; mentor_name: string;
  label?: string | null; mine?: boolean; href?: string | null;
};

const DOW = ['จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.', 'อา.'];

export function MonthCalendar({ month, slots, showMentor }: { month: string; slots: CalSlot[]; showMentor: boolean }) {
  const [y, m] = month.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstDow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // จันทร์ = 0
  const today = isoDate(new Date());
  const byDay: Record<string, CalSlot[]> = {};
  for (const s of slots) (byDay[isoDate(s.start_at)] ??= []).push(s);

  const cells: (string | null)[] = [...Array(firstDow).fill(null)];
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`);

  const slotEl = (s: CalSlot) => {
    const text = (
      <>
        {fmtTime(s.start_at)}-{fmtTime(s.end_at)}
        {showMentor && <> · {s.mentor_name}</>}
        <br />
        {s.mine ? 'นัดของฉัน' : (s.label ?? SLOT_STATUS[s.status])}
      </>
    );
    const cls = `slot ${s.status}${s.mine ? ' mine' : ''}`;
    return s.href
      ? <Link key={s.id} href={s.href} className={cls}>{text}</Link>
      : <span key={s.id} className={cls}>{text}</span>;
  };

  const sortedDays = Object.keys(byDay).sort();
  return (
    <>
      <div className="cal cal-desktop">
        {DOW.map((d) => <div key={d} className="dow">{d}</div>)}
        {cells.map((d, i) => d === null
          ? <div key={`e${i}`} className="day empty" />
          : (
            <div key={d} className={`day${d === today ? ' today' : ''}`}>
              <span className="num">{Number(d.slice(8))}</span>
              {(byDay[d] ?? []).map(slotEl)}
            </div>
          ))}
      </div>
      <div className="list-mobile">
        {sortedDays.length === 0 && <div className="card muted">ไม่มีช่วงเวลาตามตัวกรองที่เลือก</div>}
        {sortedDays.map((d) => (
          <div key={d} className="card" style={{ padding: 12 }}>
            <strong>{fmtDateLong(`${d}T12:00:00+07:00`)}</strong>
            <div className="grid" style={{ gap: 6, marginTop: 6 }}>{byDay[d].map(slotEl)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
