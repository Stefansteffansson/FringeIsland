import { NextResponse } from 'next/server';

/**
 * FEAT-H038 STORY-5 (W-3 surface half) — the group-availability refusal
 * mapping, shared by every BFF mapper whose door FEAT-PC023 froze.
 *
 * The substrate's canonical availability refusals are P0001 with the contract
 * messages 'group is resting' / 'group is suspended' (assert_group_writable
 * and the door re-issues). They map to 409 with the message passed through
 * verbatim — the message IS the member copy (the W-8 idiom). Keyed on
 * SQLSTATE + canonical message and open to new availability cases; every
 * other refusal stays with its domain mapper (a P0001 that is not an
 * availability refusal returns null here).
 */
const AVAILABILITY_MESSAGES = new Set(['group is resting', 'group is suspended']);

export function availabilityRefusal(err: unknown): NextResponse | null {
  const { code, message } = err as { code?: string; message?: string };
  if (code !== 'P0001' || !message || !AVAILABILITY_MESSAGES.has(message)) return null;
  return NextResponse.json({ error: message }, { status: 409 });
}
