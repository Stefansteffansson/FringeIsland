import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { wakeAdminGroup, AdminGroupsError } from '@/lib/admin/groups';
import { readJsonBody, requiredReason } from '@/lib/admin/reason';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H038 STORY-6: the admin wake ceremony (FEAT-PC023 admin_wake_group —
// resting → active only; suspended → active stays the reactivate route's).
// The platform refuses wrong-state (P0001) typed; messages pass verbatim.

const refusalStatus = (code: string): number | null => {
  if (code === '42501' || code === 'P0002') return 404; // admin-plane existence-hiding
  if (code === 'P0001') return 409;
  if (code === '22023') return 400;
  return null;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    emitTelemetry('admin.group_wake_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  // FEAT-H049 (DB-4): the member-facing reason is REQUIRED (FEAT-PC030 22023);
  // refused blank up front, never logged, never in telemetry.
  const reason = requiredReason(await readJsonBody(request));
  if (reason === null) {
    emitTelemetry('admin.group_wake_refused', { actor: user.id, group: id, code: '22023' });
    return NextResponse.json({ error: 'Reason required' }, { status: 400 });
  }
  try {
    await wakeAdminGroup(supabase, id, reason);
    await emitDurableTelemetry(supabase, 'admin.group_wake', { actor: user.id, group: id });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminGroupsError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.group_wake_refused', { actor: user.id, group: id, code: err.code });
        return NextResponse.json(
          { error: status === 404 ? 'Not found' : err.message },
          { status },
        );
      }
    }
    emitTelemetry('admin.group_wake_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to wake group' }, { status: 500 });
  }
}
