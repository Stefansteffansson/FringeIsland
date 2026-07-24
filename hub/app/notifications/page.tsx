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
  markAllNotificationsRead,
  respondToNotification,
  type NotificationRow,
} from '@/lib/notifications/client';
import { isActionable, type NotificationResponse } from '@/lib/notifications/format';

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
  }, []);

  // Typed-action response (NTF-5/6) — optimistic resolve, reconcile the outcome
  // + resolver from the server, roll back to actionable on failure.
  const respond = useCallback(
    async (row: NotificationRow, response: NotificationResponse) => {
      const outcome = response.accept ? 'accepted' : 'declined';
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
      } catch {
        setRows((cur) =>
          cur ? cur.map((r) => (r.id === row.id ? { ...r, action_taken: null } : r)) : cur,
        );
      }
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
                className="px-4 py-3"
              >
                <NotificationItem row={row} />
                {isActionable(row) && <NotificationActions row={row} onRespond={respond} />}
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
