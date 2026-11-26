import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

/** Supabase client ที่ใช้ service role — เรียกได้เฉพาะฝั่ง Server */
export function db(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('ยังไม่ได้ตั้งค่า SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
    client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}

/** ดึงข้อความ error ภาษาไทยจากฟังก์ชันในฐานข้อมูล */
export function dbMessage(err: { message?: string; code?: string } | null | undefined, fallback = 'เกิดข้อผิดพลาด กรุณาลองใหม่'): string {
  if (!err) return fallback;
  if (err.code === 'P0001' && err.message) return err.message;
  if (err.code === '23505') return 'ข้อมูลซ้ำกับที่มีอยู่แล้ว';
  if (err.code === '23P01') return 'ช่วงเวลาทับซ้อนกับช่วงที่มีอยู่แล้วของ Mentor ท่านนี้';
  if (err.code === '23514') return 'ข้อมูลไม่ถูกต้องตามรูปแบบที่กำหนด';
  if (err.code === '23503') return 'ไม่สามารถดำเนินการได้ เพราะมีข้อมูลอื่นอ้างอิงอยู่';
  console.error(err);
  return fallback;
}

export async function getSettings(): Promise<Record<string, string>> {
  const { data } = await db().from('settings').select('key,value');
  const out: Record<string, string> = {};
  for (const r of data ?? []) out[r.key] = r.value ?? '';
  return out;
}
