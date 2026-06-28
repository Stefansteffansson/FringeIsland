import type { ReactNode } from 'react';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { AccountMenu } from '@/components/shell/AccountMenu';

/**
 * The authenticated Hub shell (navigation/chrome — product-owned). Mounts the
 * V3 notification-bell seam and the FIM-only account menu (FEAT-H005: profile +
 * sign-out); the menu gates itself on identity status.
 */
export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <span className="text-lg font-semibold text-gray-900">
          {title ?? 'FringeIsland — The Hub'}
        </span>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
