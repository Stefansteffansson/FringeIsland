import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { platformExitAdminUser, AdminUsersError } from '@/lib/admin/users';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H036: platform exit (FEAT-PC021 admin_exit_user_from_platform — the
// ADM-6 walk: three scenarios, terminal decommission, NO erasure). The
// per-group scenario payload passes through so success renders what actually
// happened.

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
    emitTelemetry('admin.member_platform_exit_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const result = await platformExitAdminUser(supabase, id);
    await emitDurableTelemetry(supabase, 'admin.member_platform_exit', {
      actor: user.id,
      member: id,
      groups_exited: result.groups_exited,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AdminUsersError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.member_platform_exit_refused', { actor: user.id, member: id, code: err.code });
        return NextResponse.json({ error: status === 404 ? 'Not found' : err.message }, { status });
      }
    }
    emitTelemetry('admin.member_platform_exit_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to exit member from the platform' }, { status: 500 });
  }
}
