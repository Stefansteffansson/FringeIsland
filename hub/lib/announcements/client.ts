/**
 * FEAT-H028 — the Hub's API-first announcements client (COM-8/9, Cycle C-D).
 *
 * The browser surface reaches announcements ONLY through the BFF
 * (`/api/groups/[id]/announcements`, `/api/announcements/platform`,
 * `/api/announcements/[id]/retract`) — never a direct table touch (ADR-U009 /
 * the Hub narrow-exception rule). Each scope rides its own session cache
 * (ADR-U043): a group-keyed cache like the forum client, plus a single
 * platform-scope cache for the home read (the ADR-U042 justified standalone
 * read). `peek*` paints the last resolved head instantly on revisit,
 * `fetch*()` always revalidates and concurrent first-page callers share one
 * in-flight request, a failed read is never cached, and every write drops the
 * group peek so a stale list can never paint after a mutation. Session end
 * drops the cache via the auth-owned registry (COR-A W9). No sockets, no
 * polling — the bell (A-NTF) is a later tenant.
 */
import type { Announcement, AnnouncementRetraction } from '@/lib/announcements/queries';
import { registerCacheInvalidator } from '@/lib/auth/cache-registry';
import { HttpStatusError } from '@/lib/http/status-error';

export type { Announcement, AuthorDisplay, AnnouncementRetraction } from '@/lib/announcements/queries';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

// --- group-scope session cache (B4) ------------------------------------------

const cachedGroup = new Map<string, Announcement[]>();
const groupInFlight = new Map<string, Promise<Announcement[]>>();

/** FEAT-H048 (the H046 pattern): the cache keys by VIEW — a wielded board (the
 *  acting group) and the personal board are different reads and never share an
 *  entry, so a hat switch can never paint the other view's head. */
function viewKey(groupId: string, acting?: string): string {
  return acting ? `${groupId}::${acting}` : groupId;
}

async function requestGroup(
  groupId: string,
  before?: string,
  acting?: string,
): Promise<Announcement[]> {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  if (acting) params.set('acting', acting);
  const query = params.toString();
  const qs = query ? `?${query}` : '';
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/announcements${qs}`);
  // Status carried so the section can branch honestly on a member-gated 403
  // (post-6-done fix 2026-08-14); write paths keep plain Errors.
  if (!res.ok)
    throw new HttpStatusError(await errorMessage(res, `Request failed (${res.status})`), res.status);
  const data = (await res.json()) as { announcements: Announcement[] };
  return data.announcements;
}

/** The last resolved first page of announcements for this group, in this view. */
export function peekGroupAnnouncements(groupId: string, acting?: string): Announcement[] | null {
  return cachedGroup.get(viewKey(groupId, acting)) ?? null;
}

/** First page (cached per view). Pass `before` for load-earlier — never cached,
 *  since it is a keyset continuation, not the head the peek paints. */
export function fetchGroupAnnouncements(
  groupId: string,
  before?: string,
  acting?: string,
): Promise<Announcement[]> {
  if (before) return requestGroup(groupId, before, acting);
  const key = viewKey(groupId, acting);
  const existing = groupInFlight.get(key);
  if (existing) return existing;
  const inFlight = requestGroup(groupId, undefined, acting)
    .then((rows) => {
      cachedGroup.set(key, rows);
      return rows;
    })
    .finally(() => {
      if (groupInFlight.get(key) === inFlight) groupInFlight.delete(key);
    });
  inFlight.catch(() => {});
  groupInFlight.set(key, inFlight);
  return inFlight;
}

/** Drop one group's announcements peek + in-flight (after a write). Drops EVERY
 *  view of the group — personal and wielded alike (FEAT-H048): the board
 *  changed for everyone, so a write through either view stales them all. */
export function dropGroupAnnouncements(groupId: string): void {
  for (const key of [...cachedGroup.keys()]) {
    if (key === groupId || key.startsWith(`${groupId}::`)) cachedGroup.delete(key);
  }
  for (const key of [...groupInFlight.keys()]) {
    if (key === groupId || key.startsWith(`${groupId}::`)) groupInFlight.delete(key);
  }
}

// --- platform-scope session cache (B4) ---------------------------------------

let cachedPlatform: Announcement[] | null = null;
let platformInFlight: Promise<Announcement[]> | null = null;

async function requestPlatform(before?: string): Promise<Announcement[]> {
  const qs = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await fetch(`/api/announcements/platform${qs}`);
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { announcements: Announcement[] };
  return data.announcements;
}

/** The last resolved first page of platform announcements this session. */
export function peekPlatformAnnouncements(): Announcement[] | null {
  return cachedPlatform;
}

export function fetchPlatformAnnouncements(before?: string): Promise<Announcement[]> {
  if (before) return requestPlatform(before);
  if (platformInFlight) return platformInFlight;
  const inFlight = requestPlatform()
    .then((rows) => {
      cachedPlatform = rows;
      return rows;
    })
    .finally(() => {
      if (platformInFlight === inFlight) platformInFlight = null;
    });
  inFlight.catch(() => {});
  platformInFlight = inFlight;
  return inFlight;
}

/** Drop every announcements cache (sign-out / session end). */
export function invalidateAnnouncementsCache(): void {
  cachedGroup.clear();
  groupInFlight.clear();
  cachedPlatform = null;
  platformInFlight = null;
}
registerCacheInvalidator(invalidateAnnouncementsCache);

// --- transports (each drops the group's peek: the board changed) -------------

export async function sendCommunityAnnouncement(
  groupId: string,
  title: string,
  body: string,
  acting?: string,
): Promise<Announcement> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // FEAT-H048: a wielded announce names the acting group; every limb of the
    // gate is the substrate's (the button is UX, the RPC is the gate).
    body: JSON.stringify({ title, body, ...(acting ? { acting } : {}) }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { announcement: Announcement };
  dropGroupAnnouncements(groupId);
  return data.announcement;
}

export async function retractAnnouncement(
  groupId: string,
  announcementId: string,
  acting?: string,
): Promise<AnnouncementRetraction> {
  const res = await fetch(`/api/announcements/${encodeURIComponent(announcementId)}/retract`, {
    method: 'POST',
    ...(acting
      ? {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ acting }),
        }
      : {}),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { retracted: AnnouncementRetraction };
  dropGroupAnnouncements(groupId);
  return data.retracted;
}
