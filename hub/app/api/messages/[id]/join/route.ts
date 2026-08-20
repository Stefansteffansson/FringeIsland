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
  // FEAT-H047: a wielded join seats the GROUP — plumbing only (PD019 T2).
  const payload = (await request.json().catch(() => null)) as { acting?: unknown } | null;
  const acting = typeof payload?.acting === 'string' ? payload.acting : undefined;
  try {
    await joinGroupConversationRpc(supabase, id, acting);
    emitTelemetry('messages.joined', { actor: user.id, wielded: Boolean(acting) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapContractError(err, 'messages.join_failed', user.id);
  }
}
