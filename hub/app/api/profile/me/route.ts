import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchMyProfile,
  updateMyProfile,
  ProfileValidationError,
  type ProfilePatch,
} from '@/lib/profile/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): run on the Edge runtime (V8 isolate, ~0ms cold start), pinned to
// `dub1` so co-location with the Ireland DB (ADR-U035) is preserved. GET + PATCH both
// use only Edge-safe APIs (@supabase/ssr, next/headers cookies, request.json, fetch).
// Keep this route's imports Edge-safe (no Node-only APIs).
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * FEAT-PC003 — the self-service profile contract boundary (PC-2 Identity, the
 * platform half of IDN-4). GET reads the caller's own identity-scope profile;
 * PATCH updates only their own identity-scope fields. Both run as the
 * authenticated caller under own-row RLS (ADR-U009: DB -> API -> frontend; the
 * frontend never touches `public.users` directly). V4: telemetry on success AND
 * failure; RLS/substrate failures surface (never silently empty). Additive
 * route — no ADR-U015 version bump.
 *
 * Route path is `/api/profile/me`, matching the shipped `/api/<resource>`
 * convention; the spec's `/api/v1/...` is directional and not yet realised in
 * the new Hub.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('profile.read_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const profile = await fetchMyProfile(supabase);
    if (!profile) {
      emitTelemetry('profile.read_not_found', { actor: user.id });
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    emitTelemetry('profile.read', { actor: user.id });
    return NextResponse.json({ profile });
  } catch (err) {
    emitTelemetry('profile.read_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  let body: ProfilePatch;
  try {
    body = (await request.json()) as ProfilePatch;
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    emitTelemetry('profile.update_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const profile = await updateMyProfile(supabase, body);
    emitTelemetry('profile.updated', { actor: user.id });
    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof ProfileValidationError) {
      // Identity-scope gating / field validation — a rejection, not a swallowed empty.
      emitTelemetry('profile.update_rejected', { actor: user.id, reason: err.message });
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    emitTelemetry('profile.update_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
