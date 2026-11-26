import Link from 'next/link';
import { logoutAction } from '@/app/login/actions';

export function AdminNav({ active, username }: { active: 'schedule' | 'bookings' | 'members' | 'settings'; username: string }) {
  const item = (key: typeof active, href: string, label: string) => (
    <Link href={href} className={active === key ? 'active' : ''}>{label}</Link>
  );
  return (
    <header className="topbar">
      <div className="inner">
        <Link href="/admin/schedule" className="logo">meet-mentor<small>Admin · {username}</small></Link>
        <nav className="nav">
          {item('schedule', '/admin/schedule', 'จัดการตาราง Mentor')}
          {item('bookings', '/admin/bookings', 'รายการจองและรายงาน')}
          {item('members', '/admin/members', 'ผู้ใช้งาน')}
          {item('settings', '/admin/settings', 'ตั้งค่า')}
          <form action={logoutAction} className="inline-form"><button type="submit">ออกจากระบบ</button></form>
        </nav>
      </div>
    </header>
  );
}

export function ScheduleTabs({ active }: { active: 'slots' | 'mentors' | 'import' }) {
  return (
    <div className="nav" style={{ marginBottom: 12 }}>
      <Link href="/admin/schedule" className={active === 'slots' ? 'active' : ''}>ตารางเวลา</Link>
      <Link href="/admin/mentors" className={active === 'mentors' ? 'active' : ''}>รายชื่อ Mentor</Link>
      <Link href="/admin/schedule/import" className={active === 'import' ? 'active' : ''}>นำเข้าจาก Excel</Link>
    </div>
  );
}
