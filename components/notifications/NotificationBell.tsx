'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/lib/notifications/NotificationContext';
import type { Notification } from '@/lib/notifications/NotificationContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function notificationHref(notification: Notification): string {
  const { payload, group_id } = notification;

  // Navigate to the relevant page based on payload or group_id
  if (payload && typeof payload === 'object') {
    if ('group_id' in payload && payload.group_id) {
      return `/groups/${payload.group_id}`;
    }
    if ('journey_id' in payload && payload.journey_id) {
      return `/journeys/${payload.journey_id}`;
    }
  }

  if (group_id) {
    return `/groups/${group_id}`;
  }

  // Default fallback
  if (
    notification.type === 'group_invitation' ||
    notification.type === 'invitation_accepted' ||
    notification.type === 'invitation_declined'
  ) {
    return '/invitations';
  }

  return '/notifications';
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onAction,
}: {
  notification: Notification;
  onAction: (notification: Notification) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onAction(notification)}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-start gap-3 ${
        !notification.is_read ? 'bg-blue-50 hover:bg-blue-50/70' : ''
      }`}
    >
      {/* Unread dot */}
      <div className="flex-shrink-0 mt-1.5">
        {!notification.is_read ? (
          <div className="w-2 h-2 rounded-full bg-blue-500" aria-label="Unread" />
        ) : (
          <div className="w-2 h-2" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug truncate ${
            !notification.is_read ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
          }`}
        >
          {notification.title}
        </p>
        {notification.body && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.body}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.created_at)}</p>
      </div>
    </button>
  );
}

// ─── Bell Icon SVG ────────────────────────────────────────────────────────────

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─── NotificationBell ─────────────────────────────────────────────────────────

export default function NotificationBell() {
  const router = useRouter();
  const { unreadCount, notifications, isLoading, markAsRead, markAllAsRead } =
    useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read first (no-op if already read)
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }

    const href = notificationHref(notification);
    setIsOpen(false);
    router.push(href);
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    await markAllAsRead();
  };

  // Show only the 10 most recent in the dropdown
  const recentNotifications = notifications.slice(0, 10);

  return (
    <div ref={containerRef} className="relative">
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={
          unreadCount > 0
            ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
            : 'Notifications'
        }
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative p-2 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
      >
        <BellIcon className="w-5 h-5" />

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold pointer-events-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden"
          role="dialog"
          aria-label="Notifications panel"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Body */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              /* Loading state */
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : recentNotifications.length === 0 ? (
              /* Empty state */
              <div className="text-center py-10 px-4">
                <BellIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">
                  You'll see activity from your groups here
                </p>
              </div>
            ) : (
              /* Notification list */
              <div role="list">
                {recentNotifications.map((notification) => (
                  <div key={notification.id} role="listitem">
                    <NotificationItem
                      notification={notification}
                      onAction={handleNotificationClick}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isLoading && (
            <div className="border-t border-gray-100 px-4 py-2.5">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
