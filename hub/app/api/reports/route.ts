import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { submitContentReportRpc } from '@/lib/reports/queries';
import { mapReportError } from '@/lib/reports/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H028 — POST /api/reports (COM-13): submit a content report. Visibility,
 * own-content refusal, target-kind validation, snapshotting, and idempotency
 * are all substrate-side (FEAT-PD011); the route only shapes presentation and
 * emits content-free telemetry (reasons/details never appear in events).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { target_kind?: unknown; target_id?: unknown; reason?: unknown; details?: unknown }
    | null;
  const targetKind = payload?.target_kind;
  const targetId = payload?.target_id;
  const reason = payload?.reason;
  const details = payload?.details;
  if (
    typeof targetKind !== 'string' ||
    typeof targetId !== 'string' ||
    typeof reason !== 'string' ||
    reason.trim() === ''
  ) {
    return NextResponse.json({ error: 'A report needs a target and a reason' }, { status: 400 });
  }

  try {
    const report = await submitContentReportRpc(
      supabase,
      targetKind,
      targetId,
      reason,
      typeof details === 'string' && details.trim() !== '' ? details : undefined,
    );
    emitTelemetry('reports.submitted', { actor: user.id, targetKind });
    return NextResponse.json({ report }, { status: 201 });
  } catch (err) {
    return mapReportError(err, 'reports.submit_failed', user.id);
  }
}
