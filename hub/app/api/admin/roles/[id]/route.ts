import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchRoleTemplateDetail, fetchRoleTemplates, AdminRolesError } from '@/lib/admin/roles';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// FEAT-H040: the template detail read — the FEAT-PC025 version ledger
// (admin_get_role_template_detail) composed with the list read's catalogue
// and blast-radius facts (instantiated-role count, composition refs) so the
// detail paints from ONE client request. Presentation composition only; the
// platform owns both payloads.

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) {
    emitTelemetry('admin.roles_detail_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { id } = await params;
  try {
    const [detail, list] = [
      await fetchRoleTemplateDetail(supabase, id),
      await fetchRoleTemplates(supabase),
    ];
    if (detail.refused || !detail.payload || list.refused || !list.payload) {
      emitTelemetry('admin.roles_detail_refused', { actor: userId, template: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const row = list.payload.templates.find((t) => t.id === id);
    await emitDurableTelemetry(supabase, 'admin.roles_detail_read', {
      actor: userId,
      template: id,
    });
    return NextResponse.json({
      template: {
        ...detail.payload.template,
        instantiated_role_count: row?.instantiated_role_count ?? 0,
        group_template_refs: row?.group_template_refs ?? [],
        // RD-B FEAT-H044 STORY-3: retirement state. The PC028 corrective puts
        // it on the detail CONTRACT — which is what matters for ADR-U038,
        // since a sibling Surface calls the RPC and never this route. Here it
        // is composed from the list read as well, exactly as the blast-radius
        // facts above are, so the admin page states "why publish is
        // unavailable" from one client request either way.
        retired_at: detail.payload.template.retired_at ?? row?.retired_at ?? null,
      },
      versions: detail.payload.versions,
      // RD-B FEAT-H044 STORY-3: reach. No other read carries it — this key
      // exists only once the PC028 corrective lands, and degrades to empty
      // reach ("Not published") rather than crashing the page before then.
      publications: detail.payload.publications ?? [],
      catalog: list.payload.catalog,
      generated_at: detail.payload.generated_at,
    });
  } catch (err) {
    if (err instanceof AdminRolesError) {
      emitTelemetry('admin.roles_detail_refused', { actor: userId, template: id, code: err.code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('admin.roles_detail_failed', { actor: userId, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load the role template' }, { status: 500 });
  }
}
