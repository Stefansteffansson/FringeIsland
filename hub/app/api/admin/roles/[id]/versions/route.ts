import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createRoleTemplateVersion, AdminRolesError } from '@/lib/admin/roles';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H040 STORY-3: save a draft — append an unapplied version to the
// ledger (FEAT-PC025 admin_create_role_template_version; nothing changes for
// any group or member until Apply repoints the default).

const refusalStatus = (code: string): number | null => {
  if (code === '42501' || code === 'P0002') return 404;
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
    emitTelemetry('admin.role_template_version_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: unknown;
    description?: unknown;
    permission_names?: unknown;
  };
  const permissionNames = Array.isArray(body.permission_names)
    ? body.permission_names.map(String)
    : [];
  try {
    const { refused } = await createRoleTemplateVersion(supabase, id, {
      name: String(body.name ?? ''),
      description: body.description == null ? null : String(body.description),
      permission_names: permissionNames,
    });
    if (refused) {
      emitTelemetry('admin.role_template_version_refused', { actor: user.id, template: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.role_template_version_saved', {
      actor: user.id,
      template: id,
      permission_count: permissionNames.length,
    });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminRolesError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.role_template_version_refused', {
          actor: user.id,
          template: id,
          code: err.code,
        });
        return NextResponse.json({ error: status === 404 ? 'Not found' : err.message }, { status });
      }
    }
    emitTelemetry('admin.role_template_version_failed', {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to save the draft version' }, { status: 500 });
  }
}
