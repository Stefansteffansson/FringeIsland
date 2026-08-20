import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { leaveGroupConversationRpc } from '@/lib/messages/queries';
import { mapContractError } from '@/lib/messages/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H025 — POST /api/messages/[id]/leave (COM-15). Group-kind-only and
 * active-participant-only, substrate-enforced (FEAT-PD008 STORY-6).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  // FEAT-H047: a wielded leave withdraws the GROUP (key-only — PD019 T2R).
  const payload = (await request.json().catch(() => null)) as { acting?: unknown } | null;
  const acting = typeof payload?.acting === 'string' ? payload.acting : undefined;
  try {
    await leaveGroupConversationRpc(supabase, id, acting);
    emitTelemetry('messages.left', { actor: user.id, wielded: Boolean(acting) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapContractError(err, 'messages.leave_failed', user.id);
  }
}
