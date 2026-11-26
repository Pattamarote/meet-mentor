import Link from 'next/link';
import { NavLogo } from '@/components/ui';
import { logoutAction } from '@/app/login/actions';

export function UserNav({ active, name }: { active: 'book' | 'mine'; name: string }) {
  return (
    <header className="topbar">
      <div className="inner">
        <Link href="/mentors" className="logo"><NavLogo /><span>Meet-Mentor<small>สวัสดี {name}</small></span></Link>
        <nav className="nav">
          <Link href="/mentors" className={active === 'book' ? 'active' : ''}>จอง Session</Link>
          <Link href="/my-bookings" className={active === 'mine' ? 'active' : ''}>รายการจองของฉัน</Link>
          <form action={logoutAction} className="inline-form"><button type="submit">ออกจากระบบ</button></form>
        </nav>
      </div>
    </header>
  );
}
