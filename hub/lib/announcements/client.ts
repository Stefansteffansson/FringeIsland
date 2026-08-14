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

async function requestGroup(groupId: string, before?: string): Promise<Announcement[]> {
  const qs = before ? `?before=${encodeURIComponent(before)}` : '';
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/announcements${qs}`);
  // Status carried so the section can branch honestly on a member-gated 403
  // (post-6-done fix 2026-08-14); write paths keep plain Errors.
  if (!res.ok)
    throw new HttpStatusError(await errorMessage(res, `Request failed (${res.status})`), res.status);
  const data = (await res.json()) as { announcements: Announcement[] };
  return data.announcements;
}

/** The last resolved first page of announcements for this group. */
export function peekGroupAnnouncements(groupId: string): Announcement[] | null {
  return cachedGroup.get(groupId) ?? null;
}

/** First page (cached). Pass `before` for load-earlier — never cached, since it
 *  is a keyset continuation, not the head the peek paints. */
export function fetchGroupAnnouncements(groupId: string, before?: string): Promise<Announcement[]> {
  if (before) return requestGroup(groupId, before);
  const existing = groupInFlight.get(groupId);
  if (existing) return existing;
  const inFlight = requestGroup(groupId)
    .then((rows) => {
      cachedGroup.set(groupId, rows);
      return rows;
    })
    .finally(() => {
      if (groupInFlight.get(groupId) === inFlight) groupInFlight.delete(groupId);
    });
  inFlight.catch(() => {});
  groupInFlight.set(groupId, inFlight);
  return inFlight;
}

/** Drop one group's announcements peek + in-flight (after a write). */
export function dropGroupAnnouncements(groupId: string): void {
  cachedGroup.delete(groupId);
  groupInFlight.delete(groupId);
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
): Promise<Announcement> {
  const res = await fetch(`/api/groups/${encodeURIComponent(groupId)}/announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, body }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { announcement: Announcement };
  dropGroupAnnouncements(groupId);
  return data.announcement;
}

export async function retractAnnouncement(
  groupId: string,
  announcementId: string,
): Promise<AnnouncementRetraction> {
  const res = await fetch(`/api/announcements/${encodeURIComponent(announcementId)}/retract`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  const data = (await res.json()) as { retracted: AnnouncementRetraction };
  dropGroupAnnouncements(groupId);
  return data.retracted;
}
