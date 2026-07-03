import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchOwnSessions } from '@/lib/sessions/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036 addendum): Edge runtime + `dub1` pin — GET is the /sessions
// page's initial-render read path (the journal-route precedent). Edge-safe
// (a single SECURITY DEFINER RPC, no Node-only imports).
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * FEAT-H012 — GET /api/sessions (IDN-11).
 *
 * The caller's own per-device session inventory via the FEAT-PC009
 * `get_own_sessions()` contract. Private BFF plumbing per ADR-U038 — the
 * contract self-gates (FIM-only, own rows, survives suspension); this route
 * only maps session → 401 and SQLSTATE → HTTP. Telemetry is content-free:
 * `user_agent` / `ip` values never appear in events or error payloads.
 */
export async function GET() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('sessions.list_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const sessions = await fetchOwnSessions(supabase);
    emitTelemetry('sessions.list', { actor: userId, count: sessions.length });
    return NextResponse.json({ sessions });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501') {
      emitTelemetry('sessions.list_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Sessions are for members' }, { status: 403 });
    }
    emitTelemetry('sessions.list_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}
