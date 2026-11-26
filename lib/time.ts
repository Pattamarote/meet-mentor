// เวลาไทย (UTC+7) — ไทยไม่มี Daylight Saving จึงใช้ offset คงที่ได้
export const TZ = 'Asia/Bangkok';
const OFFSET = '+07:00';

export function toUtc(date: string, time: string): Date {
  return new Date(`${date}T${time.length === 5 ? time + ':00' : time}${OFFSET}`);
}

const dFmt = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' });
const dLong = new Intl.DateTimeFormat('th-TH', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const tFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const isoD = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export const fmtDate = (d: string | Date) => dFmt.format(new Date(d));
export const fmtDateLong = (d: string | Date) => dLong.format(new Date(d));
export const fmtTime = (d: string | Date) => tFmt.format(new Date(d));
export const fmtDateTime = (d: string | Date) => `${fmtDate(d)} ${fmtTime(d)}`;
/** YYYY-MM-DD ตามเวลาไทย */
export const isoDate = (d: string | Date) => isoD.format(new Date(d));

export function currentMonth(): string {
  return isoDate(new Date()).slice(0, 7);
}

export function validMonth(m: string | undefined | null): string {
  return m && /^\d{4}-(0[1-9]|1[0-2])$/.test(m) ? m : currentMonth();
}

/** ขอบเขตเดือน (เวลาไทย) เป็น ISO UTC */
export function monthRange(month: string): { from: string; to: string } {
  const [y, m] = month.split('-').map(Number);
  const from = toUtc(`${month}-01`, '00:00');
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  const to = toUtc(`${ny}-${String(nm).padStart(2, '0')}-01`, '00:00');
  return { from: from.toISOString(), to: to.toISOString() };
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const idx = y * 12 + (m - 1) + delta;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

const monthNames = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${monthNames[m - 1]} ${y + 543}`;
}

export const isValidDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(toUtc(s, '00:00').getTime()) && isoDate(toUtc(s, '12:00')) === s;
export const isValidTime = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
