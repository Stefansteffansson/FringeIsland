import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchMyPermissions } from '@/lib/groups/queries';
import { fetchPermissionsActingAs } from '@/lib/groups/acting';
import { emitTelemetry } from '@/lib/observability/telemetry';

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
  request: Request,
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
    // FEAT-H018 (ADR-U041 §2a): `?acting=<group>` re-scopes the read to the
    // acting group's effective set — pure substitution, same published
    // contract with a different acting principal. The substrate's wielding
    // gate is NOT here (this is a read of A's powers, not an act as A); the
    // selector only offers contexts the acting-contexts read granted.
    const requestUrl = (request as { url?: string }).url;
    const acting = requestUrl ? new URL(requestUrl).searchParams.get('acting') : null;
    if (acting) {
      const permissions = await fetchPermissionsActingAs(supabase, acting, id);
      emitTelemetry('roles.my_permissions_acting', { actor: userId, group: id, acting });
      return NextResponse.json({ permissions, acting_group_id: acting });
    }
    // FEAT-H017 additive key: the caller's own member_group_id (the
    // contract-resolved actor) rides the same read — no extra fetch.
    const { permissions, member_group_id } = await fetchMyPermissions(supabase, id);
    emitTelemetry('roles.my_permissions', { actor: userId, group: id });
    return NextResponse.json({ permissions, member_group_id });
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
