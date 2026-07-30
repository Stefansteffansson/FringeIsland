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

/**
 * What the member is told when a preference write fails.
 *
 * Gate walk 2026-07-30: going offline and flipping a switch showed the member
 * the raw string **"Failed to fetch"** — a browser internal, in a red banner,
 * where an explanation belongs. The rollback itself was right and stays exactly
 * as it was; only what it says changes.
 *
 * The rule is a seam, not a blanket rewrite: a server that ANSWERED with a
 * reason is quoted verbatim, because that reason is member-facing copy the
 * platform authored on purpose (the H030 never-re-word-server-copy law). It is
 * only failures that never reached a server — a dropped connection, or a bare
 * status with no body — that get words here, because there is no server
 * sentence to preserve.
 */
export function preferenceSaveFailureMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  // The request never landed: fetch rejects with these before any response.
  if (/failed to fetch|networkerror|network error|load failed|fetch failed/i.test(raw)) {
    return 'We could not reach the server, so this change was not saved and has been put back. Check your connection and try again.';
  }
  // A status with no body to quote — `HTTP 500` is not something to show anyone.
  if (/^HTTP \d{3}$/.test(raw.trim())) {
    return 'We could not save this change, so it has been put back. Please try again.';
  }
  // The server said why. That sentence was written for the member; keep it.
  return raw;
}

/**
 * One cell of the categories x channels matrix, with the effective value already
 * resolved server-side — the surface never has to know that absence means
 * allowed.
 */
export interface NotificationPreferenceCell {
  category_key: string;
  /** Server-authored; rendered verbatim (the H030 law — never re-word copy). */
  category_label: string;
  /** Open text ('badge' throughout Ferd) — treated as data, never switched on. */
  interruption_grade: string;
  /** False => the member may not mute it; render locked-on with a reason. */
  member_suppressible: boolean;
  channel: string;
  channel_label: string;
  /**
   * Whether this channel actually reaches anyone today. `email` is false in
   * Ferd (abstraction-only, zero vendor dependency), and this flag is the only
   * thing that decides whether the surface renders a column for it — a toggle
   * that cannot change anything would be a promise the Hub can't keep.
   */
  channel_delivers: boolean;
  allowed: boolean;
}

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

/**
 * Group the flat matrix into one row per category, channels nested — the shape
 * the surface renders. Deliberately derives its category and channel lists FROM
 * THE DATA: a new registry row appears with no Hub change (the kind-agnostic
 * discipline FEAT-H030 proved for the inbox renderer).
 */
export interface PreferenceRow {
  category_key: string;
  category_label: string;
  interruption_grade: string;
  member_suppressible: boolean;
  cells: NotificationPreferenceCell[];
}

export function groupPreferencesByCategory(
  cells: NotificationPreferenceCell[],
): PreferenceRow[] {
  const rows = new Map<string, PreferenceRow>();
  for (const cell of cells) {
    let row = rows.get(cell.category_key);
    if (!row) {
      row = {
        category_key: cell.category_key,
        category_label: cell.category_label,
        interruption_grade: cell.interruption_grade,
        member_suppressible: cell.member_suppressible,
        cells: [],
      };
      rows.set(cell.category_key, row);
    }
    row.cells.push(cell);
  }
  return [...rows.values()];
}

/**
 * The channels the surface renders — delivering ones only. Derived from the
 * payload, so the day email starts delivering the column appears with no code
 * change here.
 */
export function renderableChannels(cells: NotificationPreferenceCell[]): string[] {
  const seen = new Map<string, boolean>();
  for (const cell of cells) {
    if (!seen.has(cell.channel)) seen.set(cell.channel, cell.channel_delivers);
  }
  return [...seen.entries()].filter(([, delivers]) => delivers).map(([channel]) => channel);
}

/** Channels stored but not yet delivering — named honestly in the UI. */
export function storedOnlyChannels(cells: NotificationPreferenceCell[]): string[] {
  const seen = new Map<string, { delivers: boolean; label: string }>();
  for (const cell of cells) {
    if (!seen.has(cell.channel)) {
      seen.set(cell.channel, { delivers: cell.channel_delivers, label: cell.channel_label });
    }
  }
  return [...seen.values()].filter((c) => !c.delivers).map((c) => c.label);
}
