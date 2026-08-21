import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteOwnForumPostRpc } from '@/lib/forum/queries';
import { mapForumOwnMutationError } from '@/lib/forum/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H028 — POST /api/forum/[postId]/delete (COM-12, amended by
 * TASK-EDT-01): unlimited own-delete (the window was retired with edit's).
 * Same gate as edit minus content, all substrate-side (FEAT-PD011); idempotent
 * soft-delete, and the existing C-C moderation-hint trigger fires on the
 * transition (no new channel). Content-free telemetry.
 */
export async function POST(
  _request: Request,
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

  try {
    const post = await deleteOwnForumPostRpc(supabase, postId);
    emitTelemetry('forum.deleted_own', { actor: user.id });
    return NextResponse.json({ post });
  } catch (err) {
    return mapForumOwnMutationError(err, 'forum.delete_own_failed', user.id);
  }
}
