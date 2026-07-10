/**
 * ADR-U042 — the first-paint bootstrap read (client half).
 *
 * `prefetchOverview()` fires GET /api/me/overview once per session (module
 * latch) and hands each slice to its resource client's in-flight slot
 * (adoption): `fetchProfile`, `fetchAccountState`, `fetchMyGroups`,
 * `fetchMyInvitations`, and `fetchMyNominations` then resolve from the bundle
 * with no additional network. The resource clients stay the only readers
 * their components know — no component imports this module.
 *
 * Failure semantics (guardrails 2–3): a slice `{ error }` rejects that
 * slice's consumer exactly as its standalone read would; a bundle TRANSPORT
 * failure (route down, deploy skew) rejects with `OverviewTransportError`,
 * which each adoption seam converts into its standalone contract read — the
 * bundle is droppable transport, never a contract.
 *
 * Invalidation: session end (AuthContext re-arms the latch on sign-out /
 * expiry) or an explicit `invalidateOverview()`.
 */
import type { GroupSummary } from '@/lib/groups/queries';
import type { MyInvitation } from '@/lib/groups/invitations';
import type { PendingNomination } from '@/lib/groups/leadership';
import type { Profile } from '@/lib/profile/queries';
import type { AccountState } from '@/lib/account/queries';
import { OverviewTransportError } from '@/lib/me/overview-shared';
import {
  adoptGroupsRead,
  adoptMyInvitationsRead,
  adoptMyNominationsRead,
} from '@/lib/groups/client';
import { adoptProfileRead } from '@/lib/profile/client';
import { adoptAccountStateRead } from '@/lib/account/client';
import { adoptOnboardingRead, type OnboardingStatus } from '@/lib/onboarding/client';

export type Slice<T> = { data: T } | { error: string };

export interface OverviewResponse {
  profile: Slice<Profile>;
  account_state: Slice<AccountState>;
  groups: Slice<GroupSummary[]>;
  invitations: Slice<MyInvitation[]>;
  nominations: Slice<PendingNomination[]>;
  onboarding: Slice<OnboardingStatus>;
}

let latched = false;

function slice<T>(bundle: Promise<OverviewResponse>, key: keyof OverviewResponse): Promise<T> {
  // A bundle rejection (OverviewTransportError) passes through untouched —
  // the adoption seams recognize it and fall back to the standalone read.
  return bundle.then((o) => {
    const s = o[key] as Slice<T> | undefined;
    if (s && 'data' in s) return s.data;
    throw new Error(s && 'error' in s ? s.error : `Failed to load ${key}`);
  });
}

/** Fire the bootstrap bundle once per session and adopt its slices. */
export function prefetchOverview(): void {
  if (latched) return;
  latched = true;

  const bundle: Promise<OverviewResponse> = (async () => {
    let res: Response;
    try {
      res = await fetch('/api/me/overview');
    } catch (err) {
      throw new OverviewTransportError((err as Error).message);
    }
    if (!res.ok) throw new OverviewTransportError(`Request failed (${res.status})`);
    return (await res.json()) as OverviewResponse;
  })();
  bundle.catch(() => {}); // outcomes are handled per-slice by the adoption seams

  adoptProfileRead(slice<Profile>(bundle, 'profile'));
  adoptAccountStateRead(slice<AccountState>(bundle, 'account_state'));
  adoptGroupsRead(slice<GroupSummary[]>(bundle, 'groups'));
  adoptMyInvitationsRead(slice<MyInvitation[]>(bundle, 'invitations'));
  adoptMyNominationsRead(slice<PendingNomination[]>(bundle, 'nominations'));
  adoptOnboardingRead(slice<OnboardingStatus>(bundle, 'onboarding')); // FEAT-H023 (B1)
}

/** Re-arm the latch (sign-out / session end / account switch). */
export function invalidateOverview(): void {
  latched = false;
}
