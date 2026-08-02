import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchAdminReportDetail, AdminReportsError } from '@/lib/admin/reports';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H037: report detail (FEAT-PC022 admin_get_content_report_detail).
// 42501/P0002 collapse to the admin-plane 404 shape (existence-hiding).

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.report_detail_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const { report, refused } = await fetchAdminReportDetail(supabase, id);
    if (refused || !report) {
      emitTelemetry('admin.report_detail_refused', { actor: userId, report: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.report_detail_read', { actor: userId, report: id });
    return NextResponse.json({ report });
  } catch (err) {
    if (err instanceof AdminReportsError) {
      emitTelemetry('admin.report_detail_refused', { actor: userId, report: id, code: err.code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('admin.report_detail_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load the report' }, { status: 500 });
  }
}
