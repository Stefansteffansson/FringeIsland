import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { respondToGroupInvitation } from '@/lib/groups/acting';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H018 — POST /api/groups/[id]/acting/respond (STORY-3, the wielded
 * answer). [id] is the ACTING group (the invited one); the body names the
 * membership row and the decision. The FEAT-PC015 contract gates on the
 * caller's act_as_group key in the invited group (ADR-U041 §1) and records
 * the wielding hand at audit level (§2b, platform-side). P0001 staleness
 * (context no longer active) passes through verbatim as 409.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('acting.respond_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as
    | { membership_id?: string; accept?: boolean }
    | null;
  if (!body?.membership_id || typeof body.accept !== 'boolean') {
    emitTelemetry('acting.respond_bad_body', { actor: userId, acting: id });
    return NextResponse.json(
      { error: 'membership_id and accept are required' },
      { status: 400 },
    );
  }

  try {
    const result = await respondToGroupInvitation(supabase, body.membership_id, body.accept);
    emitTelemetry('acting.respond', {
      actor: userId,
      acting: id,
      accepted: body.accept,
    });
    return NextResponse.json(result);
  } catch (err) {
    const e = err as { code?: string; message?: string };
    if (e.code === 'P0001' || e.code === '22023') {
      emitTelemetry('acting.respond_refused', { actor: userId, acting: id, code: e.code });
      return NextResponse.json({ error: e.message ?? 'Answer refused' }, { status: 409 });
    }
    if (e.code === '42501') {
      emitTelemetry('acting.respond_forbidden', { actor: userId, acting: id, code: e.code });
      return NextResponse.json(
        { error: e.message ?? 'You do not have permission to act as this group' },
        { status: 403 },
      );
    }
    if (e.code === 'P0002') {
      emitTelemetry('acting.respond_missing', { actor: userId, acting: id, code: e.code });
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }
    emitTelemetry('acting.respond_failed', { actor: userId, acting: id, code: e.code });
    return NextResponse.json({ error: 'Failed to answer the invitation' }, { status: 500 });
  }
}
