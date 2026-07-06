import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { AccountStateProvider } from '@/lib/account/AccountStateContext';
import { AccountStateGate } from '@/components/account/AccountStateGate';
import { OverviewBoot } from '@/components/shell/OverviewBoot';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FringeIsland — The Hub',
  description: 'Group-based personal development. Who am I? What do I want? How do I get there?',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {/* ADR-U042: FIRST child inside AuthProvider — same-commit effects run
              in traversal order, so the bootstrap bundle is adopted before
              AccountStateProvider / AccountMenu fire their own reads. */}
          <OverviewBoot />
          <AccountStateProvider>
            <AccountStateGate>{children}</AccountStateGate>
          </AccountStateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
