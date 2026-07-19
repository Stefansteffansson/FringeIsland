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
  _request: Request,
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
  try {
    await leaveGroupConversationRpc(supabase, id);
    emitTelemetry('messages.left', { actor: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapContractError(err, 'messages.leave_failed', user.id);
  }
}
