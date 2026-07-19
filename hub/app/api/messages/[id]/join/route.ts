import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { joinGroupConversationRpc } from '@/lib/messages/queries';
import { mapContractError } from '@/lib/messages/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H025 — POST /api/messages/[id]/join (COM-15). Membership gating is
 * substrate-side (FEAT-PD008 STORY-6); rejoin clears `left_at` there too.
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
    await joinGroupConversationRpc(supabase, id);
    emitTelemetry('messages.joined', { actor: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapContractError(err, 'messages.join_failed', user.id);
  }
}
