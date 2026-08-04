import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchAdminGroupConversationDetail } from '@/lib/admin/content';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H041: the wing's message-bodies read — the same get_conversation_detail
// door the member BFF uses; the FEAT-PC026 arm is group-kind + suspended only
// (G-4), so DMs and non-suspended groups refuse platform-side. Admin-plane
// 404 collapse; durable telemetry ids only, never content.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; conversationId: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.group_conversation_detail_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id, conversationId } = await params;
  try {
    const { data, refused, notFound } = await fetchAdminGroupConversationDetail(
      supabase,
      conversationId,
    );
    if (refused || notFound || !data) {
      emitTelemetry('admin.group_conversation_detail_refused', {
        actor: userId,
        group: id,
        conversation: conversationId,
      });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.group_conversation_detail_read', {
      actor: userId,
      group: id,
      conversation: conversationId,
    });
    return NextResponse.json({ detail: data });
  } catch (err) {
    emitTelemetry('admin.group_conversation_detail_failed', {
      actor: userId,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to load the conversation' }, { status: 500 });
  }
}
