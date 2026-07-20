import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchGroupForum, createForumPostRpc } from '@/lib/forum/queries';
import { mapForumError } from '@/lib/forum/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H026 — GET /api/groups/[id]/forum (COM-5): the group forum, top-level
 * threads newest-first with chronological replies, keyset-paged (`?before=`),
 * every author resolved through the COM-14 ladder. POST (COM-6a): open a
 * thread. view_forum / post_forum_messages gating is substrate-side
 * (FEAT-PD009); telemetry stays content-free.
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
    const posts = await fetchGroupForum(supabase, id, { ...(before ? { before } : {}) });
    emitTelemetry('forum.read', { actor: userId, count: posts.length });
    return NextResponse.json({ posts });
  } catch (err) {
    return mapForumError(err, 'forum.read_failed', userId);
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

  const payload = (await request.json().catch(() => null)) as { content?: unknown } | null;
  const content = payload?.content;
  if (typeof content !== 'string' || content.trim() === '') {
    return NextResponse.json({ error: 'A post needs content' }, { status: 400 });
  }

  try {
    const post = await createForumPostRpc(supabase, id, content);
    emitTelemetry('forum.posted', { actor: user.id });
    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    return mapForumError(err, 'forum.post_failed', user.id);
  }
}
