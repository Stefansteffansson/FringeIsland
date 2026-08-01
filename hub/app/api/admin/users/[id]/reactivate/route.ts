import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reactivateAdminUser, AdminUsersError } from '@/lib/admin/users';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H036: reactivate (FEAT-PC021 admin_update_user_status, active=true).
// The decommission wall and the no-op guard refuse P0001 — verbatim 409.

const refusalStatus = (code: string): number | null => {
  if (code === '42501' || code === 'P0002') return 404;
  if (code === 'P0001') return 409;
  if (code === '22023') return 400;
  return null;
};

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    emitTelemetry('admin.member_reactivate_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await reactivateAdminUser(supabase, id);
    await emitDurableTelemetry(supabase, 'admin.member_reactivate', { actor: user.id, member: id });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminUsersError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.member_reactivate_refused', { actor: user.id, member: id, code: err.code });
        return NextResponse.json({ error: status === 404 ? 'Not found' : err.message }, { status });
      }
    }
    emitTelemetry('admin.member_reactivate_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to reactivate member' }, { status: 500 });
  }
}
