import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchOwnDataExport } from '@/lib/account/export';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-PC008 — GET /api/account/export (IDN-8).
 *
 * Thin proxy (ADR-U038): ONE call to the `get_own_data_export()` SECURITY
 * DEFINER contract returns the caller's complete personal-data document —
 * since COR-A W8 (audit finding AC-4) the platform composes the journal
 * (FEAT-PD001) and walks (FEAT-PD007) sections into the document itself, so
 * export COMPLETENESS is the platform's contract and this route re-assembles
 * nothing. The same call records the durable export-event. The route only
 * carries session plumbing and presentation: the document is returned as a
 * downloadable file (Content-Disposition: attachment) — the "receive" half of
 * IDN-8's "request and receive." Auth is the `@supabase/ssr` cookie session
 * (the shipped Hub house style, per FEAT-PC003/PC006/PC007). Per ADR-U038 this
 * is a private Hub BFF route, so `/api/v1` + Bearer bind the platform surface
 * (PostgREST RPC), not this BFF path — cookie-session + unversioned is
 * conformant.
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
      journal_entries: data.journal.entries.length,
      journey_walks: data.journeys.length,
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
