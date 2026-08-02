import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchAdminReports, AdminReportsError } from '@/lib/admin/reports';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H037: the moderation queue read (FEAT-PC022 admin_get_content_reports).
// Presentation only (ADR-U038): the platform's 42501 becomes the admin-plane
// 404 shape; the open filter namespace passes through untouched (22023 → 400).

export async function GET(request: Request) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.reports_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const filter = new URL(request.url).searchParams.get('filter') ?? 'open';
  try {
    const { reports, refused } = await fetchAdminReports(supabase, filter);
    if (refused || !reports) {
      emitTelemetry('admin.reports_refused', { actor: userId });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.reports_read', { actor: userId, filter });
    return NextResponse.json({ reports });
  } catch (err) {
    if (err instanceof AdminReportsError && err.code === '22023') {
      emitTelemetry('admin.reports_bad_filter', { actor: userId, filter });
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    emitTelemetry('admin.reports_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 });
  }
}
