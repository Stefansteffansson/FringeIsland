import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchRoleCopyDiff } from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * RD-B FEAT-H044 STORY-2 — GET /api/groups/[id]/roles/[roleId]/diff.
 *
 * What applying the template's current version would add and remove from this
 * group's copy. Read on ceremony open, never per listed entry (the spec's
 * performance budget), so the available-roles section stays one read.
 *
 * Private BFF plumbing: session handling, SQLSTATE→HTTP mapping, telemetry.
 * `get_role_copy_diff` is SECURITY DEFINER and re-checks `manage_roles`
 * itself, so this route is not the home of any rule (ADR-U038) — a sibling
 * Surface calling the same RPC inherits the identical gate. GET-exporting
 * file, so identity reads locally via `getVerifiedUserId` (ADR-U037).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; roleId: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('roles.diff_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, roleId } = await params;

  try {
    const diff = await fetchRoleCopyDiff(supabase, roleId);
    emitTelemetry('roles.diff_read', { actor: userId, group: id, role: roleId });
    return NextResponse.json({ diff });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('roles.diff_refused', { actor: userId, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      // Ghost role id, foreign role id, or a role with no source template —
      // the contract's own message says which, and none of the three leaks
      // existence to a caller who could not read the group anyway.
      emitTelemetry('roles.diff_missing', { actor: userId, code });
      return NextResponse.json({ error: message ?? 'Role not found' }, { status: 404 });
    }
    emitTelemetry('roles.diff_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to read the update' }, { status: 500 });
  }
}
