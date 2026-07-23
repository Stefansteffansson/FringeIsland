import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { markAllNotificationsReadRpc } from '@/lib/notifications/queries';
import { mapNotificationError } from '@/lib/notifications/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H030 — POST /api/notifications/read-all (NTF-7). Flips all of the
 * caller's own unread notifications via the FEAT-PD013
 * `mark_all_notifications_read` contract; returns the flipped count.
 * Mutation → server-verified `getUser()` (ADR-U037).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const flipped = await markAllNotificationsReadRpc(supabase);
    emitTelemetry('notifications.mark_all_read', { actor: user.id, flipped });
    return NextResponse.json({ flipped });
  } catch (err) {
    return mapNotificationError(err, 'notifications.mark_all_read_failed', user.id);
  }
}
