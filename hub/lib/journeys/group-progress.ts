/**
 * FEAT-H022 (JRN-16/17) — the group progress read transport. A thin BFF call: the
 * FEAT-PD005 `get_group_journey_progress` contract decides everything (membership
 * standing, view_group_progress / view_others_progress gating, the consent-shaped
 * derivation); this only shapes the call and rethrows the BFF's HTTP status as a
 * `JourneysApiError`. No module cache here — the panel is expand-on-demand and the
 * GroupJourneyProgressSection holds fetched state per enrolment for the page
 * session (spec: "repeated expands within the session reuse the fetched state").
 */
import { JourneysApiError } from '@/lib/journeys/client';
import type { GroupJourneyProgress } from '@/lib/journeys/queries';

export type { GroupJourneyProgress };

async function throwFrom(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  throw new JourneysApiError(body?.error ?? fallback, res.status);
}

/** One justified standalone read (ADR-U042) on the Edge/`dub1` progress route. */
export async function fetchGroupJourneyProgress(
  groupId: string,
  enrollmentId: string,
): Promise<GroupJourneyProgress> {
  const res = await fetch(`/api/groups/${groupId}/journeys/${enrollmentId}/progress`);
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const data = (await res.json()) as { progress: GroupJourneyProgress };
  return data.progress;
}
