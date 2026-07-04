import type { ReactNode } from 'react';
import Link from 'next/link';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { AccountMenu } from '@/components/shell/AccountMenu';

/**
 * The authenticated Hub shell (navigation/chrome — product-owned). Mounts the
 * brand mark (top-left home link on every shell page — the entry greets a
 * signed-in FIM with "Continue to your groups"), the V3 notification-bell
 * seam, and the FIM-only account menu (FEAT-H005: profile + sign-out); the
 * menu gates itself on identity status. The mark is a text "FI" tile until a
 * real logo asset lands (public/ carries no image assets yet).
 */
export function AppShell({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            aria-label="FringeIsland — home"
            className="flex items-center gap-2"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white"
            >
              FI
            </span>
            <span className="hidden text-sm font-semibold text-indigo-700 sm:inline">
              FringeIsland
            </span>
          </Link>
          {title && (
            <>
              <span aria-hidden="true" className="text-gray-300">
                /
              </span>
              <span className="text-lg font-semibold text-gray-900">{title}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <AccountMenu />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
