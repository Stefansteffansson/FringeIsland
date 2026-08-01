import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchAdminUserDetail, fetchOwnUserId } from '@/lib/admin/users';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H036: the admin member detail (FEAT-PC021 admin_get_user_detail).
// Presentation only (ADR-U038): 42501 AND P0002 take the admin-plane 404
// shape (existence-hiding). viewer_is_self is BFF shaping for the self-revoke
// ceremony copy — the platform enforces nothing about self-revocation beyond
// the last-admin floor, which refuses on its own.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.member_detail_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const { detail, refused, notFound } = await fetchAdminUserDetail(supabase, id);
    if (refused || notFound || !detail) {
      emitTelemetry('admin.member_detail_refused', { actor: userId, member: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const ownId = await fetchOwnUserId(supabase);
    await emitDurableTelemetry(supabase, 'admin.member_detail_read', { actor: userId, member: id });
    return NextResponse.json({ detail, viewer_is_self: ownId !== null && ownId === detail.id });
  } catch (err) {
    emitTelemetry('admin.member_detail_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load member' }, { status: 500 });
  }
}
