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
  // FEAT-H047: a wielded read advances the GROUP's clock (shared — PD019 T2).
  const payload = (await request.json().catch(() => null)) as { acting?: unknown } | null;
  const acting = typeof payload?.acting === 'string' ? payload.acting : undefined;
  try {
    await markConversationReadRpc(supabase, id, acting);
    emitTelemetry('messages.read', { actor: user.id, wielded: Boolean(acting) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapContractError(err, 'messages.read_failed', user.id);
  }
}
