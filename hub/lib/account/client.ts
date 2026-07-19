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
import { OverviewTransportError } from '@/lib/me/overview-shared';
import { registerCacheInvalidator } from '@/lib/auth/cache-registry';

export type { AccountState, KnownAccountState } from '@/lib/account/queries';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

async function requestAccountState(): Promise<AccountState> {
  const res = await fetch('/api/account/state');
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { state: AccountState };
  return data.state;
}

// ADR-U042: the bootstrap bundle may hand this session ONE adopted read.
// Consume-once — AccountStateProvider reads once per session; a `reload()`
// re-read goes back to the standalone contract.
let adoptedState: Promise<AccountState> | null = null;

/** ADR-U042: adopt the bundle's account-state slice (transport failure → standalone). */
export function adoptAccountStateRead(read: Promise<AccountState>): void {
  const guarded = read.catch((err) => {
    if (err instanceof OverviewTransportError) return requestAccountState();
    throw err;
  });
  guarded.catch(() => {}); // may go unconsumed; never unhandled
  adoptedState = guarded;
}

/** Drop the adopted read (sign-out / session end / account switch). */
export function invalidateAccountStateAdoption(): void {
  adoptedState = null;
}
// COR-A W9 (AC-5): session-end drop via the auth-owned registry — auth never
// imports this module. Semantics in `lib/auth/cache-registry.ts`.
registerCacheInvalidator(invalidateAccountStateAdoption);

/** Read the caller's own account state via the FEAT-PC004 read contract.
 *  Consume-once adopted read first (ADR-U042), then the standalone contract. */
export async function fetchAccountState(): Promise<AccountState> {
  if (adoptedState) {
    const adopted = adoptedState;
    adoptedState = null;
    return adopted;
  }
  return requestAccountState();
}
