'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationActions } from '@/components/notifications/NotificationActions';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { SkeletonList } from '@/components/ui/SkeletonList';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  respondToNotification,
  notificationTarget,
  type NotificationRow,
} from '@/lib/notifications/client';
import { isActionable, type NotificationResponse } from '@/lib/notifications/format';
import { NOTIFICATIONS_CHANGED_EVENT } from '@/lib/realtime/notifications-tenant';

/**
 * Tell the rest of the app the unread picture moved — the house cross-component
 * contract the bell listens on (`refreshNavigation` / `conversationsChanged`
 * shape). W-02: this page performed its mutations and never spoke, so the bell
 * badge sat stale until a reload. Every mutation here announces, including the
 * failed ones — a failed write is exactly when the bell most needs to re-read
 * rather than trust an optimistic flip.
 */
function announceChange(): void {
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
}

/**
 * FEAT-H030 STORY-3 — the `/notifications` inbox/history (NTF-3). The full
 * keyset-paginated history v1 never had (it shipped only a 15-item dropdown).
 * FIM-only (NB-8): a Mist deep-link redirects home, sessionless to login.
 * Read/unread rendered distinctly; actionable rows carry a status chip and
 * NO action buttons (Accept/Decline is N-B). Fetch-based (no sockets — N-C).
 */
const PAGE_SIZE = 20;

export default function NotificationsPage() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<NotificationRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
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

  useEffect(() => {
    if (authLoading) return;
    // Gate on identity status, never a role string (products-tier rule).
    if (!user || identity === 'sessionless') {
      router.replace('/login?redirect=/notifications');
      return;
    }
    if (identity === 'mist') {
      router.replace('/');
      return;
    }
    let active = true;
    fetchNotifications({ limit: PAGE_SIZE })
      .then((r) => {
        if (active && mountedRef.current) {
          setRows(r);
          setHasMore(r.length === PAGE_SIZE);
        }
      })
      .catch(() => {
        if (active && mountedRef.current) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [authLoading, user, identity, router]);

  const loadMore = useCallback(async () => {
    if (!rows || rows.length === 0) return;
    const last = rows[rows.length - 1];
    setLoadingMore(true);
    try {
      const next = await fetchNotifications({
        before: { created_at: last.created_at, id: last.id },
        limit: PAGE_SIZE,
      });
      if (mountedRef.current) {
        setRows((cur) => [...(cur ?? []), ...next]);
        setHasMore(next.length === PAGE_SIZE);
      }
    } catch {
      if (mountedRef.current) setFailed(true);
    } finally {
      if (mountedRef.current) setLoadingMore(false);
    }
  }, [rows]);

  const markAll = useCallback(async () => {
    setRows((cur) => (cur ? cur.map((r) => ({ ...r, is_read: true })) : cur));
    try {
      await markAllNotificationsRead();
    } catch {
      /* the optimistic flip stands; a later mount reconciles from the server */
    }
    announceChange();
  }, []);

  /**
   * W-01 — FEAT-H030:88 names both surfaces: *"when I click it (dropdown or
   * inbox)"*. The bell wrapped the shared row component in a button and this
   * page rendered it bare, so inbox rows were inert — no navigation, no
   * mark-read, no feedback, while still carrying the unread dot that reads as
   * interactive. Same contract as `NotificationBell.activate`.
   */
  const activate = useCallback(
    async (row: NotificationRow) => {
      if (!row.is_read) {
        // Optimistic: drop unread visually, then confirm with the server.
        setRows((cur) =>
          cur ? cur.map((r) => (r.id === row.id ? { ...r, is_read: true } : r)) : cur,
        );
        try {
          await markNotificationRead(row.id);
        } catch {
          /* the optimistic flip stands; the announce lets the bell reconcile */
        }
        announceChange();
      }
      // W-04: same target rule as the bell — an invitation leads to where it
      // can actually be answered, not to a page that only describes the group.
      const target = notificationTarget(row);
      if (target) router.push(target);
    },
    [router],
  );

  // Typed-action response (NTF-5/6) — optimistic resolve, reconcile the outcome
  // + resolver from the server, roll back to actionable on failure.
  const respond = useCallback(
    async (row: NotificationRow, response: NotificationResponse) => {
      const outcome = response.accept ? 'accepted' : 'declined';
      setActionError((cur) => (cur?.id === row.id ? null : cur));
      setRows((cur) =>
        cur ? cur.map((r) => (r.id === row.id ? { ...r, action_taken: outcome, is_read: true } : r)) : cur,
      );
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
          cur ? cur.map((r) => (r.id === row.id ? { ...r, action_taken: null } : r)) : cur,
        );
        setActionError({
          id: row.id,
          message: e instanceof Error && e.message ? e.message : 'That response could not be sent.',
        });
      }
      // Answering marks the row read too, so the badge moved either way — and
      // on failure the bell needs to re-read rather than trust the rollback.
      announceChange();
    },
    [],
  );

  if (authLoading || identity === 'sessionless' || identity === 'mist') {
    return (
      <AppShell title="Notifications">
        <SkeletonList rows={5} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Notifications">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-gray-900">Notifications</h1>
        {rows && rows.some((r) => !r.is_read) && (
          <button
            type="button"
            onClick={markAll}
            className="text-sm font-medium text-indigo-600 hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>

      {failed ? (
        <InlineError message="We couldn’t load your notifications. Please try again." />
      ) : rows === null ? (
        <SkeletonList rows={5} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No notifications yet"
          description="When something happens in your groups or journeys, you’ll see it here."
        />
      ) : (
        <>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {rows.map((row) => (
              <li
                key={row.id}
                data-testid={`notification-row-${row.id}`}
                data-read={row.is_read ? 'true' : 'false'}
              >
                <button
                  type="button"
                  onClick={() => activate(row)}
                  className={`w-full px-4 py-3 text-left hover:bg-gray-50 ${row.is_read ? '' : 'bg-indigo-50/40'}`}
                >
                  <NotificationItem row={row} />
                </button>
                {isActionable(row) && (
                  <div className="px-4 pb-3">
                    <NotificationActions row={row} onRespond={respond} />
                  </div>
                )}
                {actionError?.id === row.id && (
                  <p
                    role="alert"
                    data-testid={`notification-action-error-${row.id}`}
                    className="px-4 pb-3 text-xs text-red-600"
                  >
                    {actionError.message}
                  </p>
                )}
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load older'}
              </button>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
