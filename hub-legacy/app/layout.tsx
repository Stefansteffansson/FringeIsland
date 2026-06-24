import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { NotificationProvider } from '@/lib/notifications/NotificationContext';
import { MessagingProvider } from '@/lib/messaging/MessagingContext';
import Navigation from '@/components/Navigation';
import ErrorBoundary from '@/components/ui/ErrorBoundary';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FringeIsland - Transform Through Journey',
  description: 'Educational and training platform for personal development, leadership training, and team/organizational development',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <AuthProvider>
            <NotificationProvider>
              <MessagingProvider>
                <Navigation />
                {children}
              </MessagingProvider>
            </NotificationProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
