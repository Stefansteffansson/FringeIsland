import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchPlatformAnnouncements } from '@/lib/announcements/queries';
import { mapAnnouncementError } from '@/lib/announcements/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H028 — GET /api/announcements/platform (COM-9): platform-scope
 * announcements for a signed-in FIM, newest-first, keyset-paged (`?before=`).
 * The FIM gate is substrate-side (FEAT-PD011: a Mist actor is refused, so the
 * home section simply doesn't render for Mists); telemetry stays content-free.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const url = new URL(request.url);
  const before = url.searchParams.get('before') ?? undefined;

  try {
    const announcements = await fetchPlatformAnnouncements(supabase, { ...(before ? { before } : {}) });
    emitTelemetry('announcements.platform_read', { actor: userId, count: announcements.length });
    return NextResponse.json({ announcements });
  } catch (err) {
    return mapAnnouncementError(err, 'announcements.platform_read_failed', userId);
  }
}
