import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { markConversationReadRpc } from '@/lib/messages/queries';
import { mapContractError } from '@/lib/messages/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H025 — POST /api/messages/[id]/read (COM-4). Advances the caller's
 * own read cursor; own-row-only is substrate-enforced (FEAT-PD008 STORY-7).
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
    await markConversationReadRpc(supabase, id);
    emitTelemetry('messages.read', { actor: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapContractError(err, 'messages.read_failed', user.id);
  }
}
