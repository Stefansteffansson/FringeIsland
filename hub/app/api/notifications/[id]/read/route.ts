import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { markNotificationReadRpc } from '@/lib/notifications/queries';
import { mapNotificationError } from '@/lib/notifications/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H030 — POST /api/notifications/[id]/read (NTF-7). Marks one of the
 * caller's own notifications read via the FEAT-PD013 `mark_notification_read`
 * contract (own-only + idempotent in the substrate). Mutation → server-verified
 * `getUser()` (ADR-U037).
 */
export async function POST(
  _request: Request,
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
  try {
    await markNotificationReadRpc(supabase, id);
    emitTelemetry('notifications.mark_read', { actor: user.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return mapNotificationError(err, 'notifications.mark_read_failed', user.id);
  }
}
