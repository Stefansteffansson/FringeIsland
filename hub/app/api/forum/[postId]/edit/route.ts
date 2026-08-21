import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { editOwnForumPostRpc } from '@/lib/forum/queries';
import { mapForumOwnMutationError } from '@/lib/forum/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H028 — POST /api/forum/[postId]/edit (COM-12, amended by TASK-EDT-01):
 * unlimited own-edit. Author = me, not deleted, and `post_forum_messages` held
 * are gated substrate-side (FEAT-PD011; the 15-minute window was retired —
 * transparency via the "(edited)" note replaced the clock). Content-free
 * telemetry.
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
