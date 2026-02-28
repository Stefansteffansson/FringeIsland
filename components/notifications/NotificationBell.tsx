'use client';

import { useEffect, useRef, useState } from 'react';
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

// ─── Action helpers ──────────────────────────────────────────────────────────

/** Map action_type → valid action labels */
const ACTION_LABELS: Record<string, { accept: string; decline: string }> = {
  accept_decline: { accept: 'Accept', decline: 'Decline' },
};

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

// ─── Notification Item ────────────────────────────────────────────────────────

function NotificationItem({
  notification,
  onAction,
  onSmartAction,
}: {
  notification: Notification;
  onAction: (notification: Notification) => void;
  onSmartAction: (id: string, action: string) => Promise<void>;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isActionable =
    notification.action_type &&
    !notification.action_taken &&
    !isExpired(notification.expires_at);

  const labels = notification.action_type
    ? ACTION_LABELS[notification.action_type]
    : null;

  const handleSmartAction = async (
    e: React.MouseEvent,
    action: string
  ) => {
    e.stopPropagation();
    setActionLoading(action);
    try {
      await onSmartAction(notification.id, action);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onAction(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onAction(notification);
      }}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 flex items-start gap-3 cursor-pointer ${
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
          <p className="text-xs text-gray-500 mt-0.5">{notification.body}</p>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo(notification.created_at)}</p>

        {/* Smart notification: action buttons */}
        {isActionable && labels && (
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={(e) => handleSmartAction(e, 'accepted')}
              className="px-3 py-1 text-xs font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === 'accepted' ? (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ...
                </span>
              ) : (
                labels.accept
              )}
            </button>
            <button
              type="button"
              disabled={actionLoading !== null}
              onClick={(e) => handleSmartAction(e, 'declined')}
              className="px-3 py-1 text-xs font-medium rounded-md bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === 'declined' ? (
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  ...
                </span>
              ) : (
                labels.decline
              )}
            </button>
          </div>
        )}

        {/* Already actioned badge */}
        {notification.action_taken && (
          <p className="text-xs mt-1.5 font-medium text-gray-500">
            {notification.action_taken === 'accepted' ? 'Accepted' : 'Declined'}
          </p>
        )}

        {/* Expired badge */}
        {notification.action_type &&
          !notification.action_taken &&
          isExpired(notification.expires_at) && (
            <p className="text-xs mt-1.5 font-medium text-amber-600">Expired</p>
          )}
      </div>
    </div>
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
  const {
    unreadCount,
    notifications,
    isLoading,
    markAsRead,
    markAllAsRead,
    handleAction,
  } = useNotifications();

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
    // Mark as read (no-op if already read)
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
  };

  const handleSmartAction = async (id: string, action: string) => {
    const result = await handleAction(id, action);
    if (!result.success) {
      console.error('[NotificationBell] Action failed:', result.error);
    }
    // Trigger nav refresh so group pages pick up role changes
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('refreshNavigation'));
    }
  };

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    await markAllAsRead();
  };

  // Show unread first, then recent read ones (up to 15 total)
  const unread = notifications.filter((n) => !n.is_read);
  const read = notifications.filter((n) => n.is_read);
  const recentNotifications = [...unread, ...read].slice(0, 15);

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
                      onSmartAction={handleSmartAction}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {!isLoading && notifications.length > 0 && (
            <div className="border-t border-gray-100 px-4 py-2.5 text-center">
              <button
                onClick={async () => {
                  await markAllAsRead();
                  setIsOpen(false);
                }}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors"
              >
                Dismiss all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
