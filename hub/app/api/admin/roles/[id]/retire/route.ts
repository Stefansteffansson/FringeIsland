import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { retireRoleTemplate, unretireRoleTemplate, AdminRolesError } from '@/lib/admin/roles';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { emitDurableTelemetry } from '@/lib/observability/telemetry-server';

// RD-A FEAT-H043 STORY-2 / FEAT-PC027 STORY-3: retire (POST) and unretire
// (DELETE) a role template. Offerability only — the platform guarantees the
// act never reaches into a group (RD-2) and never deletes (RD-4), and refuses
// system templates. This route is private BFF plumbing: session handling,
// SQLSTATE→HTTP mapping and telemetry. Every rule lives in the contract
// (ADR-U038), so a sibling Surface calling the same RPC inherits all of it.

const refusalStatus = (code: string): number | null => {
  if (code === 'P0002') return 404;
  if (code === '42501') return 403; // system template, or non-admin
  if (code === 'P0001') return 409;
  if (code === '22023') return 400;
  return null;
};

async function handle(
  request: Request,
  params: Promise<{ id: string }>,
  verb: 'retire' | 'unretire',
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
  try {
    const { refused } =
      verb === 'retire'
        ? await retireRoleTemplate(supabase, id)
        : await unretireRoleTemplate(supabase, id);
    if (refused) {
      emitTelemetry(`admin.role_template_${verb}_refused`, { actor: user.id, target: id });
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    await emitDurableTelemetry(supabase, `admin.role_template_${verb}d`, {
      actor: user.id,
      target: id,
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
        // The refusal string IS the product copy — surfaced verbatim, not
        // paraphrased, except where it would leak existence (404).
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
    return NextResponse.json(
      { error: `Failed to ${verb} the role template` },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, 'retire');
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(request, params, 'unretire');
}
