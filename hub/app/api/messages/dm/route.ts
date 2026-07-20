import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getOrCreateDmConversation } from '@/lib/messages/queries';
import { mapContractError } from '@/lib/messages/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H025 — POST /api/messages/dm (COM-1, STORY-5). Lands the caller in
 * the one DM with a fellow member — recipient keyed by personal group id
 * (P-O1; the C-A rider). FIM-only both sides, one-per-pair, all enforced in
 * the substrate (FEAT-PD008 STORY-4); this route is presentation plumbing.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as
    | { other_group_id?: unknown }
    | null;
  const otherGroupId = payload?.other_group_id;
  if (typeof otherGroupId !== 'string' || otherGroupId === '') {
    return NextResponse.json({ error: 'A recipient is required' }, { status: 400 });
  }

  try {
    const conversationId = await getOrCreateDmConversation(supabase, otherGroupId);
    emitTelemetry('messages.dm_opened', { actor: user.id });
    return NextResponse.json({ conversation_id: conversationId });
  } catch (err) {
    return mapContractError(err, 'messages.dm_open_failed', user.id);
  }
}
