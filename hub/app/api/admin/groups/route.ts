import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchAdminGroups, AdminGroupsError } from '@/lib/admin/groups';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H035: the admin group list (FEAT-PC020 admin_get_groups). Presentation
// only (ADR-U038): the platform's 42501 becomes the admin-plane 404 shape.

export async function GET(request: Request) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.groups_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const filter = new URL(request.url).searchParams.get('filter') ?? 'all';
  try {
    const { groups, refused } = await fetchAdminGroups(supabase, filter);
    if (refused || !groups) {
      emitTelemetry('admin.groups_refused', { actor: userId });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.groups_read', { actor: userId, filter });
    return NextResponse.json({ groups });
  } catch (err) {
    if (err instanceof AdminGroupsError && err.code === '22023') {
      emitTelemetry('admin.groups_bad_filter', { actor: userId, filter });
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    emitTelemetry('admin.groups_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load groups' }, { status: 500 });
  }
}
