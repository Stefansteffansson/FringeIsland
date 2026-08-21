import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { retractAnnouncementRpc } from '@/lib/announcements/queries';
import { mapAnnouncementError } from '@/lib/announcements/http';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H028 — POST /api/announcements/[id]/retract (COM-8 retract). Same gate
 * as the send for the row's scope, enforced substrate-side (FEAT-PD011:
 * role-based, any current gate-holder may retract); idempotent on re-retract;
 * delivery rows are left standing. Telemetry stays content-free.
 */
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
  // FEAT-H048: a wielded retraction — plumbing only. A PLATFORM row refuses
  // structurally (its scope group is NULL, so limb 2a cannot pass).
  const payload = (await request.json().catch(() => null)) as { acting?: unknown } | null;
  const acting = typeof payload?.acting === 'string' ? payload.acting : undefined;

  try {
    const retracted = await retractAnnouncementRpc(supabase, id, acting);
    emitTelemetry('announcements.retracted', { actor: user.id, wielded: Boolean(acting) });
    return NextResponse.json({ retracted });
  } catch (err) {
    return mapAnnouncementError(err, 'announcements.retract_failed', user.id);
  }
}
