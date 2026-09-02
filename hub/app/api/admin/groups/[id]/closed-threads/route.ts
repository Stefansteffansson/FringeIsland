import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchAdminClosedGroupThreads } from '@/lib/admin/content';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// TASK-SEAL-01 (Hub half): a CLOSED group's preserved thread set for the
// admin plane — sealed threads included and labelled, through the one
// contract that returns them (`admin_get_group_conversations`, ruling B1
// re-scoped to `closed`). Private BFF per ADR-U038: the rule (who may read,
// which state) lives platform-side; this route collapses every refusal to
// the admin-plane 404 shape and records the read durably (an admin-plane
// event — the Q2 criteria). Read path → ADR-U037 local identity.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.closed_group_threads_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const { data, refused, notFound } = await fetchAdminClosedGroupThreads(supabase, id);
    if (refused || notFound || !data) {
      emitTelemetry('admin.closed_group_threads_refused', { actor: userId, group: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.closed_group_threads_read', {
      actor: userId,
      group: id,
      threads: data.length,
      sealed: data.filter((t) => t.is_sealed).length,
    });
    return NextResponse.json({ threads: data });
  } catch (err) {
    emitTelemetry('admin.closed_group_threads_failed', {
      actor: userId,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to load the preserved threads' }, { status: 500 });
  }
}
