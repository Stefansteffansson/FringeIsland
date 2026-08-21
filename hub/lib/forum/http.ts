import { NextResponse } from 'next/server';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { availabilityRefusal } from '@/lib/groups/http';

/**
 * FEAT-H026 — the forum BFF's SQLSTATE → HTTP presentation mapping
 * (ADR-U038: presentation only — every gate lives in the substrate).
 * 42501 (missing permission / not a member / Mist or suspended actor) → 403;
 * 22023 (empty content) → 400; P0001 (flat-threading: reply-to-a-reply) → 400;
 * P0002 (no such post/parent) → 404; else 500.
 * Telemetry is content-free: post bodies never appear in events.
 */
export function mapForumError(
  err: unknown,
  event: string,
  actor: string | undefined,
): NextResponse {
  const code = (err as { code?: string }).code;
  emitTelemetry(event, { actor, code });
  // FEAT-H038 STORY-5: the FEAT-PC023 availability refusals pass through
  // verbatim (409) — every other P0001 keeps the flat-threading 400 below.
  const availability = availabilityRefusal(err);
  if (availability) return availability;
  if (code === '42501') {
    // FEAT-H046 STORY-2 over FEAT-PD019: the wielding gate's limb-naming
    // refusals surface verbatim (the mapForumOwnMutationError window
    // precedent) — a stale hat learns WHICH limb failed, not "Not allowed".
    const message = (err as { message?: string }).message ?? '';
    if (/acting group|act as this group/i.test(message)) {
      return NextResponse.json({ error: message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
  }
  if (code === '22023' || code === 'P0001') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  if (code === 'P0002') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ error: 'Request failed' }, { status: 500 });
}

/**
 * FEAT-H028 — the own-edit/own-delete presentation mapping. Same shape as
 * `mapForumError`. TASK-EDT-01 retired the 15-minute window and its dedicated
 * refusal copy — every 42501 maps to the generic refusal now. The client
 * preserves the draft either way (the H026 optimistic-with-retry posture).
 */
export function mapForumOwnMutationError(
  err: unknown,
  event: string,
  actor: string | undefined,
): NextResponse {
  const code = (err as { code?: string }).code;
  emitTelemetry(event, { actor, code });
  // FEAT-H038 STORY-5: availability refusals pass through verbatim here too —
  // own-edit/own-delete doors are frozen while the group is held.
  const availability = availabilityRefusal(err);
  if (availability) return availability;
  if (code === '42501') {
    // TASK-EDT-01: the 15-minute window refusal died with the contract's edge;
    // every 42501 maps to the generic refusal.
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
