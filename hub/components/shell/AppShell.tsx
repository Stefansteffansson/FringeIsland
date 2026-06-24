import type { ReactNode } from 'react';
import { NotificationBell } from '@/components/ui/NotificationBell';

/**
 * The authenticated Hub shell (navigation/chrome — product-owned). Mounts the
 * V3 notification-bell seam so it is present in the shell from line one.
 */
export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <span className="text-lg font-semibold text-gray-900">
          {title ?? 'FringeIsland — The Hub'}
        </span>
        <NotificationBell />
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
