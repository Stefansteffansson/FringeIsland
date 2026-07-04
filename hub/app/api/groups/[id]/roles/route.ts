import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import {
  fetchGroupRoles,
  fetchRoleTemplates,
  createGroupRole,
  type CreateGroupRoleInput,
} from '@/lib/groups/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): the fabric read is a member-facing page-load hot path —
// Edge runtime, pinned to `dub1` for DB co-location (ADR-U035). POST rides the
// same file (single RPC, Edge-safe). Everything imported must stay Edge-safe.
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * FEAT-H014 — GET /api/groups/[id]/roles (GRP-6/7 read, STORY-1).
 *
 * The FEAT-PC011 `get_group_roles()` contract decides everything (visibility,
 * capability flags, the catalog riding the payload); this route is
 * presentation only. ADR-U037: read-path identity via local JWT verification.
 * SQLSTATE → HTTP: P0002 → 404 (private and absent indistinguishable);
 * 42501 → 403; else 500. Telemetry id-only — role names are member content.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('roles.fabric_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    // Templates ride the response — platform vocabulary the picker needs,
    // RLS-readable by any authenticated client (composed, not owned here).
    const [fabric, templates] = await Promise.all([
      fetchGroupRoles(supabase, id),
      fetchRoleTemplates(supabase),
    ]);
    emitTelemetry('roles.fabric', { actor: userId, group: id });
    return NextResponse.json({ fabric, templates });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P0002') {
      emitTelemetry('roles.fabric_missing', { actor: userId, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('roles.fabric_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Roles are for members' }, { status: 403 });
    }
    emitTelemetry('roles.fabric_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load the roles' }, { status: 500 });
  }
}

/**
 * FEAT-H014 — POST /api/groups/[id]/roles (GRP-6 define, STORY-2).
 *
 * Template instantiation or custom definition via `create_group_role()` —
 * the definition-time anti-escalation wall lives substrate-side; the route
 * surfaces its message (42501 → 403). 22023 → 400 (bad name / unknown
 * permission / reserved auto-link name); 23505 → 409 (duplicate role name);
 * P0002 → 404. Mutation → per-request getUser.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('roles.create_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as CreateGroupRoleInput;

  try {
    const roleId = await createGroupRole(supabase, id, body);
    emitTelemetry('roles.create', { actor: user.id, group: id, role: roleId });
    return NextResponse.json({ id: roleId }, { status: 201 });
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('roles.create_refused', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'Not permitted' },
        { status: 403 },
      );
    }
    if (code === '22023') {
      emitTelemetry('roles.create_invalid', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'Invalid role definition' },
        { status: 400 },
      );
    }
    if (code === '23505') {
      emitTelemetry('roles.create_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: 'A role with that name already exists in this group' },
        { status: 409 },
      );
    }
    if (code === 'P0002') {
      emitTelemetry('roles.create_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    emitTelemetry('roles.create_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to create the role' }, { status: 500 });
  }
}
