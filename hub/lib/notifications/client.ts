/**
 * FEAT-H030 — the Hub's API-first notifications client (NTF-1/2/3/7, N-A).
 *
 * The browser reaches notifications ONLY through the `/api/notifications` BFF
 * (ADR-U009 / the Hub narrow-exception rule). The unread count rides a session
 * cache (ADR-U042/U043): `peekUnreadCount` paints the last resolved badge
 * instantly on revisit, `fetchUnreadCount()` always revalidates, a failed read
 * is never cached, and every read-state mutation drops the cache so a stale
 * badge can never paint after a write. No sockets, no polling — N-C brings the
 * ADR-U039 live layer; until then the badge refreshes on mount and own actions.
 */
import type { NotificationRow, NotificationCursor } from '@/lib/notifications/queries';
import { registerCacheInvalidator } from '@/lib/auth/cache-registry';

export type { NotificationRow, NotificationCursor } from '@/lib/notifications/queries';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

// --- unread-count session cache ----------------------------------------------

let cachedUnread: number | null = null;
let unreadInFlight: Promise<number> | null = null;

/** The last resolved unread count this session — instant revisit badge paint. */
export function peekUnreadCount(): number | null {
  return cachedUnread;
}

export function fetchUnreadCount(): Promise<number> {
  if (unreadInFlight) return unreadInFlight;
  const inFlight: Promise<number> = fetch('/api/notifications/unread-count')
    .then(async (res) => {
      if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
      const data = (await res.json()) as { count: number };
      return data.count;
    })
    .then((n) => {
      cachedUnread = n;
      return n;
    })
    .finally(() => {
      if (unreadInFlight === inFlight) unreadInFlight = null;
    });
  inFlight.catch(() => {}); // never unhandled if a caller drops it
  unreadInFlight = inFlight;
  return inFlight;
}

/** Drop the session count cache (sign-out / session end / after a write). */
export function invalidateNotificationsCache(): void {
  cachedUnread = null;
  unreadInFlight = null;
}
registerCacheInvalidator(invalidateNotificationsCache);

// --- transports ---------------------------------------------------------------

export function fetchNotifications(options?: {
  before?: NotificationCursor;
  limit?: number;
}): Promise<NotificationRow[]> {
  const params = new URLSearchParams();
  if (options?.limit != null) params.set('limit', String(options.limit));
  if (options?.before) {
    params.set('before_created_at', options.before.created_at);
    params.set('before_id', options.before.id);
  }
  const qs = params.toString();
  return fetch(`/api/notifications${qs ? `?${qs}` : ''}`)
    .then(async (res) => {
      if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
      const data = (await res.json()) as { notifications: NotificationRow[] };
      return data.notifications;
    });
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const res = await fetch(
    `/api/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: 'POST' },
  );
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  invalidateNotificationsCache();
}

export async function markAllNotificationsRead(): Promise<number> {
  const res = await fetch('/api/notifications/read-all', { method: 'POST' });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { flipped: number };
  invalidateNotificationsCache();
  return data.flipped;
}
