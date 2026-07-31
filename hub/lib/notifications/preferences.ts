/**
 * FEAT-H033 / FEAT-PD016 — notification preference + operator nudge contracts.
 *
 * NTF-10's read/write door. Preferences are **DS-5-owned** state (the 2026-07-26
 * adjudication, board row ND-1): the table FK-enforces against DS-5's
 * `notification_categories`, so a Core home would have inverted the one-way
 * Core -> Domain rule. Consent is a different thing entirely and lives in
 * Platform Core with its own surface (`lib/consent/queries.ts`) — nothing here
 * touches it.
 *
 * All four calls go through SECURITY DEFINER contracts, never a table read:
 * `notification_preferences` has own-rows-only SELECT and **no client write
 * policy at all**, so the contract is the only write door.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { NotificationPreferenceCell } from './preferences-format';

// COR-C W7 (GC-7/AC3-12): the pure presentation half (cell/row shapes, the
// grouping helpers, the failure-message seam) lives in preferences-format.ts —
// the panel value-imports THAT module, and this one (holding the rpc wrappers)
// stays off the browser bundle. Type-only re-export keeps old type importers
// working without creating a bundle edge.
export type { NotificationPreferenceCell, PreferenceRow } from './preferences-format';

/** The shape `set_own_notification_preference` echoes back for reconciliation. */
export interface NotificationPreferenceWrite {
  category_key: string;
  channel: string;
  allowed: boolean;
  updated_at: string;
}

export interface NudgePolicyConfigRow {
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export interface NudgePolicyCategoryRow {
  key: string;
  label: string;
  nudge: boolean;
  member_suppressible: boolean;
}

export interface NudgePolicy {
  config: NudgePolicyConfigRow[];
  categories: NudgePolicyCategoryRow[];
}

/** The operator view: the policy plus what acting on it would cost. */
export interface NudgePolicyView extends NudgePolicy {
  /**
   * Reachable FIM recipients. N-C proved a platform-wide announcement is billed
   * **per recipient whether or not anyone is listening**, so the cost tracks
   * headcount rather than concurrency and "hardly anyone is online" is not a
   * mitigation. This number exists so an operator sees the cost at the moment
   * they flip the toggle, which is the cheapest guardrail available.
   */
  platform_reach: number;
}

export async function fetchOwnNotificationPreferences(
  supabase: SupabaseClient,
): Promise<NotificationPreferenceCell[]> {
  const { data, error } = await supabase.rpc('get_own_notification_preferences');
  if (error) throw error;
  // supabase-js types `.rpc()` loosely; narrow through `unknown` so `next build`
  // type-checks (the lib/consent/queries.ts posture).
  return (data as unknown as NotificationPreferenceCell[] | null) ?? [];
}

/**
 * Set one cell. Throws the underlying `PostgrestError` (carrying its SQLSTATE)
 * so the route maps it honestly: `22023` -> 422 unknown category/channel,
 * `42501` -> 409 this category cannot be muted, `28000` -> 403 no active subject.
 */
export async function setOwnNotificationPreference(
  supabase: SupabaseClient,
  categoryKey: string,
  channel: string,
  allowed: boolean,
): Promise<NotificationPreferenceWrite> {
  const { data, error } = await supabase.rpc('set_own_notification_preference', {
    p_category_key: categoryKey,
    p_channel: channel,
    p_allowed: allowed,
  });
  if (error) throw error;
  return data as unknown as NotificationPreferenceWrite;
}

/**
 * The operator read, composed in the BFF from two contracts. Composition is
 * legitimate BFF work (presentation shaping); both halves are
 * `is_platform_admin()`-gated in the substrate, so a non-admin is refused by the
 * contract rather than by the absence of a button.
 */
export async function fetchNudgePolicyView(supabase: SupabaseClient): Promise<NudgePolicyView> {
  const [{ data: policy, error: policyError }, { data: reach, error: reachError }] =
    await Promise.all([
      supabase.rpc('get_notification_nudge_policy'),
      supabase.rpc('get_platform_announcement_reach'),
    ]);
  if (policyError) throw policyError;
  if (reachError) throw reachError;

  const base = (policy as unknown as NudgePolicy | null) ?? { config: [], categories: [] };
  return { ...base, platform_reach: (reach as unknown as number | null) ?? 0 };
}

export async function setNudgePolicy(
  supabase: SupabaseClient,
  key: string,
  value: string,
): Promise<void> {
  const { error } = await supabase.rpc('set_notification_nudge_policy', {
    p_key: key,
    p_value: value,
  });
  if (error) throw error;
}

export async function setCategoryNudge(
  supabase: SupabaseClient,
  categoryKey: string,
  nudge: boolean,
): Promise<void> {
  const { error } = await supabase.rpc('set_notification_category_nudge', {
    p_category_key: categoryKey,
    p_nudge: nudge,
  });
  if (error) throw error;
}

