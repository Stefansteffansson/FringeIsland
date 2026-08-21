import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchGroupAnnouncements, sendCommunityAnnouncementRpc } from '@/lib/announcements/queries';
import { mapAnnouncementError } from '@/lib/announcements/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H028 — GET /api/groups/[id]/announcements (COM-8): the group board,
 * newest-first, keyset-paged (`?before=`), every author resolved through the
 * COM-14 ladder, retracted rows excluded platform-side. POST (COM-8 compose):
 * send one community announcement. The `send_announcements` gate is
 * substrate-side (FEAT-PD011); telemetry stays content-free.
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
  // FEAT-H048 over FEAT-PD019 T3: the wielded read — plumbing only, the
  // two-limb gate is the substrate's (ADR-U038).
  const acting = url.searchParams.get('acting') ?? undefined;

  try {
    const announcements = await fetchGroupAnnouncements(supabase, id, {
      ...(before ? { before } : {}),
      ...(acting ? { acting } : {}),
    });
    emitTelemetry('announcements.group_read', {
      actor: userId,
      count: announcements.length,
      wielded: Boolean(acting),
    });
    return NextResponse.json({ announcements });
  } catch (err) {
    return mapAnnouncementError(err, 'announcements.group_read_failed', userId);
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
    | { title?: unknown; body?: unknown; acting?: unknown }
    | null;
  const title = payload?.title;
  const body = payload?.body;
  // FEAT-H048: a wielded announce — plumbing only, every limb of the gate is
  // enforced substrate-side.
  const acting = typeof payload?.acting === 'string' ? payload.acting : undefined;
  if (typeof title !== 'string' || title.trim() === '' || typeof body !== 'string' || body.trim() === '') {
    return NextResponse.json({ error: 'An announcement needs a title and body' }, { status: 400 });
  }

  try {
    const announcement = await sendCommunityAnnouncementRpc(supabase, id, title, body, acting);
    emitTelemetry('announcements.sent', {
      actor: user.id,
      scope: 'community',
      wielded: Boolean(acting),
    });
    return NextResponse.json({ announcement }, { status: 201 });
  } catch (err) {
    return mapAnnouncementError(err, 'announcements.send_failed', user.id);
  }
}
