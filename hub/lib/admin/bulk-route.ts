import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { bulkAdminUserAction, AdminUsersError, type BulkAction } from '@/lib/admin/users';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

/**
 * FEAT-H039 — the shared post-auth handler behind the three bulk routes
 * (/api/admin/users/bulk/{suspend|reactivate|force-logout}). Each route file
 * authenticates itself with getUser() (the ADR-U037 mutation rule, kept
 * visible per route file for the route-policy gate) and hands the verified
 * actor here. BFF plumbing only (ADR-U038): the loop composes the proven
 * single contracts; every guard is the platform's. The id-count cap is the
 * page size (selection is current-page-only by construction) — a bound on
 * the loop, not a rule.
 */

const MAX_IDS = 50;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function handleBulkAuthed(
  supabase: SupabaseClient,
  actorId: string,
  request: Request,
  action: BulkAction,
) {
  const slug = action.replace('-', '_');
  let userIds: unknown;
  try {
    userIds = ((await request.json()) as { user_ids?: unknown }).user_ids;
  } catch {
    userIds = undefined;
  }
  if (
    !Array.isArray(userIds) ||
    userIds.length < 1 ||
    userIds.length > MAX_IDS ||
    !userIds.every((id) => typeof id === 'string' && UUID_RE.test(id))
  ) {
    return NextResponse.json(
      { error: `user_ids must be 1..${MAX_IDS} member ids` },
      { status: 400 },
    );
  }
  try {
    const results = await bulkAdminUserAction(supabase, action, userIds as string[]);
    await emitDurableTelemetry(supabase, `admin.bulk_${slug}`, {
      actor: actorId,
      requested: results.length,
      succeeded: results.filter((r) => r.ok).length,
    });
    return NextResponse.json({ results });
  } catch (err) {
    if (err instanceof AdminUsersError && (err.code === '42501' || err.code === 'P0002')) {
      emitTelemetry(`admin.bulk_${slug}_refused`, { actor: actorId, code: err.code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 }); // admin-plane existence-hiding
    }
    emitTelemetry(`admin.bulk_${slug}_failed`, { actor: actorId, message: (err as Error).message });
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 });
  }
}
