import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cloneRoleTemplate, AdminRolesError } from '@/lib/admin/roles';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H040 STORY-2: clone a role template (FEAT-PC025
// admin_clone_role_template — the only door for seeds; the clone appears in
// member group-creation options and rides every template-less instantiation
// from the moment it exists — the ceremony names both).

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
    emitTelemetry('admin.role_template_clone_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as { name?: unknown };
  try {
    const { refused } = await cloneRoleTemplate(supabase, id, String(body.name ?? ''));
    if (refused) {
      emitTelemetry('admin.role_template_clone_refused', { actor: user.id, source: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, 'admin.role_template_cloned', {
      actor: user.id,
      source: id,
    });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminRolesError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry('admin.role_template_clone_refused', {
          actor: user.id,
          source: id,
          code: err.code,
        });
        return NextResponse.json({ error: status === 404 ? 'Not found' : err.message }, { status });
      }
    }
    emitTelemetry('admin.role_template_clone_failed', {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to clone the role template' }, { status: 500 });
  }
}
