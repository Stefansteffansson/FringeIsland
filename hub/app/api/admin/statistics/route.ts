import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchPlatformStatistics } from '@/lib/admin/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

/**
 * FEAT-H034 — GET /api/admin/statistics (ADM-1).
 *
 * The dashboard's justified standalone read (ADR-U042 guardrail 3: admin
 * state is not member-first-paint data, so it stays out of the overview
 * bundle) and the menu's admin probe. Per ADR-U038 this route is presentation
 * only: the authorization lives in the platform contract (`is_platform_admin`
 * inside FEAT-PC018's RPC, typed 42501), mapped here to a 404 shape so a
 * non-admin learns nothing about the surface's existence.
 */
export async function GET() {
  // ADR-U037: read-path identity via local JWT verification.
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('admin.statistics_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { stats, refused } = await fetchPlatformStatistics(supabase);
    if (refused || !stats) {
      // Existence-hiding refusal: same shape as any unknown route.
      emitTelemetry('admin.statistics_refused', { actor: userId });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.statistics_read', { actor: userId });
    return NextResponse.json({ stats });
  } catch (err) {
    emitTelemetry('admin.statistics_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load statistics' }, { status: 500 });
  }
}
