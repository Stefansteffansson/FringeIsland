/**
 * FEAT-PC004 — account-state read contract (IDN-9).
 *
 * The platform-tier own-row read of the caller's account lifecycle state
 * (active / suspended / decommissioned), surfaced API-first at
 * `GET /api/account/state` and consumed by the Hub (FEAT-H006). Unlike the
 * profile read (FEAT-PC003), this CANNOT be a plain RLS-scoped
 * `.from('users').select()`: the `users_select_active` policy hides a
 * switched-off member's own row, so a suspended/decommissioned member would read
 * nothing. The read therefore goes through the `get_own_account_state()`
 * SECURITY DEFINER function, which bypasses that visibility filter for the
 * caller's OWN row only (auth.uid()-pinned, no target parameter).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Known lifecycle labels today. `state` is an OPEN string — new labels arrive
 * without a breaking change, and consumers render an unknown state as a safe
 * default (ADR-U018 spirit). `'paused'` joined at C-F (ADR-U050): the
 * member-origin off state, only ever produced by self-pause.
 */
export type KnownAccountState = 'active' | 'paused' | 'suspended' | 'decommissioned';

export interface AccountState {
  is_active: boolean;
  is_decommissioned: boolean;
  /**
   * ADR-U050 (C-F, additive): who switched the account off — 'member' |
   * 'admin' today (open namespace), null while active. `state='paused'` is
   * exactly the origin='member' off state.
   */
  deactivation_origin: string | null;
  /** Open label; known values in {@link KnownAccountState}. */
  state: string;
}

/**
 * Read the caller's own account lifecycle state via the FEAT-PC004
 * SECURITY DEFINER contract. Returns `null` when the caller resolves to no
 * mapped `public.users` row (the clean empty case — no error).
 */
export async function fetchOwnAccountState(
  supabase: SupabaseClient,
): Promise<AccountState | null> {
  const { data, error } = await supabase.rpc('get_own_account_state');
  if (error) throw error;
  // supabase-js types `.rpc()` loosely; narrow through `unknown` so `next build`
  // type-checks (the same posture as lib/profile/queries.ts).
  return (data as unknown as AccountState | null) ?? null;
}
