'use client';
import { useEffect, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/** แถบโหลดด้านบน: แสดงทันทีเมื่อคลิกลิงก์หรือกดค้นหา จนหน้าใหม่พร้อม */
export function NavProgress() {
  const pathname = usePathname();
  const search = useSearchParams();
  const [on, setOn] = useState(false);

  useEffect(() => { setOn(false); }, [pathname, search]);

  useEffect(() => {
    const click = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement).closest('a');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
      if (url.pathname + url.search === location.pathname + location.search) return;
      setOn(true);
    };
    const submit = (e: SubmitEvent) => {
      const f = e.target as HTMLFormElement;
      if ((f.method || 'get').toLowerCase() === 'get') setOn(true);
    };
    document.addEventListener('click', click, true);
    document.addEventListener('submit', submit, true);
    return () => { document.removeEventListener('click', click, true); document.removeEventListener('submit', submit, true); };
  }, []);

  return on ? <div className="nav-progress" aria-hidden /> : null;
}
