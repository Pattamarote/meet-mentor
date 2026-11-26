import Link from 'next/link';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/session';
import { AdminNav } from '@/components/AdminNav';
import { Flash, MemberBadge } from '@/components/ui';
import { SubmitButton } from '@/components/SubmitButton';
import { clean } from '@/lib/bookings';
import { fmtDateTime } from '@/lib/time';
import { addMember, updateMember } from './actions';

export const dynamic = 'force-dynamic';

export default async function MembersAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const q = clean(sp.q ?? '');
  const status = ['pending', 'active', 'suspended'].includes(sp.status ?? '') ? sp.status : '';
  let query = db().from('members').select('id,employee_code,name,status,created_at,locked_until', { count: 'exact' }).order('status').order('employee_code').limit(300);
  if (q) query = query.or(`name.ilike.%${q}%,employee_code.ilike.%${q}%`);
  if (status) query = query.eq('status', status);
  const { data, count } = await query;
  const { count: pending } = await db().from('members').select('id', { count: 'exact', head: true }).eq('status', 'pending');
  const ret = `/admin/members?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}) })}`;

  return (
    <>
      <AdminNav active="members" username={me.username} />
      <main className="container">
        <h1>ผู้ใช้งาน</h1>
        <Flash sp={sp} />
        {!!pending && <div className="alert info">มีบัญชีรออนุมัติ {pending} บัญชี <Link href="/admin/members?status=pending">ดูรายการ</Link></div>}
        <div className="grid g2">
          <form action={addMember} className="card">
            <h2 style={{ marginTop: 0 }}>เพิ่มสมาชิก</h2>
            <input type="hidden" name="ret" value={ret} />
            <label>ชื่อ-นามสกุล</label><input name="name" required />
            <div className="row">
              <div><label>รหัสพนักงาน (5-6 หลัก)</label><input name="code" inputMode="numeric" pattern="[0-9]{5,6}" maxLength={6} required /></div>
              <div><label>รหัสผ่าน (4 หลัก)</label><input name="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} required /></div>
            </div>
            <div className="mt"><SubmitButton>เพิ่มสมาชิก</SubmitButton></div>
          </form>
          <div className="card">
            <h2 style={{ marginTop: 0 }}>อัปโหลดสมาชิกจาก Excel</h2>
            <p className="small muted">เพิ่มสมาชิกทีละหลายคนจากไฟล์ .xlsx (ชื่อ, รหัสพนักงาน, รหัสผ่าน)</p>
            <Link className="btn secondary" href="/admin/members/import">อัปโหลดไฟล์</Link>
          </div>
        </div>

        <form className="card row" method="get">
          <div><label>ค้นหาด้วยรหัสพนักงานหรือชื่อ</label><input name="q" defaultValue={q} /></div>
          <div>
            <label>สถานะ</label>
            <select name="status" defaultValue={status}>
              <option value="">ทั้งหมด</option><option value="pending">รออนุมัติ</option><option value="active">เปิดใช้งาน</option><option value="suspended">ระงับการใช้งาน</option>
            </select>
          </div>
          <div className="shrink"><button className="btn">ค้นหา</button></div>
        </form>

        <h2>รายชื่อ ({count ?? 0}{(count ?? 0) > 300 ? ' — แสดง 300 รายการแรก' : ''})</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>รหัสพนักงาน</th><th>ชื่อ</th><th>สถานะ</th><th>สร้างเมื่อ</th><th>จัดการ</th></tr></thead>
            <tbody>
              {(data ?? []).length === 0 && <tr><td colSpan={5} className="muted">ไม่พบผู้ใช้งาน</td></tr>}
              {(data ?? []).map((m) => (
                <tr key={m.id}>
                  <td>{m.employee_code}</td>
                  <td>{m.name}</td>
                  <td><MemberBadge s={m.status} />{m.locked_until && new Date(m.locked_until) > new Date() && <div className="small" style={{ color: 'var(--bad)' }}>ล็อกชั่วคราว (กรอกรหัสผิด)</div>}</td>
                  <td className="small">{fmtDateTime(m.created_at)}</td>
                  <td>
                    <div className="row" style={{ gap: 4 }}>
                      {m.status !== 'active' && (
                        <form action={updateMember} className="shrink">
                          <input type="hidden" name="ret" value={ret} /><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value="active" />
                          <SubmitButton className="btn sm" pendingText="...">{m.status === 'pending' ? 'อนุมัติ' : 'เปิดใช้งาน'}</SubmitButton>
                        </form>
                      )}
                      {m.status !== 'suspended' && (
                        <form action={updateMember} className="shrink">
                          <input type="hidden" name="ret" value={ret} /><input type="hidden" name="id" value={m.id} /><input type="hidden" name="status" value="suspended" />
                          <SubmitButton className="btn ghost sm" pendingText="..." confirm={`ระงับการใช้งาน ${m.name}?`}>ระงับ</SubmitButton>
                        </form>
                      )}
                    </div>
                    <details>
                      <summary className="small">แก้ไข / ตั้งรหัสผ่านใหม่</summary>
                      <form action={updateMember} style={{ minWidth: 220 }}>
                        <input type="hidden" name="ret" value={ret} /><input type="hidden" name="id" value={m.id} />
                        <label>ชื่อ</label><input name="name" defaultValue={m.name} required />
                        <label>รหัสพนักงาน</label><input name="code" defaultValue={m.employee_code} pattern="[0-9]{5,6}" required />
                        <label>รหัสผ่านใหม่ 4 หลัก (เว้นว่างถ้าไม่เปลี่ยน)</label><input name="pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} />
                        <p className="small muted">ก่อนตั้งรหัสใหม่ กรุณายืนยันตัวตนผู้ใช้ เช่น ตรวจบัตรพนักงานหรือโทรกลับเบอร์ในระบบ HR</p>
                        <SubmitButton className="btn sm">บันทึก</SubmitButton>
                      </form>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
