import { SLOT_STATUS, BOOKING_STATUS, MEMBER_STATUS } from '@/lib/status';

export function Flash({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const ok = typeof sp.ok === 'string' ? sp.ok : null;
  const err = typeof sp.err === 'string' ? sp.err : null;
  return (
    <>
      {ok && <div className="alert ok">{ok}</div>}
      {err && <div className="alert err">{err}</div>}
    </>
  );
}

export function SlotBadge({ s }: { s: string }) {
  return <span className={`badge b-${s}`}>{SLOT_STATUS[s] ?? s}</span>;
}
export function BookingBadge({ s }: { s: string }) {
  return <span className={`badge b-${s}`}>{BOOKING_STATUS[s] ?? s}</span>;
}
export function MemberBadge({ s }: { s: string }) {
  return <span className={`badge b-${s}`}>{MEMBER_STATUS[s] ?? s}</span>;
}

export function Avatar({ name, url, size }: { name: string; url?: string | null; size?: 'sm' }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`avatar ${size ?? ''}`} />;
  }
  return <div className={`avatar ${size ?? ''}`}>{name.trim().charAt(0).toUpperCase()}</div>;
}

export function LocationText({ loc }: { loc: string | null | undefined }) {
  if (!loc) return <span className="muted">-</span>;
  if (/^https?:\/\//i.test(loc)) {
    return <a href={loc} target="_blank" rel="noopener noreferrer">{loc}</a>;
  }
  return <>{loc}</>;
}

/** โลโก้มุมขวาบนของแถบเมนู */
export function NavLogo() {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="Channel Academy" className="nav-logo" width={44} height={44} />;
}

/** โลโก้ + ชื่อเว็บในหน้า Log-in */
export function BrandHero() {
  return (
    <div className="brand-hero">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="Channel Academy" width={132} height={132} />
      <h1>Meet-Mentor</h1>
    </div>
  );
}
