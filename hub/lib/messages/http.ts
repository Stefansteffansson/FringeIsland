import { NextResponse } from 'next/server';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { availabilityRefusal } from '@/lib/groups/http';

/**
 * FEAT-H025 — the messages BFF's SQLSTATE → HTTP presentation mapping
 * (ADR-U038: presentation only — every gate lives in the substrate).
 * 42501 (not a participant / not a member / missing permission / Mist or
 * suspended actor) → 403; 22023 (empty content / self-DM) → 400;
 * P0002 (no such conversation/recipient) → 404; else 500.
 * Telemetry is content-free: message bodies never appear in events.
 */
export function mapContractError(
  err: unknown,
  event: string,
  actor: string | undefined,
): NextResponse {
  const code = (err as { code?: string }).code;
  emitTelemetry(event, { actor, code });
  // FEAT-H038 STORY-5: the FEAT-PC023 availability refusals pass through
  // verbatim — a group-kind conversation in a held group refuses legibly
  // (the DM lane is deliberately never held: send_message guards group-kind only).
  const availability = availabilityRefusal(err);
  if (availability) return availability;
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
