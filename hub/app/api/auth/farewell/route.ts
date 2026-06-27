/**
 * FEAT-H004 STORY-3 — the farewell route ("say goodbye"). Runs the FEAT-PC002
 * explicit-erase RPC behind the API boundary (no browser RPC — ADR-U009),
 * authenticated, and records the V1 audit + V4 telemetry seams. It fires NO
 * notification (a leaving Mist holds no durable address — Notifications vertical
 * = none). The client signs out AFTER this returns, dropping to the sessionless
 * entry.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { explicitEraseMist } from '@/lib/auth/farewell';
import { recordAuditEntry } from '@/lib/audit/audit';
import { emitTelemetry } from '@/lib/observability/telemetry';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('farewell.failed', { reason: 'unauthenticated' });
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  emitTelemetry('farewell.requested', { actor: user.id });

  const { error } = await explicitEraseMist(supabase);
  if (error) {
    // V4 — failure surfaced, never swallowed. The owner-only / temporary-only
    // guards live in the RPC; a FIM caller is refused there (42501).
    emitTelemetry('farewell.failed', { actor: user.id, reason: 'erase_error' });
    return NextResponse.json(
      { error: 'Could not erase your visit. Please try again.' },
      { status: 400 },
    );
  }

  recordAuditEntry({ actorAuthId: user.id, action: 'mist.explicit_erase' });
  emitTelemetry('farewell.succeeded', { actor: user.id });
  return NextResponse.json({ ok: true });
}
