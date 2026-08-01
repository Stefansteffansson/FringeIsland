import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { removeAdminUserFromGroup, AdminUsersError } from '@/lib/admin/users';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H036: targeted removal (FEAT-PC021 admin_remove_member_from_group —
// ADM-18). The platform classifies and returns the scenario; it passes
// through for the success rendering.

const refusalStatus = (code: string): number | null => {
  if (code === '42501' || code === 'P0002') return 404;
  if (code === 'P0001') return 409;
  if (code === '22023') return 400;
  return null;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let body: { groupId?: string };
  try {
    body = (await request.json()) as { groupId?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  if (!body.groupId) {
    return NextResponse.json({ error: 'groupId is required.' }, { status: 400 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    emitTelemetry('admin.member_remove_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const result = await removeAdminUserFromGroup(supabase, id, body.groupId);
    await emitDurableTelemetry(supabase, 'admin.member_remove_from_group', {
      actor: user.id,
      member: id,
      group: body.groupId,
      scenario: result.scenario,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AdminUsersError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.member_remove_refused', { actor: user.id, member: id, code: err.code });
        return NextResponse.json({ error: status === 404 ? 'Not found' : err.message }, { status });
      }
    }
    emitTelemetry('admin.member_remove_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to remove the member from the group' }, { status: 500 });
  }
}
