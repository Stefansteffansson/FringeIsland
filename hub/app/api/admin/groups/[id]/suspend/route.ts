import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { suspendAdminGroup, AdminGroupsError } from '@/lib/admin/groups';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H035: suspend (FEAT-PC020 admin_suspend_group). The platform refuses
// wrong-kind (22023) and wrong-state (P0001) typed; messages pass verbatim.

const refusalStatus = (code: string): number | null => {
  if (code === '42501' || code === 'P0002') return 404; // admin-plane existence-hiding
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
    emitTelemetry('admin.group_suspend_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await suspendAdminGroup(supabase, id);
    await emitDurableTelemetry(supabase, 'admin.group_suspend', { actor: user.id, group: id });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminGroupsError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.group_suspend_refused', { actor: user.id, group: id, code: err.code });
        return NextResponse.json(
          { error: status === 404 ? 'Not found' : err.message },
          { status },
        );
      }
    }
    emitTelemetry('admin.group_suspend_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to suspend group' }, { status: 500 });
  }
}
