import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchConversationDetail, sendConversationMessage } from '@/lib/messages/queries';
import { mapContractError } from '@/lib/messages/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H025 — GET /api/messages/[id] (COM-3): the conversation detail,
 * chronological + keyset-paged (`?before=`), with per-page sender display
 * resolution. POST /api/messages/[id] (COM-1): send. Participant gating is
 * substrate-side (FEAT-PD008); telemetry stays content-free.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  const url = new URL(request.url);
  const before = url.searchParams.get('before') ?? undefined;

  try {
    const detail = await fetchConversationDetail(supabase, id, {
      ...(before ? { before } : {}),
    });
    emitTelemetry('messages.detail', { actor: userId, count: detail.messages.length });
    return NextResponse.json(detail);
  } catch (err) {
    return mapContractError(err, 'messages.detail_failed', userId);
  }
}

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

  const payload = (await request.json().catch(() => null)) as
    | { content?: unknown }
    | null;
  const content = payload?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    return NextResponse.json({ error: 'A message needs content' }, { status: 400 });
  }

  try {
    const message = await sendConversationMessage(supabase, id, content);
    emitTelemetry('messages.sent', { actor: user.id });
    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    return mapContractError(err, 'messages.send_failed', user.id);
  }
}
