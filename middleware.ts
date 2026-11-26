import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// ด่านแรกที่ edge: ไม่มี session ที่ถูกต้องก็ส่งไปหน้า login (ตรวจซ้ำในแต่ละหน้า/action อีกชั้น)
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdmin = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');
  const token = req.cookies.get('mm_session')?.value;
  let role: string | undefined;
  if (token && process.env.SESSION_SECRET) {
    try {
      const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET));
      role = payload.role as string;
    } catch {}
  }
  if (isAdmin && role !== 'admin') {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'ไม่มีสิทธิ์' }, { status: 401 });
    return NextResponse.redirect(new URL('/admin/login', req.url));
  }
  if (!isAdmin && role !== 'member') {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/((?!login).*)', '/admin', '/api/admin/:path*', '/mentors/:path*', '/mentors', '/calendar', '/book/:path*', '/my-bookings'],
};
