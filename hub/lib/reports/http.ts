import { NextResponse } from 'next/server';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H028 — the reports BFF's SQLSTATE -> HTTP presentation mapping
 * (ADR-U038: presentation only — every rule lives in the FEAT-PD011 substrate).
 * 42501 (not visible to the reporter / Mist or suspended actor) -> 403;
 * 22023 (invalid input, including own-content and unknown target_kind) -> 400;
 * P0002 (no such target) -> 404; else 500. The not-visible and not-existing
 * cases are deliberately indistinguishable (no existence oracle). Telemetry is
 * content-free: reasons/details/snapshots never appear in events.
 */
export function mapReportError(
  err: unknown,
  event: string,
  actor: string | undefined,
): NextResponse {
  const code = (err as { code?: string }).code;
  emitTelemetry(event, { actor, code });
  if (code === '42501') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  if (code === '22023') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (code === 'P0002') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ error: 'Request failed' }, { status: 500 });
}
