/**
 * FEAT-H004 — the in-place Mist->FIM transcendence seam (consumes FEAT-PC002).
 *
 * `finaliseTranscendence` is the lib-behind-route wrapper over the platform
 * `finalise_transcendence` RPC (the atomic `is_temporary => false` + FringeIsland
 * Members enrolment + consent write). It runs SERVER-SIDE (the `/api/auth/transcend`
 * route), AFTER the Supabase anon->permanent conversion the Hub performs
 * client-side via the auth SDK (the narrow exception). RPCs never run from the
 * browser (ADR-U009 / Hub CLAUDE.md narrow-exception rule) — this module does no
 * table reads/writes, only the RPC call.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

// COR-C W7 (GC-7): the policy constants live in transcendence-policy.ts (pure)
// so browser importers never value-import this rpc-bearing module. Re-exported
// here for the server-side callers that take both halves together.
export {
  TRANSCENDENCE_POLICY_VERSION,
  TRANSCENDENCE_CONSENT_REQUIRED_ERROR,
} from './transcendence-policy';

export type TranscendenceOutcome = {
  userId: string;
  personalGroupId: string;
  consentId: string;
  /** Stamped server-side from the governance catalog (COR-D W3 / AC4-1). */
  policyVersion: string;
};

export async function finaliseTranscendence(
  supabase: SupabaseClient,
  { captureContext }: { captureContext?: Record<string, unknown> } = {},
): Promise<{ outcome: TranscendenceOutcome | null; error: string | null }> {
  // COR-D W3 (Audit IV AC4-1): the policy version is no longer passed — the
  // substrate resolves it from consent_purposes.current_policy_version and
  // returns the stamped truth in the outcome.
  const { data, error } = await supabase.rpc('finalise_transcendence', {
    p_capture_context: captureContext ?? null,
  });
  if (error) return { outcome: null, error: error.message };
  return {
    outcome: {
      userId: data.user_id as string,
      personalGroupId: data.personal_group_id as string,
      consentId: data.consent_id as string,
      policyVersion: data.policy_version as string,
    },
    error: null,
  };
}
