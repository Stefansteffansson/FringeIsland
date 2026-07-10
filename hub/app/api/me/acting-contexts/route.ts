import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchActingContexts } from '@/lib/groups/acting';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H018 — GET /api/me/acting-contexts (STORY-1).
 *
 * The FEAT-PC015 `get_acting_contexts()` contract decides everything: direct
 * empowerments only (the caller's own role in the group carries
 * `act_as_group` — ADR-U041 §2d; never Tier-1 reach, never a chained hop).
 * Group names render to the member and never enter telemetry.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('acting.contexts_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Post-6-done fix: `?context=` scopes the read — rows carry the
    // membership flag so the Surface offers only hats with standing.
    const requestUrl = (request as { url?: string }).url;
    const context = requestUrl ? new URL(requestUrl).searchParams.get('context') : null;
    const contexts = await fetchActingContexts(supabase, context ?? undefined);
    emitTelemetry('acting.contexts', { actor: userId, count: contexts.length });
    return NextResponse.json(contexts);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501') {
      emitTelemetry('acting.contexts_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Acting contexts are for members' }, { status: 403 });
    }
    emitTelemetry('acting.contexts_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load acting contexts' }, { status: 500 });
  }
}
