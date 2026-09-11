import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateAdminUserEmail, AdminUsersError } from '@/lib/admin/users';
import { readJsonBody, requiredReason } from '@/lib/admin/reason';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H050 / ADR-U054: correct a member's login email (FEAT-PC031
// admin_update_user_email). Presentation-only under ADR-U038 — the CONTRACT
// owns every rule: the admin gate, the address normalisation and validation,
// the collision check, the Mist refusal, the three-store transaction. The two
// body checks below are defense-in-depth so an obviously-empty ceremony never
// costs a round-trip.
//
// Neither the reason nor either address enters telemetry — ids only.

const refusalStatus = (code: string): number | null => {
  if (code === '42501' || code === 'P0002') return 404; // admin-plane existence-hiding
  if (code === 'P0001') return 409; // collision, no-op, Mist, no address on record
  if (code === '22023') return 400; // blank reason, malformed address
  return null;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    emitTelemetry('admin.member_email_change_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;

  const body = await readJsonBody(request);
  const reason = requiredReason(body);
  if (reason === null) {
    emitTelemetry('admin.member_email_change_refused', { actor: user.id, member: id, code: '22023' });
    return NextResponse.json({ error: 'Reason required' }, { status: 400 });
  }
  const rawEmail = typeof body.email === 'string' ? body.email : '';
  if (rawEmail.trim().length === 0) {
    emitTelemetry('admin.member_email_change_refused', { actor: user.id, member: id, code: '22023' });
    return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
  }

  try {
    const result = await updateAdminUserEmail(supabase, id, rawEmail, reason);
    await emitDurableTelemetry(supabase, 'admin.member_email_change', { actor: user.id, member: id });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AdminUsersError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.member_email_change_refused', {
          actor: user.id,
          member: id,
          code: err.code,
        });
        return NextResponse.json({ error: status === 404 ? 'Not found' : err.message }, { status });
      }
    }
    emitTelemetry('admin.member_email_change_failed', { actor: user.id, member: id });
    return NextResponse.json({ error: 'Failed to change the member’s email address' }, { status: 500 });
  }
}
