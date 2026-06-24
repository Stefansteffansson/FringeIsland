'use client';

import { Bell } from 'lucide-react';

/**
 * V3 Notifications seam — the notification-bell mount point in the shell.
 * Mount only: no delivery, inbox, or preference logic in the walking skeleton
 * (those are later A-NTF slices).
 */
export function NotificationBell() {
  return (
    <button
      type="button"
      aria-label="Notifications"
      data-testid="notification-bell"
      className="relative rounded-full p-2 hover:bg-gray-100"
    >
      <Bell className="h-5 w-5 text-gray-600" />
    </button>
  );
}
