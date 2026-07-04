import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { assignMemberRole, removeMemberRole } from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H014 — POST /api/groups/[id]/members/[memberGroupId]/roles/[roleId]
 * (GRP-7 assign, STORY-3).
 *
 * The assignment-time anti-escalation wall (`can_assign_role()`) lives
 * substrate-side; its refusal message passes through (42501 → 403). 22023 →
 * 400 (target not an active member); 23505 → 409 (already assigned);
 * P0002 → 404 (ghost/foreign group or role, no leak). Telemetry id-only —
 * member display data and role names never in events.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberGroupId: string; roleId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('roles.assign_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, memberGroupId, roleId } = await params;

  try {
    await assignMemberRole(supabase, id, memberGroupId, roleId);
    emitTelemetry('roles.assign', {
      actor: user.id,
      group: id,
      member: memberGroupId,
      role: roleId,
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('roles.assign_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === '22023') {
      emitTelemetry('roles.assign_invalid', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'Target is not an active member' },
        { status: 400 },
      );
    }
    if (code === '23505') {
      emitTelemetry('roles.assign_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: 'The member already holds this role' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('roles.assign_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    emitTelemetry('roles.assign_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to assign the role' }, { status: 500 });
  }
}

/**
 * FEAT-H014 — DELETE /api/groups/[id]/members/[memberGroupId]/roles/[roleId]
 * (GRP-7 remove, STORY-3).
 *
 * Rides the last-Steward / last-DeusEx invariants — their refusals arrive as
 * P0001 and map to 409 with the message passed through (the Surface shows it
 * in place; the chip stays). 42501 → 403; P0002 → 404 (missing binding).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; memberGroupId: string; roleId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('roles.unassign_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id, memberGroupId, roleId } = await params;

  try {
    await removeMemberRole(supabase, id, memberGroupId, roleId);
    emitTelemetry('roles.unassign', {
      actor: user.id,
      group: id,
      member: memberGroupId,
      role: roleId,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === 'P0001') {
      emitTelemetry('roles.unassign_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'This binding cannot be removed' },
        { status: 409 },
      );
    }
    if (code === '42501') {
      emitTelemetry('roles.unassign_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('roles.unassign_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Binding not found' }, { status: 404 });
    }
    emitTelemetry('roles.unassign_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to remove the role' }, { status: 500 });
  }
}
