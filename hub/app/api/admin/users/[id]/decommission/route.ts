import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { decommissionAdminUser, AdminUsersError } from '@/lib/admin/users';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H036: decommission (FEAT-PC021 admin_decommission_user). Terminal;
// memberships preserved platform-side (B-ADMIN-008).

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
    emitTelemetry('admin.member_decommission_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await decommissionAdminUser(supabase, id);
    await emitDurableTelemetry(supabase, 'admin.member_decommission', { actor: user.id, member: id });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminUsersError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.member_decommission_refused', { actor: user.id, member: id, code: err.code });
        return NextResponse.json({ error: status === 404 ? 'Not found' : err.message }, { status });
      }
    }
    emitTelemetry('admin.member_decommission_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to decommission member' }, { status: 500 });
  }
}
