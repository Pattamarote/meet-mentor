import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import { Suspense } from 'react';
import { NavProgress } from '@/components/NavProgress';
import './globals.css';

const font = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '600', '700'], display: 'swap' });

export const metadata: Metadata = { title: 'Meet-Mentor | นัดหมาย Mentor', description: 'ระบบนัดหมาย Mentor', icons: { icon: '/logo.png', apple: '/logo.png' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={font.className}><Suspense fallback={null}><NavProgress /></Suspense>{children}</body>
    </html>
  );
}
