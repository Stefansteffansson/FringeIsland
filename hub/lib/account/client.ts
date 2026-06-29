/**
 * FEAT-H006 — the Hub's API-first account-state client (IDN-9).
 *
 * The browser surface reads the member's own account lifecycle state ONLY
 * through the paired FEAT-PC004 contract at `/api/account/state` — never a direct
 * `supabase.from('users')` call (ADR-U009 / Hub CLAUDE.md narrow-exception rule).
 * A thin transport that surfaces the contract's error on failure (never a silent
 * swallow); the authoritative read lives server-side in the PC004 contract.
 */
import type { AccountState } from '@/lib/account/queries';

export type { AccountState, KnownAccountState } from '@/lib/account/queries';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** Read the caller's own account state via the FEAT-PC004 read contract. */
export async function fetchAccountState(): Promise<AccountState> {
  const res = await fetch('/api/account/state');
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { state: AccountState };
  return data.state;
}
