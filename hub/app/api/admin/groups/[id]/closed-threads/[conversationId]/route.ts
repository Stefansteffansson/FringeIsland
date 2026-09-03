import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchAdminSealedThreadDetail } from '@/lib/admin/content';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// TASK-SEAL-02 (Hub half): ONE preserved thread's messages on a CLOSED group,
// for the admin plane — through the one contract that serves a sealed thread
// (`admin_get_group_conversation_detail`, the SEAL-01 rider). Private BFF per
// ADR-U038: the wall, the closed-scope rule, the DM no-leak and the audit row
// all live platform-side; this route collapses every refusal to the admin-
// plane 404 shape and mirrors the read durably (an admin-plane event — Q2),
// ids only, never content. Read path → ADR-U037 local identity.

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; conversationId: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.sealed_thread_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id, conversationId } = await params;
  try {
    const { data, refused, notFound } = await fetchAdminSealedThreadDetail(supabase, conversationId);
    if (refused || notFound || !data) {
      emitTelemetry('admin.sealed_thread_refused', {
        actor: userId,
        group: id,
        conversation: conversationId,
      });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.sealed_thread_read', {
      actor: userId,
      group: id,
      conversation: conversationId,
      sealed: data.is_sealed,
      messages: data.message_count,
    });
    return NextResponse.json({ detail: data });
  } catch (err) {
    emitTelemetry('admin.sealed_thread_failed', {
      actor: userId,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to load the preserved thread' }, { status: 500 });
  }
}
