import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  acceptGroupInvitation,
  declineGroupInvitation,
} from '@/lib/groups/invitations';
import { availabilityRefusal } from '@/lib/groups/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H015 — POST (accept) / DELETE (decline) /api/me/invitations/[groupId]
 * (STORY-4). Self-scoped substrate semantics (FEAT-PC012): accept flips the
 * caller's own invited row to active (Member-role auto-bind + the durable
 * accepted-notification ride substrate-side); decline deletes it. No pending
 * invitation is P0002 → 404. Mutations → per-request getUser; telemetry
 * id-only.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('invitations.accept_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { groupId } = await params;

  try {
    await acceptGroupInvitation(supabase, groupId);
    emitTelemetry('invitations.accept', { actor: user.id, group: groupId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    // FEAT-H038 STORY-5: a held group's frozen accept door speaks verbatim.
    const availability = availabilityRefusal(err);
    if (availability) {
      emitTelemetry('invitations.accept_refused', { actor: user.id, code });
      return availability;
    }
    if (code === 'P0002') {
      emitTelemetry('invitations.accept_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'No pending invitation' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('invitations.accept_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    emitTelemetry('invitations.accept_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to accept' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ groupId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('invitations.decline_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { groupId } = await params;

  try {
    await declineGroupInvitation(supabase, groupId);
    emitTelemetry('invitations.decline', { actor: user.id, group: groupId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    // FEAT-H038 STORY-5: declining into a held group refuses verbatim too.
    const availability = availabilityRefusal(err);
    if (availability) {
      emitTelemetry('invitations.decline_refused', { actor: user.id, code });
      return availability;
    }
    if (code === 'P0002') {
      emitTelemetry('invitations.decline_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'No pending invitation' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('invitations.decline_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    emitTelemetry('invitations.decline_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to decline' }, { status: 500 });
  }
}
