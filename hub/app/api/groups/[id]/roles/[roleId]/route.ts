import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  updateGroupRole,
  setGroupRolePermission,
  deleteGroupRole,
} from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H014 — PATCH /api/groups/[id]/roles/[roleId] (GRP-6 tend, STORY-2).
 *
 * One operation per call: either `set_permission` (grant flip via
 * `set_group_role_permission()` — the definition-time wall surfaces its
 * message, 42501 → 403) or `name`/`description` (partial rename via
 * `update_group_role()`). Mixed or empty bodies are 400 — the route refuses
 * ambiguity rather than inventing precedence. 22023 → 400; 23505 → 409
 * (duplicate name); P0002 → 404 (ghost/foreign role ids, no leak).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; roleId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('roles.update_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, roleId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    name?: string;
    description?: string;
    set_permission?: { name: string; granted: boolean };
  };

  const hasRename = body.name !== undefined || body.description !== undefined;
  const hasFlip = body.set_permission !== undefined;
  if (hasRename === hasFlip) {
    // Both or neither — one operation per call.
    return NextResponse.json(
      { error: 'Send either a rename (name/description) or one set_permission' },
      { status: 400 },
    );
  }

  try {
    const role = hasFlip
      ? await setGroupRolePermission(
          supabase,
          roleId,
          body.set_permission!.name,
          body.set_permission!.granted,
        )
      : await updateGroupRole(supabase, roleId, {
          name: body.name,
          description: body.description,
        });
    emitTelemetry('roles.update', { actor: user.id, group: id, role: roleId });
    return NextResponse.json({ role });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('roles.update_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === '22023') {
      emitTelemetry('roles.update_invalid', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Invalid update' }, { status: 400 });
    }
    if (code === '23505') {
      emitTelemetry('roles.update_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: 'A role with that name already exists in this group' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('roles.update_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    emitTelemetry('roles.update_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to update the role' }, { status: 500 });
  }
}

/**
 * FEAT-H014 — DELETE /api/groups/[id]/roles/[roleId] (GRP-6, STORY-2).
 *
 * Custom + unheld only — the contract refuses template-derived (42501 → 403)
 * and held roles (P0001 → 409, the invariant's message passed through so the
 * Surface shows it in place). P0002 → 404 no-leak.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; roleId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('roles.delete_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, roleId } = await params;

  try {
    await deleteGroupRole(supabase, roleId);
    emitTelemetry('roles.delete', { actor: user.id, group: id, role: roleId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === 'P0001') {
      emitTelemetry('roles.delete_conflict', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Role is in use' }, { status: 409 });
    }
    if (code === '42501') {
      emitTelemetry('roles.delete_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('roles.delete_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    emitTelemetry('roles.delete_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to delete the role' }, { status: 500 });
  }
}
