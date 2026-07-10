import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H023 — the FEAT-PD006 first-arrival read (server half).
 *
 * One RPC, own-scoped: the designated onboarding journey's id (null if none
 * designated), whether the caller has EVER enrolled in it (any status — the
 * whole first-arrival signal, ADR-U045 Amendment 1), and whether a completed
 * walk exists. Mist-callable; an actorless session raises 42501.
 */

export type OnboardingStatus = {
  onboarding_journey_id: string | null;
  has_enrollment: boolean;
  has_completed: boolean;
};

export async function fetchOnboardingStatus(supabase: SupabaseClient): Promise<OnboardingStatus> {
  const { data, error } = await supabase.rpc('get_onboarding_status');
  if (error) throw error;
  return data as OnboardingStatus;
}
