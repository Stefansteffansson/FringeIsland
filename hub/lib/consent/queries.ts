/**
 * FEAT-PC006 — member consent read contract (IDN-6).
 *
 * The platform-tier own-subject read of the caller's consent: effective state
 * (latest decision per catalogued purpose, with drift) + full append-only
 * history. Surfaced API-first at `GET /api/account/consent` and consumed by the
 * Hub (FEAT-H008). It CANNOT be a plain RLS-scoped `.from('consent_records')`
 * read: the granular projection needs the `consent_purposes` catalog join and a
 * latest-per-purpose collapse, and consent_records has no member-facing
 * contract. The read therefore goes through the `get_own_consent_state()`
 * SECURITY DEFINER function, which projects the caller's OWN rows only
 * (get_current_personal_group_id()-pinned, no target parameter).
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Known decision values today. `decision` is OPEN text — a future class (e.g.
 * `'restricted'`) is returned without a breaking change, and consumers treat an
 * unknown value as data. `null` means undecided (no row for a catalogued
 * purpose).
 */
export type KnownConsentDecision = 'granted' | 'withdrawn';

/** One catalogued purpose's current effective decision for the caller. */
export interface ConsentEffectiveEntry {
  purpose: string;
  label: string;
  description: string | null;
  /** Open label; `null` = undecided. Known values in {@link KnownConsentDecision}. */
  decision: string | null;
  policy_version: string | null;
  decided_at: string | null;
  withdrawable: boolean;
  current_policy_version: string;
  /** True only when a `granted` decision is stale against the current policy. */
  needs_reconsent: boolean;
}

/** One consent event in the append-only ledger (the GDPR proof surface). */
export interface ConsentHistoryEntry {
  purpose: string;
  decision: string;
  policy_version: string;
  captured_at: string;
  capture_context: Record<string, unknown> | null;
}

export interface ConsentState {
  effective: ConsentEffectiveEntry[];
  history: ConsentHistoryEntry[];
}

const EMPTY_CONSENT_STATE: ConsentState = { effective: [], history: [] };

/**
 * Read the caller's own consent state via the FEAT-PC006 SECURITY DEFINER
 * contract. The function always returns an object (never null); the empty-state
 * fallback guards a malformed payload only.
 */
export async function fetchOwnConsentState(
  supabase: SupabaseClient,
): Promise<ConsentState> {
  const { data, error } = await supabase.rpc('get_own_consent_state');
  if (error) throw error;
  // supabase-js types `.rpc()` loosely; narrow through `unknown` so `next build`
  // type-checks (the same posture as lib/account/queries.ts).
  return (data as unknown as ConsentState | null) ?? EMPTY_CONSENT_STATE;
}
