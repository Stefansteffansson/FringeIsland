import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchOwnNotifications } from '@/lib/notifications/queries';
import { mapNotificationError } from '@/lib/notifications/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H030 — GET /api/notifications (NTF-1/3). The caller's notifications,
 * newest-first, keyset-paginated, via the FEAT-PD013 `get_own_notifications`
 * contract. Private BFF plumbing (ADR-U038): recipient scoping and the
 * FIM-only gate live in the substrate; this route maps session → 401,
 * SQLSTATE → HTTP. Read route → local claims check (ADR-U037).
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const url = new URL(request.url);
  const beforeCreatedAt = url.searchParams.get('before_created_at');
  const beforeId = url.searchParams.get('before_id');
  const limitRaw = url.searchParams.get('limit');
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const before =
    beforeCreatedAt && beforeId
      ? { created_at: beforeCreatedAt, id: beforeId }
      : undefined;

  try {
    const notifications = await fetchOwnNotifications(supabase, {
      before,
      limit: Number.isFinite(limit) ? limit : undefined,
    });
    emitTelemetry('notifications.list', { actor: userId, count: notifications.length });
    return NextResponse.json({ notifications });
  } catch (err) {
    return mapNotificationError(err, 'notifications.list_failed', userId);
  }
}
