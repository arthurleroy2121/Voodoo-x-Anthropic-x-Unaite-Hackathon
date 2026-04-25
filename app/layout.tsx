import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import { StoreHydrator } from '@/components/StoreHydrator';
import './globals.css';

const GeistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const GeistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Voodoo Creative Radar',
  description: 'From Market Signals to Testable Creatives',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans antialiased">
        <StoreHydrator />
        {children}
      </body>
    </html>
  );
}
