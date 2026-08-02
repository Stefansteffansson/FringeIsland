import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { resolveAdminReport, AdminReportsError } from '@/lib/admin/reports';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H037: resolve a report (FEAT-PC022 admin_resolve_content_report).
// The stale-second-resolve P0001 passes VERBATIM as 409; the closure
// notification is the platform trigger's business, never authored here.

const refusalStatus = (code: string): number | null => {
  if (code === '42501' || code === 'P0002') return 404; // admin-plane existence-hiding
  if (code === 'P0001') return 409;
  if (code === '22023') return 400;
  return null;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    emitTelemetry('admin.report_resolve_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    resolution_kind?: string;
    resolution_note?: string | null;
  };
  if (!body.resolution_kind) {
    return NextResponse.json({ error: 'resolution_kind is required' }, { status: 400 });
  }
  try {
    await resolveAdminReport(supabase, id, body.resolution_kind, body.resolution_note ?? null);
    await emitDurableTelemetry(supabase, 'admin.report_resolved', {
      actor: user.id,
      report: id,
      resolution_kind: body.resolution_kind,
    });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminReportsError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.report_resolve_refused', { actor: user.id, report: id, code: err.code });
        return NextResponse.json({ error: status === 404 ? 'Not found' : err.message }, { status });
      }
    }
    emitTelemetry('admin.report_resolve_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to resolve the report' }, { status: 500 });
  }
}
