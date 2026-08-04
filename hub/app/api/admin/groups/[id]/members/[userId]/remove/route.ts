import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { removeAdminUserFromGroup, AdminUsersError } from '@/lib/admin/users';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H041: the wing's remove act — the FEAT-PC021 door
// (admin_remove_member_from_group, keyed by public.users.id — hence the
// [userId] segment; the PC026 members re-issue serves the key). Same wrapper
// and durable event as the ADM-C member-console route: one act, one door.
// The ceremony's reason is deliberateness friction only — PC021's signature
// carries no reason, and it never enters telemetry.

const refusalStatus = (code: string): number | null => {
  if (code === '42501' || code === 'P0002') return 404; // admin-plane existence-hiding
  if (code === 'P0001') return 409;
  return null;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    emitTelemetry('admin.member_remove_from_group_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id, userId } = await params;
  try {
    const result = await removeAdminUserFromGroup(supabase, userId, id);
    await emitDurableTelemetry(supabase, 'admin.member_remove_from_group', {
      actor: user.id,
      user: userId,
      group: id,
      scenario: result.scenario,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AdminUsersError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.member_remove_from_group_refused', {
          actor: user.id,
          user: userId,
          group: id,
          code: err.code,
        });
        return NextResponse.json(
          { error: status === 404 ? 'Not found' : err.message },
          { status },
        );
      }
    }
    emitTelemetry('admin.member_remove_from_group_failed', {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to remove the member' }, { status: 500 });
  }
}
