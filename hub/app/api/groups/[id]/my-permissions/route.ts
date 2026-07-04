import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchMyPermissions } from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): loads with the group page alongside detail + fabric — a
// member-facing hot read. Edge runtime, pinned to `dub1` (ADR-U035).
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * FEAT-H014 — GET /api/groups/[id]/my-permissions (GRP-8, STORY-4).
 *
 * The existing published `get_user_permissions(acting, context)` with the
 * caller's personal group as the actor (FEAT-PC011 STORY-5 — no new
 * contract). The result is the caller's effective permission names; for a
 * non-member it is their global baseline, byte-indistinguishable from a
 * nonexistent group (no leak — the PC011 amended AC). ADR-U037: read-path
 * identity via local JWT verification. 42501 → 403 (Mist); else 500.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('roles.my_permissions_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const permissions = await fetchMyPermissions(supabase, id);
    emitTelemetry('roles.my_permissions', { actor: userId, group: id });
    return NextResponse.json({ permissions });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501') {
      emitTelemetry('roles.my_permissions_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Permissions are for members' }, { status: 403 });
    }
    emitTelemetry('roles.my_permissions_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load your permissions' }, { status: 500 });
  }
}
