import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { applyRoleTemplateUpdate } from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * RD-B FEAT-H044 STORY-2 — POST /api/groups/[id]/roles/[roleId]/apply-update.
 *
 * Copies the source template's current version into the group's role: the
 * diff and nothing but the diff (RD-3 forbids a union — that is the silent
 * merge this cycle exists to make refusable). Take-it-or-leave-it, so the
 * body is empty; there is no per-permission argument to pass.
 *
 * Private BFF plumbing. Every refusal is the contract's:
 *   42501 — no `manage_roles`, or the availability guard (suspended group)
 *   P0001 — the lockout guard (applying would leave the group with no role
 *           granting a permission) or a retired source template
 *   P0002 — ghost/foreign role, or a role with no source template
 * Each message is passed through verbatim so the ceremony can show it in
 * place. Mutating verb, so identity is server-verified via `getUser()`
 * (ADR-U037).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; roleId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('roles.apply_update_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, roleId } = await params;

  try {
    const applied = await applyRoleTemplateUpdate(supabase, roleId);
    emitTelemetry('roles.apply_update', { actor: user.id, group: id, role: roleId });
    return NextResponse.json({ applied });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('roles.apply_update_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0001') {
      // The lockout guard and the retired-template refusal both land here.
      // The contract names which permission or which template, so the
      // ceremony shows a sentence the Steward can act on.
      emitTelemetry('roles.apply_update_conflict', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Cannot apply this update' }, { status: 409 });
    }
    if (code === 'P0002') {
      emitTelemetry('roles.apply_update_missing', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Role not found' }, { status: 404 });
    }
    emitTelemetry('roles.apply_update_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to apply the update' }, { status: 500 });
  }
}
