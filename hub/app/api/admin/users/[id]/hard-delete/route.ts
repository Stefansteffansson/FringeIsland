import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { hardDeleteAdminUser, AdminUsersError } from '@/lib/admin/users';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H036: hard delete (FEAT-PC021 admin_hard_delete_user). The last
// resort — audit-before-delete and the [Deleted User] sentinel cascade are
// the platform's; the surface only carries the ceremony. A consent-FK
// refusal (23503) has no refusal mapping and lands on 500 deliberately —
// erasure of a consented FIM routes through erase_fim_account, not here.

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
    emitTelemetry('admin.member_hard_delete_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    // Durable telemetry BEFORE the delete: the actor session survives, but the
    // mutation is terminal — emitting after would race nothing, yet emitting
    // first mirrors the platform's own audit-before-delete ordering.
    await emitDurableTelemetry(supabase, 'admin.member_hard_delete', { actor: user.id, member: id });
    await hardDeleteAdminUser(supabase, id);
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminUsersError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.member_hard_delete_refused', { actor: user.id, member: id, code: err.code });
        return NextResponse.json({ error: status === 404 ? 'Not found' : err.message }, { status });
      }
    }
    emitTelemetry('admin.member_hard_delete_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to delete member' }, { status: 500 });
  }
}
