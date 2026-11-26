'use server';
import { revalidatePath } from 'next/cache';
import { db, dbMessage } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { back } from '@/lib/redirect';

const P = '/admin/mentors';

async function uploadPhoto(file: FormDataEntryValue | null): Promise<string | null> {
  if (!file || typeof file === 'string' || file.size === 0) return null;
  if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) back(P, { err: 'รูปต้องเป็นไฟล์ PNG, JPG, WEBP หรือ GIF' });
  if (file.size > 3 * 1024 * 1024) back(P, { err: 'รูปต้องมีขนาดไม่เกิน 3MB' });
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await db().storage.from('mentor-photos').upload(path, file, { contentType: file.type });
  if (error) { console.error(error); back(P, { err: 'อัปโหลดรูปไม่สำเร็จ' }); }
  return db().storage.from('mentor-photos').getPublicUrl(path).data.publicUrl;
}

export async function saveMentor(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id') ?? '');
  const name = String(fd.get('name') ?? '').trim();
  const bio = String(fd.get('bio') ?? '').trim() || null;
  const default_location = String(fd.get('default_location') ?? '').trim() || null;
  if (!name) back(P, { err: 'กรุณากรอกชื่อ Mentor' });
  const photo = await uploadPhoto(fd.get('photo'));
  const row: Record<string, unknown> = { name, bio, default_location, updated_at: new Date().toISOString() };
  if (photo) row.photo_url = photo;
  if (fd.get('remove_photo') === '1') row.photo_url = null;
  const { error } = id
    ? await db().from('mentors').update(row).eq('id', id)
    : await db().from('mentors').insert(row);
  if (error) back(P, { err: error.code === '23505' ? 'มีชื่อ Mentor นี้แล้ว' : dbMessage(error) });
  revalidatePath(P);
  back(P, { ok: id ? `แก้ไขข้อมูล ${name} แล้ว` : `เพิ่ม Mentor ${name} แล้ว` });
}

export async function toggleMentor(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get('id') ?? '');
  const active = fd.get('active') === '1';
  const { error } = await db().from('mentors').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) back(P, { err: dbMessage(error) });
  back(P, { ok: active ? 'เปิดใช้งาน Mentor แล้ว' : 'ปิดใช้งาน Mentor แล้ว (ประวัติการจองเดิมยังอยู่ครบ — นัดที่จองไว้แล้วยังคงอยู่ กรุณาจัดการในหน้ารายการจอง)' });
}
