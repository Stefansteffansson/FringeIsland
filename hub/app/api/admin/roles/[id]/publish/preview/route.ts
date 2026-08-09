import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { previewPublicationReach, AdminRolesError } from '@/lib/admin/roles';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * RD-B walk fix W-6 — GET /api/admin/roles/[id]/publish/preview
 *
 * How far a publish would reach, before it is made, so the ceremony can state
 * its blast radius before the click — the rule the Steward's diff ceremony
 * already honours with its holder count, and the admin's publish ceremony did
 * not.
 *
 * Scope is EXPLICIT, never inferred:
 *   ?scope=all          platform-wide
 *   ?groups=id1,id2     those groups
 *   neither             400
 *
 * The same discipline as the publish route itself: a lost or malformed
 * parameter must never quietly become "everyone". Here that would mean
 * previewing an act far larger than the one being asked about, which is worse
 * than showing no number at all.
 *
 * Read-only; `admin_preview_publication_reach` is STABLE and admin-gated, so
 * this route decides nothing (ADR-U038). GET-exporting file, so identity reads
 * locally via `getVerifiedUserId` (ADR-U037).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.publication_preview_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const search = new URL(request.url).searchParams;
  const scope = search.get('scope');
  const groups = search.get('groups');

  let groupIds: string[] | null;
  if (scope === 'all') {
    groupIds = null;
  } else if (groups) {
    groupIds = groups.split(',').filter(Boolean);
    if (groupIds.length === 0) {
      return NextResponse.json({ error: 'groups must name at least one group' }, { status: 400 });
    }
  } else {
    return NextResponse.json(
      { error: 'Send scope=all, or groups=<comma-separated ids>' },
      { status: 400 },
    );
  }

  try {
    const { preview, refused } = await previewPublicationReach(supabase, id, groupIds);
    if (refused || !preview) {
      emitTelemetry('admin.publication_preview_refused', { actor: userId, target: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ preview });
  } catch (err) {
    if (err instanceof AdminRolesError) {
      if (err.code === '22023') {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err.code === 'P0002') {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
      }
    }
    emitTelemetry('admin.publication_preview_failed', {
      actor: userId,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to read the publication reach' }, { status: 500 });
  }
}
