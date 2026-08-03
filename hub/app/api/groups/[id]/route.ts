import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { availabilityRefusal } from '@/lib/groups/http';
import { fetchGroupDetail, updateGroupSettings, type UpdateGroupSettingsInput } from '@/lib/groups/queries';
import { deleteGroup } from '@/lib/groups/leadership';
import { fetchGroupEnrollmentSummary } from '@/lib/journeys/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H013 — GET /api/groups/[id] (GRP-4 detail · GRP-5, STORY-2).
 *
 * The FEAT-PC010 `get_group_detail()` contract decides everything (visibility,
 * member-list inclusion, capability flags); this route is presentation only.
 * ADR-U037: read-path identity via local JWT verification. SQLSTATE → HTTP:
 * P0002 → 404 (private and absent indistinguishable); 42501 → 403; else 500.
 * Telemetry carries actor + group id only — never group content.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('groups.detail_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const group = await fetchGroupDetail(supabase, id);
    emitTelemetry('groups.detail', { actor: userId, group: id });

    // FEAT-H019 STORY-6 (the GRP-4 seam): the FEAT-PD002 enrolment-summary
    // read composes here as an ADR-U042 failure-isolated slice — a DS-3 read
    // beside the PC-3 group read (never a get_group_detail field, one-way
    // rule ADR-U023). A failed slice never fails the group response; the
    // failure is logged content-free, never swallowed (ADR-U042 §2).
    let enrollments: { data: unknown } | { error: string };
    try {
      enrollments = { data: await fetchGroupEnrollmentSummary(supabase, id) };
    } catch (sliceErr) {
      const code = (sliceErr as { code?: string }).code;
      emitTelemetry('groups.enrollment_slice_failed', { actor: userId, group: id, code });
      enrollments = { error: 'unavailable' };
    }

    return NextResponse.json({ group, enrollments });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === 'P0002') {
      emitTelemetry('groups.detail_missing', { actor: userId, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (code === '42501') {
      emitTelemetry('groups.detail_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Groups are for members' }, { status: 403 });
    }
    emitTelemetry('groups.detail_failed', { actor: userId, code });
    return NextResponse.json({ error: 'Failed to load the group' }, { status: 500 });
  }
}

/**
 * FEAT-H013 — PATCH /api/groups/[id] (GRP-2 · GRP-3, STORY-3/4).
 *
 * Partial settings update via the FEAT-PC010 `update_group_settings()`
 * contract — per-field permission keys live substrate-side; the route maps
 * refusals honestly (42501 → 403, P0002 → 404, 22023 → 400, else 500) and
 * returns the contract's fresh detail. Mutation → per-request getUser.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('groups.update_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as UpdateGroupSettingsInput;

  try {
    const group = await updateGroupSettings(supabase, id, body);
    emitTelemetry('groups.update', { actor: user.id, group: id });
    return NextResponse.json({ group });
  } catch (err) {
    const code = (err as { code?: string }).code;
    // FEAT-H038 STORY-5: the FEAT-PC023 availability refusals pass through
    // verbatim — a resting/suspended group's frozen settings door speaks.
    const availability = availabilityRefusal(err);
    if (availability) {
      emitTelemetry('groups.update_refused', { actor: user.id, code });
      return availability;
    }
    if (code === '42501') {
      emitTelemetry('groups.update_refused', { actor: user.id, code });
      return NextResponse.json({ error: 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('groups.update_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (code === '22023') {
      emitTelemetry('groups.update_invalid', { actor: user.id, code });
      return NextResponse.json({ error: 'A group needs a name' }, { status: 400 });
    }
    emitTelemetry('groups.update_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to update the group' }, { status: 500 });
  }
}

/**
 * FEAT-H017 — DELETE /api/groups/[id] (GRP-9, STORY-5).
 *
 * Deliberate group deletion via the FEAT-PC014 `delete_group` contract —
 * soft-terminal `archived` (Open Q5), members notified and work reassigned
 * substrate-side. Its own verb on the group resource: never conflated with
 * member removal (DELETE .../members/[memberGroupId]) or leave. The
 * permission gate (`delete_group`) refuses substrate-side; 42501 → 403,
 * P0002 → 404, P0001 → 409 with the message through, else 500 content-free.
 * Mutation → per-request getUser. Telemetry id-only (STORY-6).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('groups.delete_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const result = await deleteGroup(supabase, id);
    emitTelemetry('groups.delete', { actor: user.id, group: id });
    return NextResponse.json(result);
  } catch (err) {
    const { code, message } = err as { code?: string; message?: string };
    if (code === '42501') {
      emitTelemetry('groups.delete_refused', { actor: user.id, code });
      return NextResponse.json({ error: message ?? 'Not permitted' }, { status: 403 });
    }
    if (code === 'P0002') {
      emitTelemetry('groups.delete_missing', { actor: user.id, code });
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }
    if (code === 'P0001') {
      emitTelemetry('groups.delete_conflict', { actor: user.id, code });
      return NextResponse.json(
        { error: message ?? 'The group cannot be deleted' },
        { status: 409 },
      );
    }
    emitTelemetry('groups.delete_failed', { actor: user.id, code });
    return NextResponse.json({ error: 'Failed to delete the group' }, { status: 500 });
  }
}
