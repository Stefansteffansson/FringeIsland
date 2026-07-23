import { NextResponse } from 'next/server';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H030 — the notifications BFF's SQLSTATE → HTTP presentation mapping
 * (ADR-U038: presentation only — every gate lives in the FEAT-PD013
 * substrate). 42501 (not authorized / Mist or suspended actor) → 403;
 * P0002 (no such row) → 404; else 500. Telemetry is content-free.
 */
export function mapNotificationError(
  err: unknown,
  event: string,
  actor: string | undefined,
): NextResponse {
  const code = (err as { code?: string }).code;
  emitTelemetry(event, { actor, code });
  if (code === '42501') {
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  if (code === 'P0002') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ error: 'Request failed' }, { status: 500 });
}
