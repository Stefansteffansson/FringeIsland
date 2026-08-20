import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createGroupConversationRpc } from '@/lib/messages/queries';
import { mapContractError } from '@/lib/messages/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H025 — POST /api/messages/group (COM-15, STORY-6). Opens a group
 * conversation; the `create_group_conversations` permission gate lives in
 * the substrate (`has_permission`, FEAT-PD008 STORY-5) — the UI's hidden
 * affordance is UX, this route adds no authority.
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
    | { group_id?: unknown; title?: unknown; acting?: unknown }
    | null;
  const groupId = payload?.group_id;
  const title = payload?.title;
  if (
    typeof groupId !== 'string' ||
    groupId === '' ||
    (title !== undefined && title !== null && typeof title !== 'string')
  ) {
    return NextResponse.json({ error: 'A group is required' }, { status: 400 });
  }
  // FEAT-H047: a wielded create — the acting group takes the first seat
  // (limb 2b = create_group_conversations, substrate-side; PD019 T2).
  const acting = typeof payload?.acting === 'string' ? payload.acting : undefined;

  try {
    const conversationId = await createGroupConversationRpc(
      supabase,
      groupId,
      (title as string | null) ?? null,
      acting,
    );
    emitTelemetry('messages.group_conversation_created', {
      actor: user.id,
      group: groupId,
      wielded: Boolean(acting),
    });
    return NextResponse.json({ conversation_id: conversationId }, { status: 201 });
  } catch (err) {
    return mapContractError(err, 'messages.group_conversation_create_failed', user.id);
  }
}
