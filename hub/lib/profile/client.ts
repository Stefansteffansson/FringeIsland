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

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** Read the caller's own profile via the FEAT-PC003 read contract. */
export async function fetchProfile(): Promise<Profile> {
  const res = await fetch('/api/profile/me');
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { profile: Profile };
  return data.profile;
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
