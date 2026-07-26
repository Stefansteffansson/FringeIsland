import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import {
  fetchOwnNotificationPreferences,
  setOwnNotificationPreference,
} from '@/lib/notifications/preferences';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H033 — GET /api/notifications/preferences (NTF-10).
 *
 * Returns the caller's own categories x channels matrix with effective values
 * resolved server-side, via the FEAT-PD016 `get_own_notification_preferences()`
 * SECURITY DEFINER contract. Additive route (ADR-U015) — no existing route
 * changes, no version bump. Per ADR-U038 this is a private Hub BFF route, so
 * `/api/v1` + Bearer bind the platform surface (PostgREST RPC), not this path —
 * cookie-session + unversioned is conformant, and the FEAT-PC006/PC007 consent
 * route is the shape mirrored here.
 *
 * A sessionless caller is gated with 401 before the contract is reached. There
 * is no 404: the contract always returns the full matrix, because absence of a
 * stored row means allowed.
 */
export async function GET() {
  // ADR-U037: read-path identity via local JWT verification — no Auth-server
  // round-trip. Server-Timing instruments the auth/query split.
  const t0 = Date.now();
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  const tAuth = Date.now();

  if (!userId) {
    emitTelemetry('notifications.preferences_read_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const preferences = await fetchOwnNotificationPreferences(supabase);
    const tQuery = Date.now();
    emitTelemetry('notifications.preferences_read', {
      actor: userId,
      cells: preferences.length,
    });
    return NextResponse.json(
      { preferences },
      { headers: { 'Server-Timing': `auth;dur=${tAuth - t0}, query;dur=${tQuery - tAuth}` } },
    );
  } catch (err) {
    emitTelemetry('notifications.preferences_read_failed', {
      actor: userId,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to load notification preferences' }, { status: 500 });
  }
}

/**
 * FEAT-H033 — PUT /api/notifications/preferences (NTF-10).
 *
 * Sets one (category, channel) cell for the caller via the FEAT-PD016
 * `set_own_notification_preference()` contract. Own-subject by construction: the
 * contract pins the actor through `ds5_require_fim_subject()` and takes no target
 * parameter, so there is no member-id in this payload to tamper with.
 *
 * Typed-refusal mapping (the contract raises SQLSTATEs; the route maps them so
 * the surface can say something true):
 *   sessionless                              → 401 (before the contract)
 *   missing/!string category or channel      → 400
 *   non-boolean allowed                      → 400
 *   22023 unknown category or channel        → 422
 *   42501 category cannot be muted           → 409
 *   28000 no active subject (a Mist)         → 403
 *   anything else                            → 500 (surfaced, never swallowed)
 *
 * 42501 and 28000 are deliberately distinct: FEAT-PD016 added
 * `ds5_require_fim_subject()` precisely so an identity refusal and a policy
 * refusal do not collapse into one code, because they mean different things to
 * the member.
 */
export async function PUT(request: Request) {
  // ADR-U037: mutations use getUser() (full verification), not getClaims().
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('notifications.preferences_write_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { category?: unknown; channel?: unknown; allowed?: unknown }
    | null;
  const category = body?.category;
  const channel = body?.channel;
  const allowed = body?.allowed;

  if (
    typeof category !== 'string' ||
    !category ||
    typeof channel !== 'string' ||
    !channel ||
    typeof allowed !== 'boolean'
  ) {
    emitTelemetry('notifications.preferences_write_invalid', { actor: user.id });
    return NextResponse.json(
      { error: 'category, channel and allowed are required' },
      { status: 400 },
    );
  }

  try {
    const preference = await setOwnNotificationPreference(supabase, category, channel, allowed);
    emitTelemetry('notifications.preferences_write', {
      actor: user.id,
      category,
      channel,
      allowed,
    });
    return NextResponse.json({ preference });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '22023' || code === '42501' || code === '28000') {
      const status = code === '22023' ? 422 : code === '42501' ? 409 : 403;
      emitTelemetry('notifications.preferences_write_refused', {
        actor: user.id,
        category,
        channel,
        code,
        status,
      });
      const message =
        code === '22023'
          ? 'Unknown notification category or channel'
          : code === '42501'
            ? 'This category cannot be switched off'
            : 'No active account for this request';
      return NextResponse.json({ error: message }, { status });
    }
    emitTelemetry('notifications.preferences_write_failed', {
      actor: user.id,
      category,
      channel,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to save notification preference' }, { status: 500 });
  }
}
