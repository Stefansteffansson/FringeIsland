import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchAdminUsersPage, AdminUsersError } from '@/lib/admin/users';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H039: the bounded admin member list (FEAT-PC024 admin_get_users).
// Presentation only (ADR-U038): the platform's 42501 becomes the admin-plane
// 404 shape; the open filter namespace and the keyset/search semantics pass
// through untouched (22023 on unknown filter or incomplete cursor). The
// search string never reaches telemetry — it is member personal data.

export async function GET(request: Request) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.members_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const filter = params.get('filter') ?? 'default';
  try {
    const { page, refused } = await fetchAdminUsersPage(supabase, {
      filter,
      search: params.get('search'),
      afterName: params.get('after_name'),
      afterId: params.get('after_id'),
    });
    if (refused || !page) {
      emitTelemetry('admin.members_refused', { actor: userId });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.members_read', {
      actor: userId,
      filter,
      paged: params.has('after_id'),
      searched: params.has('search'),
    });
    return NextResponse.json(page);
  } catch (err) {
    if (err instanceof AdminUsersError && err.code === '22023') {
      emitTelemetry('admin.members_bad_filter', { actor: userId, filter });
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    emitTelemetry('admin.members_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }
}
