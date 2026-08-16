import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { replyToForumPostRpc } from '@/lib/forum/queries';
import { mapForumError } from '@/lib/forum/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H026 — POST /api/forum/[postId]/reply (COM-6b): a flat reply under a
 * top-level post. reply_to_messages gating + the flat-threading trigger (P0001
 * on a reply-to-a-reply) are substrate-side (FEAT-PD009). Content-free telemetry.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { postId } = await params;

  const payload = (await request.json().catch(() => null)) as {
    content?: unknown;
    acting?: unknown;
  } | null;
  const content = payload?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    return NextResponse.json({ error: 'A reply needs content' }, { status: 400 });
  }
  // FEAT-H046 over FEAT-PD019: a wielded reply — plumbing only, every limb
  // substrate-side.
  const acting = typeof payload?.acting === 'string' ? payload.acting : undefined;

  try {
    const post = await replyToForumPostRpc(supabase, postId, content, acting);
    emitTelemetry('forum.replied', { actor: user.id, wielded: Boolean(acting) });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    return mapForumError(err, 'forum.reply_failed', user.id);
  }
}
