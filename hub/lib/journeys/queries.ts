/**
 * FEAT-H019 — the Journeys read/write path via the FEAT-PD002 contracts
 * (Cycle J-A). All contracts self-gate in the substrate (published-visibility
 * mirror, FIM-only enrolment, permission keys, duplicate/frozen refusals,
 * P0002 no-existence-leak); these wrappers only shape the calls and rethrow
 * the SQLSTATE-carrying errors for the routes to map (ADR-U038). Everything
 * here must stay Edge-safe — the read routes run on the Edge runtime.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/** One catalogue card (get_journey_catalog payload entry). */
export interface JourneyCard {
  id: string;
  title: string;
  description: string | null;
  /** Open vocabulary (ADR-U018 posture) — render tolerantly, never switch exhaustively. */
  difficulty_level: string | null;
  estimated_duration_minutes: number | null;
  tags: string[];
  step_count: number;
}

/** One steps-overview entry — title/kind/duration only, never step content (the player is J-B). */
export interface JourneyStepOverview {
  title: string;
  /** Open vocabulary — 'content' | 'activity' | 'assessment' | future kinds. */
  kind: string;
  duration_minutes: number | null;
}

/** A group reference in the viewer block. */
export interface JourneyGroupRef {
  group_id: string;
  group_name: string;
}

/**
 * An enrolled-via entry (J-A build finding, gate-amended): the payload carries
 * the enrolment id, its status, and whether THIS viewer may withdraw it
 * (`unenroll_from_journey` resolved platform-side) — the surface renders
 * affordances from these, never client-guessed (STORY-5's "per the payload").
 * Optional for tolerance against the pre-amendment payload shape.
 */
export interface JourneyEnrolledVia extends JourneyGroupRef {
  enrollment_id?: string;
  status?: string;
  can_withdraw?: boolean;
}

/** The caller's own enrolment handle (same build finding — additive). */
export interface JourneyIndividualEnrollment {
  enrollment_id: string;
  /** Open vocabulary — 'active' | 'frozen' | ... ; frozen renders no withdraw. */
  status: string;
}

/** The detail payload (get_journey_detail): card fields + steps + the viewer block. */
export interface JourneyDetail extends JourneyCard {
  steps: JourneyStepOverview[];
  is_enrolled_individually: boolean;
  /** Present iff is_enrolled_individually (additive; null before the amendment). */
  individual_enrollment?: JourneyIndividualEnrollment | null;
  enrolled_via: JourneyEnrolledVia[];
  /** The JRN-4 picker's ONLY source — the Hub never computes eligibility (ADR-U041). */
  enrollable_groups: JourneyGroupRef[];
}

/** One get_my_enrollments entry, kind-marked. */
export interface MyEnrollment {
  enrollment_id: string;
  kind: 'individual' | 'via_group' | (string & {});
  journey_id: string;
  journey_title: string;
  /** Open vocabulary — 'active' | 'completed' | 'paused' | 'frozen' | future values. */
  status: string;
  last_accessed_at: string | null;
  group_id?: string;
  group_name?: string;
}

/** The group enrolment summary (get_group_enrollment_summary) — the GRP-4 seam. */
export interface GroupEnrollmentSummary {
  count: number;
  enrollments: Array<{ journey_id: string; title: string; status: string }>;
}

/**
 * One player step — full node incl. the inline content payload (get_player_state;
 * the single-round-trip player boot, FEAT-PD003). Field order mirrors the payload.
 */
export interface PlayerStep {
  id: string;
  step_order: number;
  title: string;
  /** Open vocabulary (ADR-U044 / JRN-18) — the step-kind registry key. Rendered via
   *  the renderer map with a mandatory fallback; NEVER a union over registry keys. */
  kind: string;
  /** Open vocabulary — the content-family registry key. */
  family: string;
  ask_verb: string;
  required: boolean;
  repeatable: boolean;
  duration_minutes: number | null;
  /** The inline payload, pending-DS-4 (ADR-U016) — shape is per-kind; renderers narrow. */
  content: unknown;
}

/** One of the caller's OWN step instances (get_player_state; invariant 4 — traveller-own). */
export interface PlayerInstance {
  instance_id: string;
  step_id: string;
  created_at: string;
  completed_at: string | null;
}

/** The single-round-trip player boot payload (get_player_state). */
export interface PlayerState {
  enrollment_id: string;
  /** Open vocabulary — 'active' | 'frozen' | 'completed' | ...; non-active render honest states. */
  status: string;
  /** Open vocabulary — 'linear' | future modes (stored data, forward shape). */
  sequencing_mode: string;
  journey: { id: string; title: string; description: string | null };
  steps: PlayerStep[];
  instances: PlayerInstance[];
  /** Q6 resume: latest open engagement, else first incomplete step, else last step; null iff no steps. */
  resume_step_id: string | null;
}

export async function fetchJourneyCatalog(supabase: SupabaseClient): Promise<JourneyCard[]> {
  const { data, error } = await supabase.rpc('get_journey_catalog');
  if (error) throw error;
  return (data ?? []) as JourneyCard[];
}

export async function fetchJourneyDetail(
  supabase: SupabaseClient,
  journeyId: string,
): Promise<JourneyDetail> {
  const { data, error } = await supabase.rpc('get_journey_detail', { p_journey_id: journeyId });
  if (error) throw error;
  return data as JourneyDetail;
}

export async function fetchMyEnrollments(supabase: SupabaseClient): Promise<MyEnrollment[]> {
  const { data, error } = await supabase.rpc('get_my_enrollments');
  if (error) throw error;
  return (data ?? []) as MyEnrollment[];
}

export async function enrollSelfInJourney(
  supabase: SupabaseClient,
  journeyId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('enroll_self_in_journey', {
    p_journey_id: journeyId,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function enrollGroupInJourney(
  supabase: SupabaseClient,
  groupId: string,
  journeyId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('enroll_group_in_journey', {
    p_group_id: groupId,
    p_journey_id: journeyId,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function withdrawFromJourney(
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('withdraw_from_journey', {
    p_enrollment_id: enrollmentId,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

export async function fetchGroupEnrollmentSummary(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupEnrollmentSummary> {
  const { data, error } = await supabase.rpc('get_group_enrollment_summary', {
    p_group_id: groupId,
  });
  if (error) throw error;
  return data as GroupEnrollmentSummary;
}

// --- FEAT-PD003 player contracts (the player's boot + auto-save path) ---------

export async function fetchPlayerState(
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<PlayerState> {
  const { data, error } = await supabase.rpc('get_player_state', {
    p_enrollment_id: enrollmentId,
  });
  if (error) throw error;
  return data as PlayerState;
}

export async function enterJourneyStep(
  supabase: SupabaseClient,
  enrollmentId: string,
  stepId: string,
): Promise<PlayerInstance> {
  const { data, error } = await supabase.rpc('enter_journey_step', {
    p_enrollment_id: enrollmentId,
    p_step_id: stepId,
  });
  if (error) throw error;
  return data as PlayerInstance;
}

export async function completeJourneyStep(
  supabase: SupabaseClient,
  enrollmentId: string,
  stepId: string,
): Promise<PlayerInstance> {
  const { data, error } = await supabase.rpc('complete_journey_step', {
    p_enrollment_id: enrollmentId,
    p_step_id: stepId,
  });
  if (error) throw error;
  return data as PlayerInstance;
}
