import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { editOwnForumPostRpc } from '@/lib/forum/queries';
import { mapForumOwnMutationError } from '@/lib/forum/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H028 — POST /api/forum/[postId]/edit (COM-12): windowed own-edit. Author
 * = me, not deleted, `post_forum_messages` held, and created within 15 minutes
 * are all gated substrate-side (FEAT-PD011); a window-edge refusal (42501,
 * /window/i) is surfaced honestly. Content-free telemetry.
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

  const payload = (await request.json().catch(() => null)) as { content?: unknown } | null;
  const content = payload?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    return NextResponse.json({ error: 'A post needs content' }, { status: 400 });
  }

  try {
    const post = await editOwnForumPostRpc(supabase, postId, content);
    emitTelemetry('forum.edited', { actor: user.id });
    return NextResponse.json({ post });
  } catch (err) {
    return mapForumOwnMutationError(err, 'forum.edit_failed', user.id);
  }
}
