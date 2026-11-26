import type { Metadata, Viewport } from 'next';
import { Noto_Sans_Thai } from 'next/font/google';
import './globals.css';

const font = Noto_Sans_Thai({ subsets: ['thai', 'latin'], weight: ['400', '600', '700'], display: 'swap' });

export const metadata: Metadata = { title: 'meet-mentor | นัดหมาย Mentor', description: 'ระบบนัดหมาย Mentor' };
export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={font.className}>{children}</body>
    </html>
  );
}
