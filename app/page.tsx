import { redirect } from 'next/navigation';
import { readSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const s = await readSession();
  if (s?.role === 'admin') redirect('/admin');
  if (s?.role === 'member') redirect('/mentors');
  redirect('/login');
}
