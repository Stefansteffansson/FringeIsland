import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { restGroup } from '@/lib/groups/queries';
import { availabilityRefusal } from '@/lib/groups/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H038 STORY-6 — POST /api/groups/[id]/rest (FEAT-PC023 `rest_group()`).
 *
 * The member-plane steward-fix hold: active → resting. The contract self-gates
 * (FIM-only, the `rest_group` permission key, P0002 no-existence-leak, the
 * no-path-into-suspended rule); this route is presentation only. SQLSTATE →
 * HTTP: 42501 → 403, P0002 → 404, P0001 → 409 with the message through
 * (availability copy included), else 500. Mutation → per-request getUser.
 * Telemetry id-only; the steward action mirrors as `groups.rest`.
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
    emitTelemetry('groups.rest_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await restGroup(supabase, id);
    emitTelemetry('groups.rest', { actor: user.id, group: id });
    return NextResponse.json({});
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    const availability = availabilityRefusal(err);
    if (availability) {
      emitTelemetry('groups.rest_refused', { actor: user.id, code });
      return availability;
    }
    if (code === '42501') {
      emitTelemetry('groups.rest_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('groups.rest_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (code === 'P0001') {
      emitTelemetry('groups.rest_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'The group cannot be rested' },
        { status: 409 },
      );
    }
    emitTelemetry('groups.rest_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to rest the group' }, { status: 500 });
  }
}
