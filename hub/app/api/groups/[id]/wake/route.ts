import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { wakeGroup } from '@/lib/groups/queries';
import { availabilityRefusal } from '@/lib/groups/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H038 STORY-6 — POST /api/groups/[id]/wake (FEAT-PC023 `wake_group()`).
 *
 * The symmetric half of the steward-fix hold: resting → active. Suspended
 * refuses in the substrate — there is no steward path out of the hard state.
 * Mapping and posture identical to the rest route.
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
    emitTelemetry('groups.wake_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    await wakeGroup(supabase, id);
    emitTelemetry('groups.wake', { actor: user.id, group: id });
    return NextResponse.json({});
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    const availability = availabilityRefusal(err);
    if (availability) {
      emitTelemetry('groups.wake_refused', { actor: user.id, code });
      return availability;
    }
    if (code === '42501') {
      emitTelemetry('groups.wake_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('groups.wake_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (code === 'P0001') {
      emitTelemetry('groups.wake_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'The group cannot be woken' },
        { status: 409 },
      );
    }
    emitTelemetry('groups.wake_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to wake the group' }, { status: 500 });
  }
}
