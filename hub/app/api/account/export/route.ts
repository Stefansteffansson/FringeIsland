import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchOwnDataExport } from '@/lib/account/export';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-PC008 — GET /api/account/export (IDN-8).
 *
 * Assembles the authenticated caller's own complete personal data into one
 * versioned document via the `get_own_data_export()` SECURITY DEFINER contract
 * (which also records the durable export-event), and returns it as a downloadable
 * file (Content-Disposition: attachment) — the "receive" half of IDN-8's "request
 * and receive." Additive route (ADR-U015). Auth is the `@supabase/ssr` cookie
 * session (the shipped Hub house style, per FEAT-PC003/PC006/PC007). Per ADR-U038
 * this is a private Hub BFF route, so `/api/v1` + Bearer bind the platform surface
 * (PostgREST RPC), not this BFF path — cookie-session + unversioned is conformant.
 *
 * A sessionless caller is gated here with 401 before the contract is reached.
 * Failures surface (500) and never return a partial document.
 */
const EXPORT_FILENAME = 'fringeisland-data-export.json';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('account.export_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const data = await fetchOwnDataExport(supabase);
    emitTelemetry('account.export', {
      actor: user.id,
      schema_version: data.schema_version,
      consent_events: data.consent.length,
      memberships: data.memberships.length,
    });
    return NextResponse.json(data, {
      headers: {
        'Content-Disposition': `attachment; filename="${EXPORT_FILENAME}"`,
      },
    });
  } catch (err) {
    emitTelemetry('account.export_failed', {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to assemble data export' }, { status: 500 });
  }
}
