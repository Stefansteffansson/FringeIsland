import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateForumPostRpc } from '@/lib/forum/queries';
import { mapForumError } from '@/lib/forum/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H026 — POST /api/forum/[postId]/moderate (COM-7): the Steward's
 * in-place soft-delete (community-scoped, ADR-U028). moderate_forum gating is
 * substrate-side (FEAT-PD009); the call is idempotent. Content-free telemetry.
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
    const post = await moderateForumPostRpc(supabase, postId);
    emitTelemetry('forum.moderated', { actor: user.id });
    return NextResponse.json({ post });
  } catch (err) {
    return mapForumError(err, 'forum.moderate_failed', user.id);
  }
}
