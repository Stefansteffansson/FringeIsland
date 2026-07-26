import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import {
  fetchNudgePolicyView,
  setNudgePolicy,
  setCategoryNudge,
} from '@/lib/notifications/preferences';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H033 — GET /api/notifications/nudge-policy (the operator console's read).
 *
 * Closes N-C's NC-2a deferral: `ds5_config.realtime_hint_platform_announcements`
 * shipped as data with **no door**, and its own migration comment said the
 * operator surface arrives with N-D's preferences work.
 *
 * Composes two FEAT-PD016 contracts — the policy read and the reach count. Both
 * are `is_platform_admin()`-gated **in the substrate**, so a non-admin is refused
 * by the contract; hiding the panel in the UI is a courtesy, not the control
 * (ADR-U038: a route may never be the only place an authorization decision is
 * enforced). Composition is legitimate BFF work.
 *
 * The reach count is the whole point of board row ND-4: N-C measured that a
 * platform-wide announcement is billed per recipient **whether or not anyone is
 * listening**, so cost tracks headcount, not concurrency.
 */
export async function GET() {
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('notifications.nudge_policy_read_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const policy = await fetchNudgePolicyView(supabase);
    emitTelemetry('notifications.nudge_policy_read', {
      actor: userId,
      reach: policy.platform_reach,
    });
    return NextResponse.json({ policy });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501') {
      // Not an error condition — an ordinary member asking a question that isn't
      // theirs. Recorded (V4) and refused, never silently emptied.
      emitTelemetry('notifications.nudge_policy_read_refused', { actor: userId, code });
      return NextResponse.json({ error: 'Platform admin required' }, { status: 403 });
    }
    emitTelemetry('notifications.nudge_policy_read_failed', {
      actor: userId,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to load the nudge policy' }, { status: 500 });
  }
}

/**
 * FEAT-H033 — PUT /api/notifications/nudge-policy.
 *
 * Two shapes, one route (additive per ADR-U015 — same path, new method):
 *   { key, value }        → set_notification_nudge_policy      (a ds5_config row)
 *   { category, nudge }   → set_notification_category_nudge    (board row ND-5)
 *
 * Refusal mapping: 401 sessionless · 400 malformed · 422 (`22023`) unknown key or
 * category · 403 (`42501`) not a platform admin · 500 otherwise.
 */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('notifications.nudge_policy_write_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { key?: unknown; value?: unknown; category?: unknown; nudge?: unknown }
    | null;

  const isPolicyWrite = typeof body?.key === 'string' && typeof body?.value === 'string';
  const isCategoryWrite = typeof body?.category === 'string' && typeof body?.nudge === 'boolean';

  if (!isPolicyWrite && !isCategoryWrite) {
    emitTelemetry('notifications.nudge_policy_write_invalid', { actor: user.id });
    return NextResponse.json(
      { error: 'Provide either { key, value } or { category, nudge }' },
      { status: 400 },
    );
  }

  try {
    if (isPolicyWrite) {
      await setNudgePolicy(supabase, body!.key as string, body!.value as string);
      emitTelemetry('notifications.nudge_policy_write', {
        actor: user.id,
        key: body!.key as string,
        value: body!.value as string,
      });
    } else {
      await setCategoryNudge(supabase, body!.category as string, body!.nudge as boolean);
      emitTelemetry('notifications.nudge_category_write', {
        actor: user.id,
        category: body!.category as string,
        nudge: body!.nudge as boolean,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === '42501' || code === '22023') {
      const status = code === '42501' ? 403 : 422;
      emitTelemetry('notifications.nudge_policy_write_refused', {
        actor: user.id,
        code,
        status,
      });
      return NextResponse.json(
        { error: code === '42501' ? 'Platform admin required' : 'Unknown key or category' },
        { status },
      );
    }
    emitTelemetry('notifications.nudge_policy_write_failed', {
      actor: user.id,
      message: (err as Error).message,
    });
    return NextResponse.json({ error: 'Failed to save the nudge policy' }, { status: 500 });
  }
}
