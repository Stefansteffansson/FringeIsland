import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { setRoleTemplateDefaultVersion, AdminRolesError } from '@/lib/admin/roles';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H040 STORY-3: Apply / Rollback — repoint the default version
// (FEAT-PC025 admin_set_role_template_default_version; the platform
// materialises the version onto the live rows instantiation reads, guards
// the protected set, and writes the old-set -> new-set audit diff).

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
    emitTelemetry('admin.role_template_default_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { version_id?: unknown };
  try {
    const { refused } = await setRoleTemplateDefaultVersion(
      supabase,
      id,
      String(body.version_id ?? ''),
    );
    if (refused) {
      emitTelemetry('admin.role_template_default_refused', { actor: user.id, template: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.role_template_default_set', {
      actor: user.id,
      template: id,
    });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminRolesError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.role_template_default_refused', {
          actor: user.id,
          template: id,
          code: err.code,
        });
        return NextResponse.json({ error: status === 404 ? 'Not found' : err.message }, { status });
      }
    }
    emitTelemetry('admin.role_template_default_failed', {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to apply the version' }, { status: 500 });
  }
}
