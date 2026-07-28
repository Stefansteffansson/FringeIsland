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

// --- typed-action dispatch (N-B, FEAT-H031) ----------------------------------

/** A notification's dedicated response-route segment, keyed by kind. NB-1
 *  thin-dispatch: the surface calls the existing dedicated handler's route, not
 *  a generic dispatcher. A kind absent here is not answerable in the bell. */
const DISPATCH_SEGMENTS: Record<string, string> = {
  stewardship_nomination: 'nomination-response', // FEAT-H017 route (reused)
  acting_invitation: 'acting-response', // FEAT-H031 route (new)
};

/** The full BFF response route for a notification kind + id, or null when the
 *  kind has no dispatch route (the row renders passively). */
export function notificationDispatchRoute(kind: string, id: string): string | null {
  const segment = DISPATCH_SEGMENTS[kind];
  return segment ? `/api/notifications/${encodeURIComponent(id)}/${segment}` : null;
}

/** Where a kind is ANSWERED, when it cannot be answered in the row itself.
 *
 *  W-04 (walk, 2026-07-27): `invitation_received` announces a decision only the
 *  recipient can make, but carries no Accept/Decline — and the group detail page
 *  it navigated to has no answering affordance for an invited viewer either, so
 *  the letter led to a dead end. Its answering surface is `MyInvitations`, which
 *  is mounted on `/groups`, and nothing said so. The pointer has to live here
 *  rather than in copy: notification copy is server-authored and never re-worded
 *  by the surface (W-03's copy law).
 *
 *  A kind that IS answerable in the row (see DISPATCH_SEGMENTS) needs no entry —
 *  it is answered where it is read. */
const ANSWER_PATHS: Record<string, string> = {
  invitation_received: '/groups',
};

/** Where activating a notification should take the member, or null to stay put.
 *  An explicit answering surface wins over the row's group, because arriving at
 *  a page that cannot answer the question is the defect W-04 named. */
export function notificationTarget(
  row: Pick<NotificationRow, 'kind' | 'group_id'>,
): string | null {
  const answerPath = ANSWER_PATHS[row.kind];
  if (answerPath) return answerPath;
  return row.group_id ? `/groups/${row.group_id}` : null;
}

export interface NotificationResponseResult {
  outcome?: string;
  resolved_by_name?: string | null;
  already?: boolean;
}

/** Submit an accept/decline response for an actionable notification: routes by
 *  kind to the dedicated handler and drops the unread cache on success. Throws
 *  (never silently no-ops) for an unroutable kind or a server error. */
export async function respondToNotification(
  row: Pick<NotificationRow, 'id' | 'kind'>,
  accept: boolean,
): Promise<NotificationResponseResult> {
  const route = notificationDispatchRoute(row.kind, row.id);
  if (!route) throw new Error(`No response route for notification kind "${row.kind}"`);
  const res = await fetch(route, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accept }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json().catch(() => ({}))) as NotificationResponseResult;
  invalidateNotificationsCache();
  // W-07 (gate walk 2026-07-27): announce it on the house channel. A
  // notification response is the one mutation class whose entire purpose is to
  // change something ELSEWHERE in the app, and it was the only one that never
  // said so — `messages/client.ts` fires this on every messages mutation and
  // `ProfileEditForm` on a profile edit. The observed cost: after accepting a
  // stewardship nomination the group page beneath the dropdown still listed a
  // member the accept had just removed, and withheld the role just granted.
  //
  // Deliberately AFTER the ok-check: a refused response must leave the view
  // alone. Refreshing on failure would repaint a page to assert a change that
  // never happened, which is worse than the staleness it set out to fix.
  window.dispatchEvent(new Event('refreshNavigation'));
  return data;
}
