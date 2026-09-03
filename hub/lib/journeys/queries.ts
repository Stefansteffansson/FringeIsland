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
  enrollments: Array<{
    /**
     * Additive/optional: the enrolment handle the H022 group-progress panel
     * keys its read on. Absent from the current get_group_enrollment_summary
     * payload — the panel renders no expander until the summary carries it
     * (a one-line PD002 re-issue: select `e.id as enrollment_id`).
     */
    enrollment_id?: string;
    journey_id: string;
    title: string;
    status: string;
  }>;
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
  /**
   * FEAT-PD007 additive (ADR-U046) — whether this kind invites a written
   * response. REGISTRY data: the Hub places the capture input by this flag
   * alone, never by a kind list. Optional so pre-J-F fixtures type-check.
   */
  captures_response?: boolean;
  required: boolean;
  repeatable: boolean;
  duration_minutes: number | null;
  /** The inline payload, pending-DS-4 (ADR-U016) — shape is per-kind; renderers narrow. */
  content: unknown;
}

/**
 * FEAT-PD007 (ADR-U046) — the traveller's response payload. `{body}` by
 * convention, not constraint (free-form JSONB platform-side; future structured
 * capture shapes ride the same key without a Hub type change).
 */
export interface StepResponsePayload {
  body?: string;
  [key: string]: unknown;
}

/** One of the caller's OWN step instances (get_player_state; invariant 4 — traveller-own). */
export interface PlayerInstance {
  instance_id: string;
  step_id: string;
  created_at: string;
  completed_at: string | null;
  /** FEAT-PD007 additive — the traveller's own words; null = never responded (or retracted). */
  response?: StepResponsePayload | null;
  /** FEAT-PD007 additive — when the words were last touched. */
  response_updated_at?: string | null;
}

/**
 * FEAT-PD004 (JRN-12/13) — the traveller-grain completion block. `traveller_completed`
 * is derived (matches the detection predicate — true for a via-group traveller even
 * while the party's row stays active); `enrollment_status`/`enrollment_completed_at`
 * quote the row grain. The Hub renders this; it never computes completion (ADR-U038).
 */
export interface PlayerCompletion {
  traveller_completed: boolean;
  traveller_completed_at: string | null;
  /** Open vocabulary — the enrolment row's status ('active' | 'completed' | ...). */
  enrollment_status: string;
  enrollment_completed_at: string | null;
}

/** FEAT-PD004 (JRN-11) — one step's accrued engagement time, seconds, platform-derived. */
export interface PlayerStepTiming {
  step_id: string;
  seconds: number;
}

/**
 * FEAT-PD004 (JRN-11) — the timing block. Time-on-step is the sum of completed
 * engagements only (open engagements cost nothing); `total_seconds` is the per-step
 * sum; `wall_clock` is the enrolled→completed calendar span, a DISTINCT number never
 * conflated with engagement time. Derived server-side; the Hub formats, never re-derives.
 */
export interface PlayerTiming {
  per_step: PlayerStepTiming[];
  total_seconds: number;
  wall_clock: { enrolled_at: string; completed_at: string | null };
}

/**
 * FEAT-PD005 (JRN-14) — the freeze block. Non-null ONLY for a frozen enrolment.
 * `reason` is open vocabulary (four known values — `group_closed`,
 * `group_archived`, `left_group`, `removed_from_group` — plus a verbatim
 * fallback for future ones); `frozen_at` is when the membership cascade froze
 * it. The Hub renders this read-only frame; it never sets or clears freeze
 * (cascades own it — no unfreeze affordance, ADR-U038).
 */
export interface PlayerFreeze {
  /** Open vocabulary — render tolerantly; unknown reasons fall back to the verbatim value. */
  reason: string | null;
  frozen_at: string | null;
}

/**
 * FEAT-PD005 (JRN-17, traveller side) — the caller's own per-enrolment sharing
 * state, booted with the player. `available` is false on solo walks (nothing
 * to share to); `sharing` is the caller's own latest decision. Additive/optional
 * against H020/H021 fixtures.
 */
export interface PlayerProgressSharing {
  available: boolean;
  sharing: boolean;
}

/** The single-round-trip player boot payload (get_player_state). */
export interface PlayerState {
  enrollment_id: string;
  /** Open vocabulary — 'active' | 'frozen' | 'completed' | ...; non-active render honest states. */
  status: string;
  /** Open vocabulary — 'linear' | future modes (stored data, forward shape). */
  sequencing_mode: string;
  journey: {
    id: string;
    title: string;
    description: string | null;
    /** FEAT-PD007 additive — the journey-level authored closing word ({body} JSONB; the J-E seed). */
    takeaway?: unknown;
  };
  steps: PlayerStep[];
  instances: PlayerInstance[];
  /** Q6 resume: latest open engagement, else first incomplete step, else last step; null iff no steps. */
  resume_step_id: string | null;
  /** FEAT-PD004 additive (JRN-12/13) — optional so H020 fixtures without it type-check. */
  completion?: PlayerCompletion;
  /** FEAT-PD004 additive (JRN-11) — optional for the same reason. */
  timing?: PlayerTiming;
  /** FEAT-PD005 additive (JRN-14) — non-null only for a frozen enrolment. Optional so H020/H021 fixtures type-check. */
  freeze?: PlayerFreeze | null;
  /** FEAT-PD005 additive (JRN-17) — the sharing control's boot state. Optional for the same reason. */
  progress_sharing?: PlayerProgressSharing;
}

