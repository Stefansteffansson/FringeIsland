import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchMyProfile } from '@/lib/profile/queries';
import { fetchOwnAccountState } from '@/lib/account/queries';
import { fetchMemberGroups } from '@/lib/groups/queries';
import { fetchMyInvitations } from '@/lib/groups/invitations';
import { fetchOnboardingStatus } from '@/lib/onboarding/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * ADR-U042 — GET /api/me/overview, the first-paint bootstrap bundle.
 *
 * One invocation, one ADR-U037 identity verification, five CONCURRENT
 * substrate reads — the same lib query functions the standalone routes call
 * (`/api/profile/me`, `/api/account/state`, `/api/groups`,
 * `/api/me/invitations`, `/api/me/onboarding`), so each slice is
 * payload-equivalent to its standalone read by construction.
 *
 * The `nominations` slice was removed in A-NTF N-C (FEAT-H032 STORY-4): N-B
 * retired the `PendingNominations` section, its only consumer, leaving the
 * bundle computing a read that nothing rendered on every `/groups` first paint.
 * The standalone `/api/me/nominations` route outlived the bundle's use of it
 * under guardrail 3 until 2026-09-03, when its owner retired the whole chain
 * (TASK-H017-01). Members see their pending nominations in the bell -- a
 * different read path entirely.
 *
 * Guardrail 1 (bundle-only): this route aggregates and shapes; it never
 * decides. No filtering, no derivation, no authorization beyond what the five
 * substrate reads already enforce. Guardrail 2 (per-slice envelopes): each
 * slice resolves to `{ data }` or `{ error }` independently — one failed
 * slice never fails the paint; failures are logged content-free
 * (observability §7), never silently swallowed. Guardrail 3: the standalone
 * routes remain canonical; the Hub may drop this bundle at any time.
 */

type Slice<T> = { data: T } | { error: string };

/** A read outcome the standalone route reports with a specific message
 *  (profile 404, account-state 404, invitations 42501). */
class SliceRefusal extends Error {}

// P1-residual instrumentation (waterfall record 2026-07-07): per-instance
// invocation counter — n:1 marks the cold invocation whose function→Supabase
// connection setup the sign-in landing pays. Instance-scoped by construction.
let invocationN = 0;

async function readSlice<T>(
  name: string,
  actor: string,
  read: () => Promise<T>,
  failureMessage: string,
  timings: Record<string, number>,
): Promise<Slice<T>> {
  const t0 = performance.now();
  try {
    return { data: await read() };
  } catch (err) {
    // V4: a failed slice is an event — content-free (slice name + SQLSTATE only).
    emitTelemetry('overview.slice_failed', {
      actor,
      slice: name,
      code: (err as { code?: string }).code,
    });
    if (err instanceof SliceRefusal) return { error: err.message };
    return { error: failureMessage };
  } finally {
    timings[name] = Math.round(performance.now() - t0);
  }
}

export async function GET() {
  // P1-residual instrumentation: names + millisecond durations only — never
  // payload content. Read by the perf measurements as `x-overview-timing`
  // (a custom header, kept so the 2026-07 timing series stays comparable) and
  // carried in the overview.read event for the function-log history.
  const tStart = performance.now();
  const timings: Record<string, number> = { n: ++invocationN };

  // ADR-U037: read-path identity via local JWT verification — no Auth-server
  // round-trip on the hot path.
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);
  timings.auth = Math.round(performance.now() - tStart);

  if (!userId) {
    emitTelemetry('overview.read_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const [profile, account_state, groups, invitations, onboarding] = await Promise.all([
    readSlice(
      'profile',
      userId,
      async () => {
        const p = await fetchMyProfile(supabase);
        if (!p) throw new SliceRefusal('Profile not found');
        return p;
      },
      'Failed to load profile',
      timings,
    ),
    readSlice(
      'account_state',
      userId,
      async () => {
        const s = await fetchOwnAccountState(supabase);
        if (!s) throw new SliceRefusal('No account state');
        return s;
      },
      'Failed to load account state',
      timings,
    ),
    readSlice('groups', userId, () => fetchMemberGroups(supabase), 'Failed to load groups', timings),
    readSlice(
      'invitations',
      userId,
      async () => {
        try {
          return await fetchMyInvitations(supabase);
        } catch (err) {
          if ((err as { code?: string }).code === '42501') {
            throw new SliceRefusal('Invitations are for members');
          }
          throw err;
        }
      },
      'Failed to load invitations',
      timings,
    ),
    // FEAT-H023: the first-arrival read rides the landing (B1 — no extra
    // round-trip); the standalone /api/me/onboarding stays canonical.
    readSlice(
      'onboarding',
      userId,
      () => fetchOnboardingStatus(supabase),
      'Failed to load onboarding status',
      timings,
    ),
  ]);

  const failed = [profile, account_state, groups, invitations, onboarding].filter(
    (s) => 'error' in s,
  ).length;
  timings.total = Math.round(performance.now() - tStart);
  emitTelemetry('overview.read', { actor: userId, failed, timings });

  return NextResponse.json(
    { profile, account_state, groups, invitations, onboarding },
    { headers: { 'x-overview-timing': JSON.stringify(timings) } },
  );
}
