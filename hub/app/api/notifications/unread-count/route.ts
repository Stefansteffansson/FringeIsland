import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchUnreadNotificationCount } from '@/lib/notifications/queries';
import { mapNotificationError } from '@/lib/notifications/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H030 — GET /api/notifications/unread-count (NTF-2). The bell badge
 * read via the FEAT-PD013 `get_own_unread_notification_count` contract
 * (partial-index-backed). Read route → local claims check (ADR-U037).
 */
export async function GET() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const count = await fetchUnreadNotificationCount(supabase);
    emitTelemetry('notifications.unread_count', { actor: userId, count });
    return NextResponse.json({ count });
  } catch (err) {
    return mapNotificationError(err, 'notifications.unread_count_failed', userId);
  }
}
