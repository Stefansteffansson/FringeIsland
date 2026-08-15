/**
 * FEAT-PC017 + FEAT-PC005 — the account-lifecycle self-service contracts
 * (IDN-10 / IDN-12, Cycle C-F).
 *
 * Server-side rpc wrappers for the three owner-gated SECURITY DEFINER
 * transitions. Every rule lives platform-side (ADR-U038/ADR-U050): no target
 * parameter exists, Mist/session-less callers are refused in-body, an admin
 * hold is never self-escapable, decommissioned is terminal. These wrappers are
 * transport only — a substrate refusal (P0001) surfaces as a thrown error
 * carrying the substrate's message for the route to map.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface LifecycleTransitionResult {
  state: string;
  idempotent: boolean;
}

export interface DeleteAccountResult {
  success: boolean;
  groups_exited: number;
  decommissioned: boolean;
}

/** Active -> paused (member origin). Cascade-free by design (ADR-U050). */
export async function pauseOwnAccount(
  supabase: SupabaseClient,
): Promise<LifecycleTransitionResult> {
  const { data, error } = await supabase.rpc('pause_own_account');
  if (error) throw error;
  return data as unknown as LifecycleTransitionResult;
}

/** Member-origin paused -> active; origin cleared (FEAT-PC005 STORY-6). */
export async function reactivateOwnAccount(
  supabase: SupabaseClient,
): Promise<LifecycleTransitionResult> {
  const { data, error } = await supabase.rpc('reactivate_own_account');
  if (error) throw error;
  return data as unknown as LifecycleTransitionResult;
}

/**
 * The terminal departure (F-3, amended by TASK-IDN-01): the platform runs the
 * membership walk, the F-2 erasure/retention split, decommission + scrub, and
 * ends every session in one transaction — and that click now STARTS the
 * 30-day grace window (migration 20260815210000). The content consequences
 * stay immediate; the account itself is restorable until the scheduled wipe.
 */
export async function deleteOwnAccount(
  supabase: SupabaseClient,
): Promise<DeleteAccountResult> {
  const { data, error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
  return data as unknown as DeleteAccountResult;
}

/** TASK-IDN-01: the restore-window facts for the caller's own account. */
export interface RestoreState {
  restorable: boolean;
  decommissioned_at?: string | null;
  scheduled_deletion_at: string | null;
}

/** TASK-IDN-01: what the restore door renders from — own row, substrate truth. */
export async function getOwnRestoreState(supabase: SupabaseClient): Promise<RestoreState> {
  const { data, error } = await supabase.rpc('get_own_restore_state');
  if (error) throw error;
  return data as unknown as RestoreState;
}

/**
 * TASK-IDN-01: the grace-window restore — member-origin decommission only,
 * refused past the window (P0001 with the substrate's honest reason).
 * Restores identity; groups and content were left/dispositioned at click.
 */
export async function restoreOwnAccount(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase.rpc('restore_own_account');
  if (error) throw error;
}
