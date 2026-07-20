import { NextResponse } from 'next/server';
import { emitTelemetry } from '@/lib/observability/telemetry';

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
  if (code === '42501') {
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
 * `mapForumError`, but the 42501 window-edge refusal (its message matches
 * /window/i, FEAT-PD011) is surfaced honestly so the author learns the window
 * closed — not a generic "Not allowed". The client preserves the draft either
 * way (the H026 optimistic-with-retry posture).
 */
export function mapForumOwnMutationError(
  err: unknown,
  event: string,
  actor: string | undefined,
): NextResponse {
  const code = (err as { code?: string }).code;
  const message = (err as { message?: string }).message ?? '';
  emitTelemetry(event, { actor, code });
  if (code === '42501') {
    if (/window/i.test(message)) {
      return NextResponse.json(
        { error: 'Your 15-minute edit window has closed.' },
        { status: 403 },
      );
    }
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
