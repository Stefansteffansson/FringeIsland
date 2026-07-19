import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchMyConversations } from '@/lib/messages/queries';
import { mapContractError } from '@/lib/messages/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H025 — GET /api/messages (COM-2). The caller's inbox via the
 * FEAT-PD008 `get_my_conversations()` contract. Private BFF plumbing per
 * ADR-U038 — participant scoping and the CB-1 FIM-only gate live in the
 * substrate; this route maps session → 401 and SQLSTATEs → HTTP.
 */
export async function GET() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const conversations = await fetchMyConversations(supabase);
    emitTelemetry('messages.inbox', { actor: userId, count: conversations.length });
    return NextResponse.json({ conversations });
  } catch (err) {
    return mapContractError(err, 'messages.inbox_failed', userId);
  }
}
