import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { suspendAdminUser, AdminUsersError } from '@/lib/admin/users';
import { readJsonBody, requiredReason } from '@/lib/admin/reason';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H036: suspend (FEAT-PC021 admin_update_user_status, active=false).
// State refusals (P0001, incl. the no-op guard) pass verbatim as 409.

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
    emitTelemetry('admin.member_suspend_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  // FEAT-H049 (DB-4): the member-facing reason is REQUIRED (FEAT-PC030 22023);
  // refused blank up front, never logged, never in telemetry.
  const reason = requiredReason(await readJsonBody(request));
  if (reason === null) {
    emitTelemetry('admin.member_suspend_refused', { actor: user.id, member: id, code: '22023' });
    return NextResponse.json({ error: 'Reason required' }, { status: 400 });
  }
  try {
    await suspendAdminUser(supabase, id, reason);
    await emitDurableTelemetry(supabase, 'admin.member_suspend', { actor: user.id, member: id });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminUsersError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.member_suspend_refused', { actor: user.id, member: id, code: err.code });
        return NextResponse.json({ error: status === 404 ? 'Not found' : err.message }, { status });
      }
    }
    emitTelemetry('admin.member_suspend_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to suspend member' }, { status: 500 });
  }
}
