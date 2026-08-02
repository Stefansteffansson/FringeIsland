import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchAdminAuditLog, AdminAuditError } from '@/lib/admin/audit';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H037: the audit-log read (FEAT-PC022 admin_get_audit_log, ADM-16).
// Keyset params pass through; the prefix narrows over the OPEN namespace —
// no vocabulary policing anywhere in this route.

export async function GET(request: Request) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.audit_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const url = new URL(request.url);
  const before = url.searchParams.get('before');
  const prefix = url.searchParams.get('prefix');
  const limitRaw = url.searchParams.get('limit');
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : 50;
  try {
    const { rows, refused } = await fetchAdminAuditLog(supabase, {
      limit: Number.isFinite(limit) ? limit : 50,
      before,
      prefix,
    });
    if (refused || !rows) {
      emitTelemetry('admin.audit_refused', { actor: userId });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.audit_read', {
      actor: userId,
      prefixed: Boolean(prefix),
    });
    return NextResponse.json({ rows });
  } catch (err) {
    if (err instanceof AdminAuditError) {
      emitTelemetry('admin.audit_refused', { actor: userId, code: err.code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('admin.audit_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load the audit log' }, { status: 500 });
  }
}
