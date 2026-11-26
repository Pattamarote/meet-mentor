import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { AdminNav, ScheduleTabs } from '@/components/AdminNav';
import { Flash, Avatar } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { saveMentor, toggleMentor } from './actions';

export const dynamic = 'force-dynamic';

type M = { id: string; name: string; photo_url: string | null; bio: string | null; default_location: string | null; is_active: boolean };

function MentorForm({ m }: { m?: M }) {
  return (
    <form action={saveMentor}>
      {m && <input type="hidden" name="id" value={m.id} />}
      <div className="row">
        <div><label>ชื่อ Mentor *</label><input name="name" defaultValue={m?.name} required /></div>
        <div><label>ตำแหน่ง/ความเชี่ยวชาญ</label><input name="bio" defaultValue={m?.bio ?? ''} /></div>
      </div>
      <div className="row">
        <div><label>สถานที่/ลิงก์ประชุมเริ่มต้น</label><input name="default_location" defaultValue={m?.default_location ?? ''} placeholder="ห้องประชุม 3A หรือ https://..." /></div>
        <div><label>รูป Mentor (ไม่เกิน 3MB)</label><input type="file" name="photo" accept="image/png,image/jpeg,image/webp,image/gif" /></div>
      </div>
      {m?.photo_url && <label><input type="checkbox" name="remove_photo" value="1" /> ลบรูปเดิม</label>}
      <div className="mt"><SubmitButton>{m ? 'บันทึกการแก้ไข' : 'เพิ่ม Mentor'}</SubmitButton></div>
    </form>
  );
}

export default async function MentorsAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const { data } = await db().from('mentors').select('*').order('is_active', { ascending: false }).order('name');
  const mentors = (data ?? []) as M[];
  return (
    <>
      <AdminNav active="schedule" username={me.username} />
      <main className="container">
        <h1>จัดการตาราง Mentor</h1>
        <ScheduleTabs active="mentors" />
        <Flash sp={sp} />
        <div className="card">
          <h2 style={{ marginTop: 0 }}>เพิ่ม Mentor</h2>
          <MentorForm />
        </div>
        <h2>รายชื่อ Mentor ({mentors.length})</h2>
        <div className="grid">
          {mentors.map((m) => (
            <div key={m.id} className="card" style={{ opacity: m.is_active ? 1 : 0.7 }}>
              <div className="row" style={{ alignItems: 'center' }}>
                <div className="shrink"><Avatar name={m.name} url={m.photo_url} size="sm" /></div>
                <div>
                  <strong>{m.name}</strong> {m.is_active ? <span className="badge b-active">เปิดใช้งาน</span> : <span className="badge b-closed">ปิดใช้งาน</span>}
                  <div className="small muted">{m.bio}{m.default_location && ` · ${m.default_location}`}</div>
                </div>
                <div className="shrink row">
                  <a className="btn ghost sm" href={`/admin/schedule?mentor=${m.id}`}>ดูตาราง</a>
                  <form action={toggleMentor}>
                    <input type="hidden" name="id" value={m.id} />
                    <input type="hidden" name="active" value={m.is_active ? '0' : '1'} />
                    <SubmitButton className={`btn sm ${m.is_active ? 'ghost' : 'secondary'}`} confirm={m.is_active ? `ปิดใช้งาน ${m.name}? (User จะจองเพิ่มไม่ได้ ประวัติเดิมยังอยู่)` : undefined}>
                      {m.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                    </SubmitButton>
                  </form>
                </div>
              </div>
              <details className="mt"><summary>แก้ไขข้อมูล</summary><MentorForm m={m} /></details>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
