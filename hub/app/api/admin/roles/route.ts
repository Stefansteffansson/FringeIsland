import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchRoleTemplates, AdminRolesError } from '@/lib/admin/roles';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H040: the editor's composed list read (FEAT-PC025
// admin_get_role_templates — every template with version metadata and
// blast-radius facts, plus the full flagged catalogue; ADM-17 within RB-4).

export async function GET() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.roles_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const { payload, refused } = await fetchRoleTemplates(supabase);
    if (refused || !payload) {
      emitTelemetry('admin.roles_refused', { actor: userId });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.roles_read', { actor: userId });
    return NextResponse.json(payload);
  } catch (err) {
    if (err instanceof AdminRolesError) {
      emitTelemetry('admin.roles_refused', { actor: userId, code: err.code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('admin.roles_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load role templates' }, { status: 500 });
  }
}
