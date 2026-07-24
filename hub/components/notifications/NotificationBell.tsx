'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  fetchNotifications,
  fetchUnreadCount,
  peekUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  respondToNotification,
  type NotificationRow,
} from '@/lib/notifications/client';
import { formatBadgeCount, isActionable, type NotificationResponse } from '@/lib/notifications/format';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationActions } from '@/components/notifications/NotificationActions';

/**
 * FEAT-H030 — the shell notification bell (NTF-2/3/7). A **FIM-only** affordance
 * (NB-8: notifications are FIM-only; a Mist gets no bell — gate on identity
 * status, never a role string). The badge counts unread via the FEAT-PD013
 * `get_own_unread_notification_count` contract; the dropdown shows the recent
 * 15 (unread visually distinct), marks-on-click, marks-all, and links to the
 * full inbox. Fetch-based, best-effort chrome — a failed read degrades to a
 * plain bell, never an error surface. No sockets/polling until N-C (ADR-U039).
 * 'use client' — reads auth state (Hub gotcha: `useAuth` no-ops on the server).
 */
const RECENT_LIMIT = 15;

export function NotificationBell() {
  const { identity } = useAuth();
  const router = useRouter();
  const [unread, setUnread] = useState<number>(() => peekUnreadCount() ?? 0);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  /** STORY-1: the reason a dispatch failed, pinned to the row it belongs to —
   *  a rollback with no reason is indistinguishable from "nothing happened". */
  const [actionError, setActionError] = useState<{ id: string; message: string } | null>(null);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const loadCount = useCallback(() => {
    fetchUnreadCount()
      .then((n) => {
        if (mountedRef.current) setUnread(n);
      })
      .catch(() => {
        if (mountedRef.current) setUnread(0); // best-effort chrome
      });
  }, []);

  useEffect(() => {
    if (identity !== 'fim') return;
    loadCount();
    const onRefresh = () => loadCount();
    window.addEventListener('refreshNavigation', onRefresh);
    return () => window.removeEventListener('refreshNavigation', onRefresh);
  }, [identity, loadCount]);

  const toggle = useCallback(() => {
    setOpen((wasOpen) => {
      const next = !wasOpen;
      if (next) {
        fetchNotifications({ limit: RECENT_LIMIT })
          .then((r) => {
            if (mountedRef.current) setRows(r);
          })
          .catch(() => {
            if (mountedRef.current) setRows([]);
          });
      }
      return next;
    });
  }, []);

  const activate = useCallback(
    async (row: NotificationRow) => {
      // Optimistic: drop unread visually + decrement the badge, then navigate.
      if (!row.is_read) {
        setRows((cur) =>
          cur ? cur.map((r) => (r.id === row.id ? { ...r, is_read: true } : r)) : cur,
        );
        setUnread((n) => Math.max(0, n - 1));
      }
      try {
        await markNotificationRead(row.id);
      } catch {
        loadCount(); // reconcile on failure — never leave the badge diverged
      }
      if (row.group_id) {
        router.push(`/groups/${row.group_id}`);
        setOpen(false);
      }
    },
    [loadCount, router],
  );

  const markAll = useCallback(async () => {
    setUnread(0);
    setRows((cur) => (cur ? cur.map((r) => ({ ...r, is_read: true })) : cur));
    try {
      await markAllNotificationsRead();
    } catch {
      loadCount();
    }
  }, [loadCount]);

  // Typed-action response (NTF-5/6): optimistically resolve the row (buttons
  // vanish via isActionable=false), then reconcile the outcome + resolver from
  // the server; roll back to actionable on failure. The handler swallows errors
  // so NotificationActions always resolves.
  const respond = useCallback(
    async (row: NotificationRow, response: NotificationResponse) => {
      const outcome = response.accept ? 'accepted' : 'declined';
      const wasUnread = !row.is_read;
      setActionError((cur) => (cur?.id === row.id ? null : cur));
      setRows((cur) =>
        cur ? cur.map((r) => (r.id === row.id ? { ...r, action_taken: outcome, is_read: true } : r)) : cur,
      );
      if (wasUnread) setUnread((n) => Math.max(0, n - 1));
      try {
        const result = await respondToNotification(row, response.accept);
        setRows((cur) =>
          cur
            ? cur.map((r) =>
                r.id === row.id
                  ? {
                      ...r,
                      action_taken: result.outcome ?? outcome,
                      action_data: {
                        ...(r.action_data ?? {}),
                        ...(result.resolved_by_name ? { resolved_by_name: result.resolved_by_name } : {}),
                      },
                    }
                  : r,
              )
            : cur,
        );
      } catch (e) {
        setRows((cur) =>
          cur ? cur.map((r) => (r.id === row.id ? { ...r, action_taken: null, is_read: row.is_read } : r)) : cur,
        );
        setActionError({
          id: row.id,
          message: e instanceof Error && e.message ? e.message : 'That response could not be sent.',
        });
        loadCount();
      }
    },
    [loadCount],
  );

  if (identity !== 'fim') return null;

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unread > 0 ? `Notifications — ${unread} unread` : 'Notifications'}
        data-testid="notification-bell"
        onClick={toggle}
        className="relative rounded-full p-2 hover:bg-gray-100"
      >
        <Bell className="h-5 w-5 text-gray-600" />
        {unread > 0 && (
          <span
            data-testid="notification-unread-badge"
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-semibold text-white"
          >
            {formatBadgeCount(unread)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          data-testid="notification-dropdown"
          className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-sm font-semibold text-gray-900">Notifications</span>
            <button
              type="button"
              onClick={markAll}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {rows === null ? (
              <li className="px-3 py-6 text-center text-sm text-gray-400">Loading…</li>
            ) : rows.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-gray-400">
                You’re all caught up.
              </li>
            ) : (
              rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => activate(row)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-50 ${row.is_read ? '' : 'bg-indigo-50/40'}`}
                  >
                    <NotificationItem row={row} />
                  </button>
                  {isActionable(row) && (
                    <div className="px-3 pb-2">
                      <NotificationActions row={row} onRespond={respond} />
                    </div>
                  )}
                  {actionError?.id === row.id && (
                    <p
                      role="alert"
                      data-testid={`notification-action-error-${row.id}`}
                      className="px-3 pb-2 text-xs text-red-600"
                    >
                      {actionError.message}
                    </p>
                  )}
                </li>
              ))
            )}
          </ul>
          <div className="border-t border-gray-100 px-3 py-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
