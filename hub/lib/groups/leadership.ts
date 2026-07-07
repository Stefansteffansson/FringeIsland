import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H017 — fetchers over the FEAT-PC014 leadership-transfer + closure
 * contracts (migration 20260705072252; ADR-U038: every rule lives
 * substrate-side; these relay and type the payloads).
 */

/** A pending stewardship offer, shaped for the /groups affordance (STORY-2).
 *  Sourced from the caller's own `stewardship_nomination` notification row —
 *  the A-NTF re-home seam, not an inbox. */
export interface PendingNomination {
  notification_id: string;
  group_id: string;
  group_name: string;
  created_at: string;
  /** The 7-day window's end, contract-enforced — shown, never counted down client-side. */
  expires_at: string;
}

export interface NominateResult {
  group_id: string;
  nominees_count: number;
}

/** MEM-7: the sole active Steward nominates ranked successors — the offer goes
 *  to the first; nothing mutates until a nominee responds. */
export async function nominateSteward(
  supabase: SupabaseClient,
  groupId: string,
  nomineeGroupIds: string[],
): Promise<NominateResult> {
  const { data, error } = await supabase.rpc('nominate_steward', {
    p_group_id: groupId,
    p_nominee_ids: nomineeGroupIds,
  });
  if (error) throw error;
  return data as NominateResult;
}

/** MEM-7: the nominee's answer. Accept → they become Steward and the nominator
 *  departs; decline → the contract routes the offer on (next nominee or
 *  DeusEx — its decision, relayed never predicted). */
export async function respondToNomination(
  supabase: SupabaseClient,
  notificationId: string,
  accept: boolean,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('respond_to_stewardship_nomination', {
    p_notification_id: notificationId,
    p_accept: accept,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

/** MEM-7 / ADR-U019: the sole Steward's deliberate last resort — hand the
 *  group to FringeIsland-DeusEx and depart. */
export async function handToDeusEx(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('hand_stewardship_to_deusex', {
    p_group_id: groupId,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

/** MEM-8: the last active member's terminal act — status becomes `closed`,
 *  work frozen and reassigned platform-side. */
export async function closeGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('close_group', { p_group_id: groupId });
  if (error) throw error;
  return data as Record<string, unknown>;
}

/** GRP-9: the Steward's deliberate deletion — soft-terminal `archived`
 *  (PC014 Open Q5), members notified substrate-side. Never member removal. */
export async function deleteGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('delete_group', { p_group_id: groupId });
  if (error) throw error;
  return data as Record<string, unknown>;
}

/** STORY-2 read: the caller's own pending stewardship nominations via the
 *  FEAT-PC016 contract — pending-ness (type + unanswered + SERVER-clock
 *  expiry) is derived in exactly one home; this is a thin relay (closes the
 *  2026-07-06 audit LOW finding). Re-homes into the A-NTF inbox when it
 *  lands (seam, D8). */
export async function fetchPendingNominations(
  supabase: SupabaseClient,
): Promise<PendingNomination[]> {
  const { data, error } = await supabase.rpc('get_my_pending_nominations');
  if (error) throw error;
  return (data ?? []) as PendingNomination[];
}
