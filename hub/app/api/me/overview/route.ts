import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { fetchMyProfile } from '@/lib/profile/queries';
import { fetchOwnAccountState } from '@/lib/account/queries';
import { fetchMemberGroups } from '@/lib/groups/queries';
import { fetchMyInvitations } from '@/lib/groups/invitations';
import { fetchPendingNominations } from '@/lib/groups/leadership';
import { emitTelemetry } from '@/lib/observability/telemetry';

// Perf (ADR-U036): hot render-path read — Edge runtime, pinned to `dub1`
// (ADR-U035 co-location). Keep imports Edge-safe (no Node-only APIs).
export const runtime = 'edge';
export const preferredRegion = 'dub1';

/**
 * ADR-U042 — GET /api/me/overview, the first-paint bootstrap bundle.
 *
 * One Edge invocation, one ADR-U037 identity verification, five CONCURRENT
 * substrate reads — the same lib query functions the standalone routes call
 * (`/api/profile/me`, `/api/account/state`, `/api/groups`,
 * `/api/me/invitations`, `/api/me/nominations`), so each slice is
 * payload-equivalent to its standalone read by construction.
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

async function readSlice<T>(
  name: string,
  actor: string,
  read: () => Promise<T>,
  failureMessage: string,
): Promise<Slice<T>> {
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
  }
}

export async function GET() {
  // ADR-U037: read-path identity via local JWT verification — no Auth-server
  // round-trip on the hot path.
  const supabase = await createClient();
  const userId = await getVerifiedUserId(supabase);

  if (!userId) {
    emitTelemetry('overview.read_unauthenticated');
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const [profile, account_state, groups, invitations, nominations] = await Promise.all([
    readSlice(
      'profile',
      userId,
      async () => {
        const p = await fetchMyProfile(supabase);
        if (!p) throw new SliceRefusal('Profile not found');
        return p;
      },
      'Failed to load profile',
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
    ),
    readSlice('groups', userId, () => fetchMemberGroups(supabase), 'Failed to load groups'),
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
    ),
    readSlice(
      'nominations',
      userId,
      () => fetchPendingNominations(supabase),
      'Failed to load nominations',
    ),
  ]);

  const failed = [profile, account_state, groups, invitations, nominations].filter(
    (s) => 'error' in s,
  ).length;
  emitTelemetry('overview.read', { actor: userId, failed });

  return NextResponse.json({ profile, account_state, groups, invitations, nominations });
}
