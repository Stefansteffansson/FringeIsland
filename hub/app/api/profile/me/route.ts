import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import {
  fetchMyProfile,
  updateMyProfile,
  ProfileValidationError,
  type ProfilePatch,
} from '@/lib/profile/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

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
 * convention. Per ADR-U038 this route is private Hub BFF plumbing, so ADR-U015
 * `/api/v1` versioning + Bearer auth bind the PLATFORM surface (the PostgREST RPC
 * beneath — get_own_profile / update_own_profile), not this BFF path; a
 * cookie-session, unversioned Surface route is conformant.
 */
export async function GET() {
  // ADR-U037: read-path identity via local JWT verification — no Auth-server
  // round-trip. Server-Timing instruments the auth/query split for the Network
  // tab (this route is on the measured hot navigation path).
  const t0 = Date.now();
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  const tAuth = Date.now();

  if (!userId) {
    emitTelemetry('profile.read_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const profile = await fetchMyProfile(supabase);
    const tQuery = Date.now();
    if (!profile) {
      emitTelemetry('profile.read_not_found', { actor: userId });
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }
    emitTelemetry('profile.read', { actor: userId });
    return NextResponse.json(
      { profile },
      { headers: { 'Server-Timing': `auth;dur=${tAuth - t0}, query;dur=${tQuery - tAuth}` } },
    );
  } catch (err) {
    emitTelemetry('profile.read_failed', { actor: userId, message: (err as Error).message });
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
    // FEAT-H038 STORY-3 (W-8): typed SQLSTATE refusals map to honest HTTP
    // (the announcements http.ts idiom — presentation only, ADR-U038; the
    // gates live in the update_own_profile substrate). The canonical refusal
    // message is member copy and passes through; only genuinely untyped
    // failures stay a generic 500.
    const code = (err as { code?: string }).code;
    if (code === '42501' || code === 'P0001' || code === '22023' || code === 'P0002') {
      emitTelemetry('profile.update_refused', { actor: user.id, code });
      const status =
        code === '42501' ? 403 : code === 'P0001' ? 409 : code === '22023' ? 400 : 404;
      return NextResponse.json({ error: (err as Error).message }, { status });
    }
    emitTelemetry('profile.update_failed', { actor: user.id, message: (err as Error).message });
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
