import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { moderateAdminGroupForumPost, AdminContentError } from '@/lib/admin/content';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H041: the "clean forums" act — FEAT-PC026's audited
// admin_moderate_group_forum_post (purpose-bound: refuses off
// group-suspension, P0001 → 409). The platform's admin_audit_log row is the
// audit record; the BFF adds no second authority (ADR-U038). The reason
// travels to the platform audit only — NEVER into telemetry.

const refusalStatus = (code: string): number | null => {
  if (code === '42501' || code === 'P0002') return 404; // admin-plane existence-hiding
  if (code === 'P0001') return 409;
  if (code === '22023') return 400;
  return null;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; postId: string }> },
) {
  let body: { reason?: string };
  try {
    body = (await request.json()) as { reason?: string };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }
  const reason = body.reason?.trim();
  if (!reason) {
    return NextResponse.json({ error: 'A reason is required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    emitTelemetry('admin.group_forum_post_moderate_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id, postId } = await params;
  try {
    const result = await moderateAdminGroupForumPost(supabase, postId, reason);
    await emitDurableTelemetry(supabase, 'admin.group_forum_post_moderate', {
      actor: user.id,
      group: id,
      post: postId,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AdminContentError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.group_forum_post_moderate_refused', {
          actor: user.id,
          group: id,
          post: postId,
          code: err.code,
        });
        return NextResponse.json(
          { error: status === 404 ? 'Not found' : err.message },
          { status },
        );
      }
    }
    emitTelemetry('admin.group_forum_post_moderate_failed', {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to moderate the post' }, { status: 500 });
  }
}
