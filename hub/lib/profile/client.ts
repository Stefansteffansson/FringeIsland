/**
 * FEAT-H005 — the Hub's API-first profile client (IDN-4).
 *
 * The browser surface reads and writes the member's own identity-scope profile
 * ONLY through the paired FEAT-PC003 contract at `/api/profile/me` — never a
 * direct `supabase.from('users')` call (ADR-U009 / Hub CLAUDE.md narrow-exception
 * rule: the only direct Supabase contact is auth + the two realtime channels).
 * The authoritative validation + identity-scope gating live server-side in the
 * PC003 contract; this module is a thin transport that surfaces the contract's
 * error message on failure (never a silent swallow).
 */
import type { Profile, ProfilePatch } from '@/lib/profile/queries';
import { OverviewTransportError } from '@/lib/me/overview-shared';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

// Session cache (perf revision 2026-07-02): the measured Profile navigation hit
// /api/profile/me TWICE per visit (AccountMenu + page) and re-fetched on every
// nav because AppShell remounts per page. One shared in-flight/resolved promise
// removes both. Invalidation: session end (AuthContext drops it on sign-out /
// session expiry) or an explicit `invalidateProfileCache()`; a successful
// `updateProfile` re-seeds it with the contract's returned profile.
let cached: Promise<Profile> | null = null;

async function requestProfile(): Promise<Profile> {
  const res = await fetch('/api/profile/me');
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { profile: Profile };
  return data.profile;
}

/**
 * Read the caller's own profile via the FEAT-PC003 read contract.
 * Session-cached: concurrent callers share one request; a resolved profile is
 * reused across navigations. A FAILED read is never cached — the next caller
 * retries the contract (failures surface, never stick).
 */
export function fetchProfile(): Promise<Profile> {
  if (!cached) {
    const inFlight: Promise<Profile> = requestProfile().catch((err) => {
      if (cached === inFlight) cached = null;
      throw err;
    });
    cached = inFlight;
  }
  return cached;
}

/** Drop the session profile cache (sign-out / session end / account switch). */
export function invalidateProfileCache(): void {
  cached = null;
}

/** ADR-U042: adopt the bootstrap bundle's profile slice as the session cache.
 *  A bundle TRANSPORT failure falls back to the standalone contract read
 *  (guardrail 3); a FAILED read is never cached — same rule as fetchProfile. */
export function adoptProfileRead(read: Promise<Profile>): void {
  const inFlight: Promise<Profile> = read
    .catch((err) => {
      if (err instanceof OverviewTransportError) return requestProfile();
      throw err;
    })
    .catch((err) => {
      if (cached === inFlight) cached = null;
      throw err;
    });
  inFlight.catch(() => {}); // may go unconsumed; never unhandled
  cached = inFlight;
}

/** Update the caller's own identity-scope fields via the FEAT-PC003 write contract. */
export async function updateProfile(patch: ProfilePatch): Promise<Profile> {
  const res = await fetch('/api/profile/me', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { profile: Profile };
  // The write contract returns the updated row — seed the cache so the next
  // read (AccountMenu's refreshNavigation reload, later navs) is instant + fresh.
  cached = Promise.resolve(data.profile);
  return data.profile;
}

/**
 * The name a member is shown as — nickname or real name, per their
 * `display_preference`. Pure; the same rule the platform's
 * `sync_display_name_to_personal_group` trigger applies to the personal-group
 * name, so the Hub label and the group name stay consistent.
 */
export function displayLabel(
  p: Pick<Profile, 'display_preference' | 'nickname' | 'full_name'>,
): string {
  return p.display_preference === 'real_name' ? p.full_name : p.nickname;
}
