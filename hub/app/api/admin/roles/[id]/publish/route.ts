import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { publishRoleTemplate, unpublishRoleTemplate, AdminRolesError } from '@/lib/admin/roles';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

/**
 * RD-B FEAT-H044 STORY-3 / FEAT-PC028 STORY-1 — publish (POST) and unpublish
 * (DELETE) a role template's reach.
 *
 * Offerability only. Publishing never writes into a group (RD-2) and
 * unpublishing never reaches into one either — copies already adopted keep
 * working. Body `{ group_ids: string[] | null }`; null (or an absent key)
 * means platform-wide, matching the contract's own default.
 *
 * Private BFF plumbing: session handling, SQLSTATE→HTTP mapping, telemetry.
 * Every rule lives in the contract (ADR-U038) — `is_platform_admin` inside the
 * RPC, the system-template refusal, the retirement refusal — so a sibling
 * Surface calling the same RPC inherits all of it. This route decides nothing.
 */
// TASK-RDC-03: 42501 is absent DELIBERATELY — see the retire sibling. `call()`
// collapses it into `refused` before it can reach here, so only the non-admin
// gate raises it and the 404 existence-hiding shape is correct for that.
const refusalStatus = (code: string): number | null => {
  if (code === 'P0002') return 404;
  if (code === 'P0001') return 409; // retired template — surfaced verbatim
  if (code === '22023') return 400;
  return null;
};

async function handle(
  request: Request,
  params: Promise<{ id: string }>,
  verb: 'publish' | 'unpublish',
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    emitTelemetry(`admin.role_template_${verb}_unauthenticated`);
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = await params;

  // THE REACH-WIDENING GUARD. `null` means platform-wide — correct as an
  // explicit instruction, dangerous as a fallback. If a targeted unpublish's
  // body were lost or unparseable, defaulting to null would silently turn
  // "stop offering this to Willow Circle" into "stop offering this to
  // everyone". So the key must be PRESENT: absence is refused, never widened.
  // An empty array is refused for the same reason — it is not platform-wide.
  const body = await request.json().catch(() => undefined);
  if (typeof body !== 'object' || body === null || !('group_ids' in body)) {
    return NextResponse.json(
      { error: 'Send group_ids explicitly: null for all groups, or a non-empty list' },
      { status: 400 },
    );
  }
  const groupIds = (body as { group_ids: unknown }).group_ids;
  if (groupIds !== null && (!Array.isArray(groupIds) || groupIds.length === 0)) {
    return NextResponse.json(
      { error: 'Send group_ids as a non-empty list, or null for all groups' },
      { status: 400 },
    );
  }

  try {
    const { refused } =
      verb === 'publish'
        ? await publishRoleTemplate(supabase, id, groupIds as string[] | null)
        : await unpublishRoleTemplate(supabase, id, groupIds as string[] | null);
    if (refused) {
      emitTelemetry(`admin.role_template_${verb}_refused`, { actor: user.id, target: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, `admin.role_template_${verb}ed`, {
      actor: user.id,
      target: id,
      platform_wide: groupIds === null,
    });
    return NextResponse.json({});
  } catch (err) {
    if (err instanceof AdminRolesError) {
      const status = refusalStatus(err.code);
      if (status) {
        emitTelemetry(`admin.role_template_${verb}_refused`, {
          actor: user.id,
          target: id,
          code: err.code,
        });
        // The refusal string IS the product copy — surfaced verbatim, except
        // where it would leak existence (404).
        return NextResponse.json(
          { error: status === 404 ? 'Not found' : err.message },
          { status },
        );
      }
    }
    emitTelemetry(`admin.role_template_${verb}_failed`, {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: `Failed to ${verb} the role template` }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, 'publish');
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, 'unpublish');
}
