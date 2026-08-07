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
const refusalStatus = (code: string): number | null => {
  if (code === 'P0002') return 404;
  if (code === '42501') return 403; // non-admin
  if (code === 'P0001') return 409; // system or retired template
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
  const body = (await request.json().catch(() => ({}))) as { group_ids?: string[] | null };
  // Absent or null both mean platform-wide — the contract's own default, not
  // a Surface invention. An empty array is NOT the same thing and is refused
  // here rather than silently widened to platform-wide.
  const groupIds = body.group_ids ?? null;
  if (groupIds !== null && (!Array.isArray(groupIds) || groupIds.length === 0)) {
    return NextResponse.json(
      { error: 'Send group_ids as a non-empty list, or null for all groups' },
      { status: 400 },
    );
  }

  try {
    const { refused } =
      verb === 'publish'
        ? await publishRoleTemplate(supabase, id, groupIds)
        : await unpublishRoleTemplate(supabase, id, groupIds);
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
