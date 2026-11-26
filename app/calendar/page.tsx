import Link from 'next/link';
import { db, getSettings } from '@/lib/db';
import { requireMember } from '@/lib/session';
import { UserNav } from '@/components/UserNav';
import { Avatar } from '@/components/ui';
import { MonthCalendar, CalSlot } from '@/components/MonthCalendar';
import { validMonth, monthRange, shiftMonth, monthLabel, isValidDate, isValidTime, fmtTime, toUtc } from '@/lib/time';
import type { SlotRow } from '@/lib/status';
import { isUuid } from '@/lib/redirect';

export const dynamic = 'force-dynamic';

export default async function CalendarPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireMember();
  const sp = await searchParams;
  const month = validMonth(sp.month);
  const date = sp.date && isValidDate(sp.date) && sp.date.startsWith(month) ? sp.date : '';
  const tFrom = sp.from && isValidTime(sp.from) ? sp.from : '';
  const tTo = sp.to && isValidTime(sp.to) ? sp.to : '';
  const freeOnly = sp.free === '1';
  const mentorParam = isUuid(sp.mentor ?? '') ? sp.mentor : '';
  const range = date
    ? { from: toUtc(date, '00:00').toISOString(), to: new Date(toUtc(date, '00:00').getTime() + 86400000).toISOString() }
    : monthRange(month);
  let q = db().from('slot_view').select('*').eq('mentor_active', true).gte('start_at', range.from).lt('start_at', range.to).order('start_at');
  if (mentorParam) q = q.eq('mentor_id', mentorParam);
  if (freeOnly) q = q.eq('status', 'available');
  // ดึงข้อมูลพร้อมกันเพื่อให้หน้าโหลดเร็วขึ้น
  const [settings, { data: mentors }, { data }] = await Promise.all([
    getSettings(),
    db().from('mentors').select('id,name,photo_url,bio').eq('is_active', true).order('name'),
    q,
  ]);
  const showName = settings.show_booker_name === 'true';
  const mentor = (mentors ?? []).find((m) => m.id === mentorParam) ?? null;
  let rows = (data ?? []) as SlotRow[];
  if (tFrom) rows = rows.filter((r) => fmtTime(r.start_at) >= tFrom);
  if (tTo) rows = rows.filter((r) => fmtTime(r.end_at) <= tTo);

  // ไม่ส่งข้อมูลผู้จองคนอื่นออกไปที่หน้าเว็บ เว้นแต่องค์กรอนุญาต
  const slots: CalSlot[] = rows.map((r) => {
    const mine = r.member_id === me.id;
    return {
      id: r.id, start_at: r.start_at, end_at: r.end_at, status: r.status, mentor_name: r.mentor_name, mine,
      label: r.status === 'booked' && !mine && showName && r.member_name ? `จองโดย ${r.member_name}` : null,
      href: r.status === 'available' ? `/book/${r.id}` : null,
    };
  });
  const available = rows.filter((r) => r.status === 'available').length;

  const qs = (over: Record<string, string>) => {
    const p = new URLSearchParams({ ...(mentor ? { mentor: mentor.id } : {}), month, ...(freeOnly ? { free: '1' } : {}), ...(tFrom ? { from: tFrom } : {}), ...(tTo ? { to: tTo } : {}), ...over });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/calendar?${p}`;
  };

  return (
    <>
      <UserNav active="book" name={me.name} />
      <main className="container">
        <p className="small"><Link href="/mentors">← เลือก Mentor</Link></p>
        <div className="row" style={{ alignItems: 'center', marginBottom: 12 }}>
          {mentor ? (
            <div className="row" style={{ alignItems: 'center', flex: '1 1 auto' }}>
              <div className="shrink"><Avatar name={mentor.name} url={mentor.photo_url} size="sm" /></div>
              <div><h1 style={{ margin: 0 }}>{mentor.name}</h1>{mentor.bio && <span className="small muted">{mentor.bio}</span>}</div>
            </div>
          ) : <h1 style={{ margin: 0 }}>ตารางทุก Mentor</h1>}
        </div>

        <form className="card row" method="get" action="/calendar">
          <div>
            <label>Mentor</label>
            <select name="mentor" defaultValue={mentor?.id ?? ''}>
              <option value="">ทุก Mentor</option>
              {(mentors ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div><label>เดือน</label><input type="month" name="month" defaultValue={month} /></div>
          <div><label>วันที่ (ไม่บังคับ)</label><input type="date" name="date" defaultValue={date} /></div>
          <div><label>ตั้งแต่เวลา</label><input type="time" name="from" defaultValue={tFrom} /></div>
          <div><label>ถึงเวลา</label><input type="time" name="to" defaultValue={tTo} /></div>
          <div className="shrink"><label><input type="checkbox" name="free" value="1" defaultChecked={freeOnly} /> เฉพาะช่วงที่ว่าง</label></div>
          <div className="shrink"><button className="btn">ค้นหา</button></div>
        </form>

        <div className="row" style={{ alignItems: 'center' }}>
          <div className="shrink"><Link className="btn ghost sm" href={qs({ month: shiftMonth(month, -1), date: '' })}>‹ เดือนก่อน</Link></div>
          <h2 style={{ margin: 0, textAlign: 'center' }}>{monthLabel(month)}{date && ` · วันที่ ${Number(date.slice(8))}`}</h2>
          <div className="shrink"><Link className="btn ghost sm" href={qs({ month: shiftMonth(month, 1), date: '' })}>เดือนถัดไป ›</Link></div>
        </div>
        <div className="legend">
          <span className="slot available">ว่าง (คลิกเพื่อจอง)</span>
          <span className="slot booked">ถูกจองแล้ว</span>
          <span className="slot closed">ปิดการจอง</span>
          <span className="slot expired">หมดเวลา</span>
          <span className="slot booked mine">นัดของฉัน</span>
          <span className="muted">· ว่าง {available} ช่วง (เวลาไทย)</span>
        </div>
        <MonthCalendar month={month} slots={slots} showMentor={!mentor} />
      </main>
    </>
  );
}
