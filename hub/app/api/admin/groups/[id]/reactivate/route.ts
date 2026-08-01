import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reactivateAdminGroup, AdminGroupsError } from '@/lib/admin/groups';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H035: reactivate (FEAT-PC020 admin_reactivate_group).

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
    emitTelemetry('admin.group_reactivate_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    await reactivateAdminGroup(supabase, id);
    await emitDurableTelemetry(supabase, 'admin.group_reactivate', { actor: user.id, group: id });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminGroupsError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.group_reactivate_refused', {
          actor: user.id,
          group: id,
          code: err.code,
        });
        return NextResponse.json(
          { error: status === 404 ? 'Not found' : err.message },
          { status },
        );
      }
    }
    emitTelemetry('admin.group_reactivate_failed', {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to reactivate group' }, { status: 500 });
  }
}
