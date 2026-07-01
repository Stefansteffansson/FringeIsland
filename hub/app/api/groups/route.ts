import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchMemberGroups } from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): run on the Edge runtime (V8 isolate, ~0ms cold start), pinned to
// `dub1` so co-location with the Ireland DB (ADR-U035) is preserved. Keep this route's
// imports Edge-safe (no Node-only APIs) — @supabase/ssr + next/headers cookies + fetch.
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * GET /api/groups — the API-first read path for the member's group list
 * (ADR-U009: DB → API → frontend; the frontend never touches a table directly).
 * V2: RLS scopes the read to the viewer. V4: telemetry on success AND failure.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('groups.load_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const groups = await fetchMemberGroups(supabase);
    emitTelemetry('groups.loaded', { actor: user.id, count: groups.length });
    return NextResponse.json({ groups });
  } catch (err) {
    emitTelemetry('groups.load_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load groups' }, { status: 500 });
  }
}