/**
 * complete_journey_step's response — the four J-B instance keys plus FEAT-PD004's
 * additive transition flag (`journey_completed`, true ONLY on the transition edge)
 * and the completion block, so the Hub's background save learns the milestone
 * without a refetch (B5-preserving). Additive keys optional against the J-B shape.
 */
export interface StepCompletionResult extends PlayerInstance {
  journey_completed?: boolean;
  completion?: PlayerCompletion;
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

/** FEAT-PD002 STORY-8 (TASK-JRN-PAUSE-01): pause the caller's own walk — the
 *  contract owns every rule (own row only; completed/frozen/withdrawn/already-
 *  paused refuse P0001 naming the state). A thin relay. */
export async function pauseJourneyEnrollment(
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('pause_journey_enrollment', {
    p_enrollment_id: enrollmentId,
  });
  if (error) throw error;
  return data as Record<string, unknown>;
}

/** FEAT-PD002 STORY-8: resume the caller's own paused walk at the held position. */
export async function resumeJourneyEnrollment(
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc('resume_journey_enrollment', {
    p_enrollment_id: enrollmentId,
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

// --- FEAT-PD007 response-capture contracts (Cycle J-F) ------------------------
// The walks-export RPC (get_own_step_instances_export) still lives in the
// substrate, but since COR-A W8 the platform composes it into
// get_own_data_export()'s `journeys` key itself — the Hub-side fetcher that
// used to ride here was removed with the export route's 3-way merge (AC-4).

/** save_step_response's return — the confirmed write for cache write-through. */
export interface StepResponseSaveResult {
  instance_id: string;
  step_id: string;
  response: StepResponsePayload | null;
  response_updated_at: string | null;
}

/** FEAT-PD007 STORY-2/5 (ADR-U046): the optional-always capture write —
 *  orthogonal to completion; explicit empty (null) retracts. Self-gated in the
 *  substrate (standing, guard family, size ceiling); this wrapper only shapes
 *  the call and rethrows the SQLSTATE for the route to map (ADR-U038). */
export async function saveStepResponse(
  supabase: SupabaseClient,
  enrollmentId: string,
  stepId: string,
  response: StepResponsePayload | null,
): Promise<StepResponseSaveResult> {
  const { data, error } = await supabase.rpc('save_step_response', {
    p_enrollment_id: enrollmentId,
    p_step_id: stepId,
    p_response: response,
  });
  if (error) throw error;
  return data as StepResponseSaveResult;
}

// --- FEAT-PD005 group-progress + sharing contracts (Cycle J-D) ----------------

/** One skeleton step in the group progress read (get_group_journey_progress). */
export interface GroupProgressStep {
  step_id: string;
  step_order: number;
  title: string;
  required: boolean;
}

/** One member's per-step completion flag — present only for a sharing member the
 *  caller may see marks for (view_others_progress holder). */
export interface GroupProgressMemberStep {
  step_id: string;
  completed: boolean;
}

/**
 * One roster entry (consent-shaped, permission-grained). A NON-sharing member
 * carries exactly {member_group_id, display_name, sharing:false}. A sharing
 * member adds marks (traveller_completed / required_completed / required_total /
 * per_step) ONLY when the caller holds view_others_progress; otherwise the marks
 * are absent (sharing:true, no per_step). No timing key exists by design.
 */
export interface GroupProgressMember {
  member_group_id: string;
  display_name: string;
  sharing: boolean;
  traveller_completed?: boolean;
  required_completed?: number;
  required_total?: number;
  per_step?: GroupProgressMemberStep[];
}

/** Per-step completed counts over SHARING members only (Q4); the basis served alongside. */
export interface GroupProgressAggregateStep {
  step_id: string;
  completed_count: number;
}

/**
 * The get_group_journey_progress payload (JRN-16/17). Members are alphabetical
 * as served — the Hub never re-sorts. `members_meta` carries the honest basis
 * (total members / sharing members). NO timing-shaped key exists (invariant 8/Q5).
 */
export interface GroupJourneyProgress {
  enrollment_id: string;
  journey: { id: string; title: string };
  /** Open vocabulary — 'active' | 'frozen' | 'completed' | ... */
  status: string;
  steps: GroupProgressStep[];
  members: GroupProgressMember[];
  members_meta: { total: number; sharing: number };
  aggregate: { per_step: GroupProgressAggregateStep[]; basis: string };
}

/** FEAT-PD005 STORY-2 (JRN-17 traveller side): grant/withdraw progress sharing
 *  for one enrolment. Self-only + append-only platform-side; latest-wins. */
export async function setJourneyProgressSharing(
  supabase: SupabaseClient,
  enrollmentId: string,
  share: boolean,
): Promise<{ enrollment_id: string; sharing: boolean }> {
  const { data, error } = await supabase.rpc('set_journey_progress_sharing', {
    p_enrollment_id: enrollmentId,
    p_share: share,
  });
  if (error) throw error;
  return data as { enrollment_id: string; sharing: boolean };
}

/** FEAT-PD005 STORY-3/4 (JRN-16/17): the consent-shaped group progress window —
 *  permission-gated, consent-shaped, never comparative (all self-gated in the
 *  contract). This wrapper only shapes the call and rethrows the SQLSTATE. */
export async function fetchGroupJourneyProgress(
  supabase: SupabaseClient,
  enrollmentId: string,
): Promise<GroupJourneyProgress> {
  const { data, error } = await supabase.rpc('get_group_journey_progress', {
    p_enrollment_id: enrollmentId,
  });
  if (error) throw error;
  return data as GroupJourneyProgress;
}
