import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchGroupConversationsRpc } from '@/lib/messages/queries';
import { mapContractError } from '@/lib/messages/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H025 — GET /api/groups/[id]/conversations (COM-15, the payload-walk
 * listing read). Membership gating is substrate-side (FEAT-PD008 STORY-6).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const conversations = await fetchGroupConversationsRpc(supabase, id);
    emitTelemetry('messages.group_listing', { actor: userId, count: conversations.length });
    return NextResponse.json({ conversations });
  } catch (err) {
    return mapContractError(err, 'messages.group_listing_failed', userId);
  }
}
