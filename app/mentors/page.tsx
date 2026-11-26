import Link from 'next/link';
import { db } from '@/lib/db';
import { requireMember } from '@/lib/session';
import { UserNav } from '@/components/UserNav';
import { Avatar } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function MentorsPage() {
  const me = await requireMember();
  const [{ data: mentors }, { data: free }] = await Promise.all([
    db().from('mentors').select('id,name,photo_url,bio').eq('is_active', true).order('name'),
    db().from('slot_view').select('mentor_id').eq('status', 'available').gt('start_at', new Date().toISOString()),
  ]);
  const count: Record<string, number> = {};
  for (const r of free ?? []) count[r.mentor_id] = (count[r.mentor_id] ?? 0) + 1;

  return (
    <>
      <UserNav active="book" name={me.name} />
      <main className="container">
        <div className="row" style={{ alignItems: 'center' }}>
          <h1 style={{ margin: 0 }}>เลือก Mentor</h1>
          <div className="shrink"><Link className="btn secondary" href="/calendar">ดูตารางทุก Mentor</Link></div>
        </div>
        <p className="muted">คลิกที่ Mentor เพื่อดูตารางเวลาว่างรายเดือน</p>
        {(mentors ?? []).length === 0 && <div className="card muted">ยังไม่มี Mentor ในระบบ</div>}
        <div className="grid g3">
          {(mentors ?? []).map((m) => (
            <Link key={m.id} href={`/calendar?mentor=${m.id}`} className="card mentor-card">
              <Avatar name={m.name} url={m.photo_url} />
              <strong>{m.name}</strong>
              {m.bio && <span className="small muted">{m.bio}</span>}
              <span className={`badge ${count[m.id] ? 'b-available' : 'b-closed'}`}>
                {count[m.id] ? `ว่าง ${count[m.id]} ช่วง` : 'ยังไม่มีช่วงว่าง'}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
