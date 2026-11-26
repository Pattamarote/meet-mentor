import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { AdminNav, ScheduleTabs } from '@/components/AdminNav';
import { Flash, SlotBadge, LocationText } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { MonthCalendar } from '@/components/MonthCalendar';
import { validMonth, monthRange, shiftMonth, monthLabel, fmtDate, fmtTime, isoDate } from '@/lib/time';
import type { SlotRow } from '@/lib/status';
import { addSlots, toggleSlot, updateSlot, deleteSlot } from './actions';

export const dynamic = 'force-dynamic';

const WD = [['1', 'จ'], ['2', 'อ'], ['3', 'พ'], ['4', 'พฤ'], ['5', 'ศ'], ['6', 'ส'], ['0', 'อา']];

export default async function SchedulePage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const month = validMonth(sp.month);
  const view = sp.view === 'cal' ? 'cal' : 'list';
  const mentorParam = /^[0-9a-f-]{36}$/i.test(sp.mentor ?? '') ? sp.mentor : '';
  const { from, to } = monthRange(month);
  let q = db().from('slot_view').select('*').gte('start_at', from).lt('start_at', to).order('start_at');
  if (mentorParam) q = q.eq('mentor_id', mentorParam);
  if (sp.status) q = q.eq('status', sp.status);
  const [{ data: mentors }, { data }] = await Promise.all([db().from('mentors').select('id,name,is_active').order('name'), q]);
  const mentor = (mentors ?? []).find((m) => m.id === mentorParam) ?? null;
  const slots = (data ?? []) as SlotRow[];
  const ret = `/admin/schedule?${new URLSearchParams({ month, ...(mentor ? { mentor: mentor.id } : {}), ...(sp.status ? { status: sp.status } : {}), view })}`;
  const link = (over: Record<string, string>) => `/admin/schedule?${new URLSearchParams({ month, ...(mentor ? { mentor: mentor.id } : {}), view, ...over })}`;

  return (
    <>
      <AdminNav active="schedule" username={me.username} />
      <main className="container">
        <h1>จัดการตาราง Mentor</h1>
        <ScheduleTabs active="slots" />
        <Flash sp={sp} />

        <details className="card" open={!slots.length}>
          <summary><strong>+ เพิ่มช่วงเวลาที่ Mentor สะดวก</strong></summary>
          <form action={addSlots} className="mt">
            <input type="hidden" name="ret" value={ret} />
            <div className="row">
              <div>
                <label>Mentor *</label>
                <select name="mentor_id" defaultValue={mentor?.id ?? ''} required>
                  <option value="" disabled>เลือก Mentor</option>
                  {(mentors ?? []).filter((m) => m.is_active).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div><label>วันที่ *</label><input type="date" name="date" required /></div>
              <div><label>เวลาเริ่ม *</label><input type="time" name="start" required defaultValue="09:00" /></div>
              <div><label>เวลาสิ้นสุด *</label><input type="time" name="end" required defaultValue="10:00" /></div>
            </div>
            <div className="row">
              <div>
                <label>แบ่งเป็นช่วงละ</label>
                <select name="split" defaultValue="0">
                  <option value="0">ไม่แบ่ง (1 ช่วง)</option>
                  <option value="30">30 นาที</option>
                  <option value="45">45 นาที</option>
                  <option value="60">60 นาที</option>
                  <option value="90">90 นาที</option>
                  <option value="120">120 นาที</option>
                </select>
              </div>
              <div><label>ทำซ้ำถึงวันที่ (ไม่บังคับ)</label><input type="date" name="until" /></div>
              <div>
                <label>เฉพาะวัน (เมื่อทำซ้ำ)</label>
                <div className="row" style={{ gap: 6 }}>
                  {WD.map(([v, l]) => <label key={v} className="shrink" style={{ margin: 0 }}><input type="checkbox" name="wd" value={v} /> {l}</label>)}
                </div>
              </div>
            </div>
            <div className="row">
              <div><label>สถานที่/ลิงก์ (ไม่บังคับ — ถ้าว่างใช้ค่าเริ่มต้นของ Mentor)</label><input name="location" /></div>
              <div className="shrink"><SubmitButton>เพิ่มช่วงเวลา</SubmitButton></div>
            </div>
          </form>
        </details>

        <form className="card row" method="get">
          <div>
            <label>Mentor</label>
            <select name="mentor" defaultValue={mentor?.id ?? ''}>
              <option value="">ทุก Mentor</option>
              {(mentors ?? []).map((m) => <option key={m.id} value={m.id}>{m.name}{m.is_active ? '' : ' (ปิดใช้งาน)'}</option>)}
            </select>
          </div>
          <div><label>เดือน</label><input type="month" name="month" defaultValue={month} /></div>
          <div>
            <label>สถานะ</label>
            <select name="status" defaultValue={sp.status ?? ''}>
              <option value="">ทั้งหมด</option><option value="available">ว่าง</option><option value="booked">ถูกจองแล้ว</option>
              <option value="closed">ปิดการจอง</option><option value="expired">หมดเวลา</option>
            </select>
          </div>
          <input type="hidden" name="view" value={view} />
          <div className="shrink"><button className="btn">แสดง</button></div>
        </form>

        <div className="row" style={{ alignItems: 'center' }}>
          <div className="shrink"><Link className="btn ghost sm" href={link({ month: shiftMonth(month, -1) })}>‹</Link></div>
          <h2 style={{ margin: 0 }}>{monthLabel(month)} · {slots.length} ช่วง</h2>
          <div className="shrink"><Link className="btn ghost sm" href={link({ month: shiftMonth(month, 1) })}>›</Link></div>
          <div className="shrink nav">
            <Link href={link({ view: 'list' })} className={view === 'list' ? 'active' : ''}>ตาราง</Link>
            <Link href={link({ view: 'cal' })} className={view === 'cal' ? 'active' : ''}>ปฏิทิน</Link>
          </div>
        </div>

        {view === 'cal' ? (
          <div className="mt">
            <MonthCalendar month={month} showMentor={!mentor}
              slots={slots.map((s) => ({ id: s.id, start_at: s.start_at, end_at: s.end_at, status: s.status, mentor_name: s.mentor_name, label: s.member_name ? `${s.member_name}` : null }))} />
          </div>
        ) : (
          <div className="table-wrap mt">
            <table>
              <thead><tr><th>วันที่</th><th>เวลา</th><th>Mentor</th><th>สถานที่/ลิงก์</th><th>สถานะ</th><th>ผู้จอง</th><th>จัดการ</th></tr></thead>
              <tbody>
                {slots.length === 0 && <tr><td colSpan={7} className="muted">ไม่มีช่วงเวลาในเดือนนี้</td></tr>}
                {slots.map((s) => (
                  <tr key={s.id}>
                    <td>{fmtDate(s.start_at)}</td>
                    <td>{fmtTime(s.start_at)}-{fmtTime(s.end_at)}</td>
                    <td>{s.mentor_name}</td>
                    <td className="small"><LocationText loc={s.location} /></td>
                    <td><SlotBadge s={s.status} />{!s.is_open && s.status === 'booked' && <div className="small muted">(ปิดรับเพิ่ม)</div>}</td>
                    <td className="small">{s.member_name ? <>{s.member_name}<br /><span className="muted">{s.employee_code} · {s.booking_no}</span></> : '-'}</td>
                    <td>
                      <div className="row" style={{ gap: 4 }}>
                        <form action={toggleSlot} className="shrink">
                          <input type="hidden" name="ret" value={ret} /><input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="open" value={s.is_open ? '0' : '1'} />
                          <SubmitButton className="btn ghost sm" pendingText="...">{s.is_open ? 'ปิดจอง' : 'เปิดจอง'}</SubmitButton>
                        </form>
                        {!s.booking_id && (
                          <form action={deleteSlot} className="shrink">
                            <input type="hidden" name="ret" value={ret} /><input type="hidden" name="id" value={s.id} />
                            <SubmitButton className="btn ghost sm" pendingText="..." confirm="ลบช่วงเวลานี้?">ลบ</SubmitButton>
                          </form>
                        )}
                      </div>
                      <details>
                        <summary className="small">แก้ไข</summary>
                        <form action={updateSlot} style={{ minWidth: 220 }}>
                          <input type="hidden" name="ret" value={ret} /><input type="hidden" name="id" value={s.id} />
                          {!s.booking_id && (
                            <>
                              <input type="date" name="date" defaultValue={isoDate(s.start_at)} />
                              <div className="row" style={{ gap: 4 }}>
                                <input type="time" name="start" defaultValue={fmtTime(s.start_at)} />
                                <input type="time" name="end" defaultValue={fmtTime(s.end_at)} />
                              </div>
                            </>
                          )}
                          <input name="location" placeholder="สถานที่/ลิงก์" defaultValue={s.location ?? ''} />
                          <SubmitButton className="btn sm mt">บันทึก</SubmitButton>
                        </form>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {slots.some((s) => s.status === 'available' || s.status === 'closed') && (
          <div className="row mt">
            <form action={toggleSlot} className="shrink">
              <input type="hidden" name="ret" value={ret} /><input type="hidden" name="open" value="0" />
              {slots.filter((s) => s.is_open && s.status !== 'expired').map((s) => <input key={s.id} type="hidden" name="id" value={s.id} />)}
              <SubmitButton className="btn ghost sm" confirm="ปิดการจองทุกช่วงที่แสดงอยู่?">ปิดจองทั้งหมดที่แสดง</SubmitButton>
            </form>
            <form action={toggleSlot} className="shrink">
              <input type="hidden" name="ret" value={ret} /><input type="hidden" name="open" value="1" />
              {slots.filter((s) => !s.is_open && s.status !== 'expired').map((s) => <input key={s.id} type="hidden" name="id" value={s.id} />)}
              <SubmitButton className="btn ghost sm" confirm="เปิดการจองทุกช่วงที่แสดงอยู่?">เปิดจองทั้งหมดที่แสดง</SubmitButton>
            </form>
          </div>
        )}
      </main>
    </>
  );
}
