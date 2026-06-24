import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { recordAuditEntry } from '@/lib/audit/audit';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * POST /api/auth/audit — V1 Administration seam for the sign-in action.
 * The client calls this after a successful sign-in; the server verifies the
 * session from the cookie (API-first — the action is recorded server-side,
 * not trusted from the client) and records the audit entry.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  recordAuditEntry({
    actorAuthId: user.id,
    action: 'auth.sign_in',
    props: { email: user.email },
  });
  emitTelemetry('auth.sign_in_recorded', { actor: user.id });

  return NextResponse.json({ ok: true });
}
