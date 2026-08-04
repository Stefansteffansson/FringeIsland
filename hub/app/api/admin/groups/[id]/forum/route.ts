import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchAdminGroupForum } from '@/lib/admin/content';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H041: the wing's forum read — the same get_group_forum door the
// member BFF uses; the FEAT-PC026 arms decide access. Refusal and not-found
// share the admin-plane 404 shape (existence-hiding). Telemetry ids only.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.group_forum_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const { data, refused, notFound } = await fetchAdminGroupForum(supabase, id);
    if (refused || notFound || !data) {
      emitTelemetry('admin.group_forum_refused', { actor: userId, group: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.group_forum_read', { actor: userId, group: id });
    return NextResponse.json({ posts: data });
  } catch (err) {
    emitTelemetry('admin.group_forum_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load the forum' }, { status: 500 });
  }
}
