import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reassignAdminGroupStewardship, AdminGroupsError } from '@/lib/admin/groups';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H035: the RW-05 exit (FEAT-PC020 admin_reassign_group_stewardship).
// Body: { newStewardGroupId } — a personal-group id (the membership model).

const refusalStatus = (code: string): number | null => {
  if (code === '42501' || code === 'P0002') return 404; // admin-plane existence-hiding
  if (code === 'P0001' || code === '23505') return 409;
  if (code === '22023') return 400;
  return null;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    emitTelemetry('admin.group_reassign_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  let newStewardGroupId: string | undefined;
  try {
    ({ newStewardGroupId } = (await request.json()) as { newStewardGroupId?: string });
  } catch {
    newStewardGroupId = undefined;
  }
  if (!newStewardGroupId) {
    return NextResponse.json({ error: 'newStewardGroupId is required' }, { status: 400 });
  }
  try {
    await reassignAdminGroupStewardship(supabase, id, newStewardGroupId);
    await emitDurableTelemetry(supabase, 'admin.group_reassign', {
      actor: user.id,
      group: id,
      new_steward: newStewardGroupId,
    });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminGroupsError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.group_reassign_refused', {
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
    emitTelemetry('admin.group_reassign_failed', {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to reassign stewardship' }, { status: 500 });
  }
}
