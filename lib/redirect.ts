import 'server-only';
import { redirect } from 'next/navigation';

/** กลับไปหน้าเดิมพร้อมข้อความแจ้งเตือน */
export function back(path: string, msg: { ok?: string; err?: string }, extra?: Record<string, string>): never {
  const [base, qs] = path.split('?');
  const p = new URLSearchParams(qs ?? '');
  p.delete('ok'); p.delete('err');
  for (const [k, v] of Object.entries(extra ?? {})) p.set(k, v);
  if (msg.ok) p.set('ok', msg.ok);
  if (msg.err) p.set('err', msg.err);
  redirect(`${base}?${p.toString()}`);
}

/** อนุญาตให้ redirect กลับได้เฉพาะ path ภายในเว็บ */
export function safePath(p: FormDataEntryValue | null, fallback: string): string {
  const s = typeof p === 'string' ? p : '';
  return s.startsWith('/') && !s.startsWith('//') ? s : fallback;
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
