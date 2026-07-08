/**
 * FEAT-H020 — the journey player transports + per-enrolment session cache
 * (Cycle J-B). Data-boot per ADR-U042: one justified standalone read
 * (get_player_state) plus a session cache keyed by enrollmentId. Cache
 * semantics are the PR #102 groups pattern: `peekPlayerState` paints the last
 * resolved payload instantly (B4 revisit), `fetchPlayerState` always
 * revalidates and concurrent callers ON ONE ENROLMENT share a single in-flight
 * request, a FAILED read is never cached, and AuthContext drops every entry on
 * sign-out / session end via `invalidatePlayerCache()`.
 *
 * `enterStep`/`completeStep` are thin background-save wrappers (JRN-9 auto-save)
 * that return the instance payload and write NO cache — the player page owns
 * optimistic progress state (the scoped optimistic-advance deviation from the
 * "mutations re-read" doctrine, FEAT-H020 §Solution sketch), re-reading via
 * `fetchPlayerState` when it needs the truth. Errors carry the BFF's HTTP status
 * (the shared `JourneysApiError`) so a P0001 gate paints the honest 409 state.
 */
import type {
  PlayerInstance,
  PlayerState,
  PlayerStep,
  PlayerCompletion,
  PlayerTiming,
  PlayerStepTiming,
  PlayerFreeze,
  PlayerProgressSharing,
  StepCompletionResult,
} from '@/lib/journeys/queries';
import { JourneysApiError } from '@/lib/journeys/client';

export type {
  PlayerInstance,
  PlayerState,
  PlayerStep,
  PlayerCompletion,
  PlayerTiming,
  PlayerStepTiming,
  PlayerFreeze,
  PlayerProgressSharing,
  StepCompletionResult,
};

async function throwFrom(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  throw new JourneysApiError(body?.error ?? fallback, res.status);
}

// --- per-enrolment player-state cache ----------------------------------------

const cachedState = new Map<string, PlayerState>();
const stateInFlight = new Map<string, Promise<PlayerState>>();

async function requestPlayerState(enrollmentId: string): Promise<PlayerState> {
  const res = await fetch(`/api/journeys/enrollments/${enrollmentId}/player`);
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const data = (await res.json()) as { player: PlayerState };
  return data.player;
}

/** The last resolved player state for this enrolment — instant revisit paint (B4). */
export function peekPlayerState(enrollmentId: string): PlayerState | null {
  return cachedState.get(enrollmentId) ?? null;
}

/** Player-state read: always revalidates; concurrent callers on ONE enrolment
 *  share a request; a FAILED read is never cached — the next caller retries. */
export function fetchPlayerState(enrollmentId: string): Promise<PlayerState> {
  const existing = stateInFlight.get(enrollmentId);
  if (existing) return existing;
  const inFlight: Promise<PlayerState> = requestPlayerState(enrollmentId)
    .then((state) => {
      cachedState.set(enrollmentId, state);
      return state;
    })
    .finally(() => {
      if (stateInFlight.get(enrollmentId) === inFlight) stateInFlight.delete(enrollmentId);
    });
  inFlight.catch(() => {}); // never unhandled if a caller drops it
  stateInFlight.set(enrollmentId, inFlight);
  return inFlight;
}

/** Drop every per-enrolment player cache (sign-out / session end / account switch). */
export function invalidatePlayerCache(): void {
  cachedState.clear();
  stateInFlight.clear();
}

// --- background-save transports (no cache writes; the page owns optimistic state) ---

/** JRN-9 auto-save: record engagement with a step. Returns the instance payload;
 *  writes no cache — optimistic progress belongs to the page, re-read on demand. */
export async function enterStep(
  enrollmentId: string,
  stepId: string,
): Promise<PlayerInstance> {
  const res = await fetch(
    `/api/journeys/enrollments/${enrollmentId}/steps/${stepId}/enter`,
    { method: 'POST' },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as PlayerInstance;
}

/** JRN-8 completion: stamp passage (idempotent platform-side). Returns the
 *  instance payload PLUS the FEAT-PD004 transition flag + completion block (the
 *  milestone learned without a refetch, JRN-12); a P0001 gate/frozen refusal
 *  rejects with status 409 so the page can roll the optimistic tick back and
 *  paint the honest reason. */
export async function completeStep(
  enrollmentId: string,
  stepId: string,
): Promise<StepCompletionResult> {
  const res = await fetch(
    `/api/journeys/enrollments/${enrollmentId}/steps/${stepId}/complete`,
    { method: 'POST' },
  );
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as StepCompletionResult;
}

/**
 * FEAT-H022 STORY-2 (JRN-17, traveller side) — grant/withdraw progress sharing
 * for THIS via-group enrolment. A plain background mutation: the player owns the
 * optimistic flip and reconciles to this response; a refusal rejects with the
 * BFF's status (P0001 solo → 422, P0002 → 404, 42501 → 403) so the page can roll
 * back. Returns the server-confirmed sharing state. */
export async function setProgressSharing(
  enrollmentId: string,
  share: boolean,
): Promise<{ enrollment_id: string; sharing: boolean }> {
  const res = await fetch(`/api/journeys/enrollments/${enrollmentId}/sharing`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ share }),
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as { enrollment_id: string; sharing: boolean };
}
