import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchOnboardingStatus } from '@/lib/onboarding/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H023 — GET /api/me/onboarding, the standalone first-arrival read.
 *
 * The canonical contract for the FEAT-PD006 `get_onboarding_status()` RPC:
 * the overview bundle's `onboarding` slice is payload-equivalent by
 * construction (same query function) and remains droppable transport
 * (ADR-U042 guardrail 3) — this route is what a Mist's arrival check calls
 * (no bundle fires for a Mist). Private BFF per ADR-U038: the rule (who may
 * read, what counts as arrived) lives platform-side. Read path → ADR-U037
 * local identity via getVerifiedUserId. Telemetry ids only.
 */
export async function GET() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('onboarding.status_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const onboarding = await fetchOnboardingStatus(supabase);
    return NextResponse.json({ onboarding });
  } catch (err) {
    const code = (err as { code?: string }).code;
    emitTelemetry('onboarding.status_failed', { actor: userId, code });
    if (code === '42501') {
      // TASK-MIST-01: named, so the client can tell a ghost session from a transient.
      return NextResponse.json(
        { error: 'No resolvable actor', code: 'no_resolvable_actor' },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: 'Failed to read onboarding status' }, { status: 500 });
  }
}
