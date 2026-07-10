import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revokeOwnSession } from '@/lib/sessions/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H012 — DELETE /api/sessions/[id] (IDN-11, STORY-2).
 *
 * Targeted remote sign-out via the FEAT-PC009 `revoke_own_session()` contract.
 * The substrate self-gates (own-row only; P0002 refuses foreign and
 * nonexistent ids identically — no existence leak) and emits the ADR-U039
 * revocation hint server-side. SQLSTATE → HTTP: P0002 → 404; 42501 → 403;
 * else 500. Telemetry is content-free — no UA/IP, ever.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('sessions.revoke_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await revokeOwnSession(supabase, id);
    emitTelemetry('sessions.revoke', { actor: user.id });
    return NextResponse.json({ revoked: id });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P0002') {
      emitTelemetry('sessions.revoke_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('sessions.revoke_refused', { actor: user.id, code });
      return NextResponse.json({ error: 'Sessions are for members' }, { status: 403 });
    }
    emitTelemetry('sessions.revoke_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to sign out the session' }, { status: 500 });
  }
}
