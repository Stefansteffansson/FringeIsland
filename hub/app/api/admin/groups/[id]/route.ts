import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchAdminGroupDetail } from '@/lib/admin/groups';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H035: admin group detail (FEAT-PC020 admin_get_group_detail).
// Refusal and not-found share the admin-plane 404 shape (existence-hiding).

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.group_detail_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const { detail, refused, notFound } = await fetchAdminGroupDetail(supabase, id);
    if (refused || notFound || !detail) {
      emitTelemetry('admin.group_detail_refused', { actor: userId, group: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.group_detail_read', { actor: userId, group: id });
    return NextResponse.json({ detail });
  } catch (err) {
    emitTelemetry('admin.group_detail_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load group' }, { status: 500 });
  }
}
