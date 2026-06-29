import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { AccountStateProvider } from '@/lib/account/AccountStateContext';
import { AccountStateGate } from '@/components/account/AccountStateGate';

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
          <AccountStateProvider>
            <AccountStateGate>{children}</AccountStateGate>
          </AccountStateProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
