/**
 * FEAT-H019 — the Journeys browser transports + session cache (Cycle J-A).
 *
 * Data-boot per ADR-U042: justified standalone reads + session cache — the
 * journeys pages are navigation targets, not first-paint-at-landing, so there
 * is no overview-bundle slice and no adopt* path. Cache semantics are the
 * PR #102 groups pattern: `peek*` paints the last resolved payload instantly
 * (B4 revisit), `fetch*` always revalidates and concurrent callers share one
 * in-flight request, a FAILED read is never cached, and AuthContext drops
 * everything on sign-out / session end via `invalidateJourneysCache()`.
 * Mutations re-read, never optimistic (the page re-fetches after settle).
 */
import type { JourneyCard, JourneyDetail, MyEnrollment } from '@/lib/journeys/queries';
import { registerCacheInvalidator } from '@/lib/auth/cache-registry';

export type { JourneyCard, JourneyDetail, MyEnrollment };

/** Carries the BFF's HTTP status so pages can render 404 honestly. */
export class JourneysApiError extends Error {
  status: number;
  /** The BFF's named refusal, when it names one (TASK-MIST-01:
   *  `no_resolvable_actor` on the own-enrolments read). */
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'JourneysApiError';
    this.status = status;
    this.code = code;
  }
}

async function throwFrom(res: Response, fallback: string): Promise<never> {
  const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
  throw new JourneysApiError(body?.error ?? fallback, res.status, body?.code);
}

// --- catalogue cache ---------------------------------------------------------

let cachedCatalog: JourneyCard[] | null = null;
let catalogInFlight: Promise<JourneyCard[]> | null = null;

async function requestCatalog(): Promise<JourneyCard[]> {
  const res = await fetch('/api/journeys');
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const data = (await res.json()) as { journeys: JourneyCard[] };
  return data.journeys ?? [];
}

/** The last resolved catalogue this session — instant revisit paint (B4). */
export function peekJourneyCatalog(): JourneyCard[] | null {
  return cachedCatalog;
}

/** Catalogue read: always revalidates; concurrent callers share one request;
 *  a FAILED read is never cached — the next caller retries. */
export function fetchJourneyCatalog(): Promise<JourneyCard[]> {
  if (catalogInFlight) return catalogInFlight;
  const inFlight: Promise<JourneyCard[]> = requestCatalog()
    .then((journeys) => {
      cachedCatalog = journeys;
      return journeys;
    })
    .finally(() => {
      if (catalogInFlight === inFlight) catalogInFlight = null;
    });
  inFlight.catch(() => {}); // never unhandled if a caller drops it
  catalogInFlight = inFlight;
  return inFlight;
}

// --- my-enrolments cache -----------------------------------------------------

let cachedEnrollments: MyEnrollment[] | null = null;
let enrollmentsInFlight: Promise<MyEnrollment[]> | null = null;

async function requestMyEnrollments(): Promise<MyEnrollment[]> {
  const res = await fetch('/api/me/journeys');
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const data = (await res.json()) as { enrollments: MyEnrollment[] };
  return data.enrollments ?? [];
}

/** The last resolved enrolments list this session (Enrolled badges, B4). */
export function peekMyJourneyEnrollments(): MyEnrollment[] | null {
  return cachedEnrollments;
}

/** My-enrolments read — same cache semantics as the catalogue. */
export function fetchMyJourneyEnrollments(): Promise<MyEnrollment[]> {
  if (enrollmentsInFlight) return enrollmentsInFlight;
  const inFlight: Promise<MyEnrollment[]> = requestMyEnrollments()
    .then((enrollments) => {
      cachedEnrollments = enrollments;
      return enrollments;
    })
    .finally(() => {
      if (enrollmentsInFlight === inFlight) enrollmentsInFlight = null;
    });
  inFlight.catch(() => {});
  enrollmentsInFlight = inFlight;
  return inFlight;
}

/** Drop the session journeys caches (sign-out / session end / account switch). */
export function invalidateJourneysCache(): void {
  cachedCatalog = null;
  catalogInFlight = null;
  cachedEnrollments = null;
  enrollmentsInFlight = null;
}
// COR-A W9 (AC-5): session-end drop via the auth-owned registry — auth never
// imports this module. Semantics in `lib/auth/cache-registry.ts`.
registerCacheInvalidator(invalidateJourneysCache);

// --- detail + mutations (uncached transports; pages re-read after settle) ----

/** JRN-2: one journey whole, viewer-shaped. 404 surfaces as status for the
 *  house not-found (unpublished and absent indistinguishable). */
export async function fetchJourneyDetail(journeyId: string): Promise<JourneyDetail> {
  const res = await fetch(`/api/journeys/${journeyId}`);
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const data = (await res.json()) as { journey: JourneyDetail };
  return data.journey;
}

/** JRN-3: self-enrolment (the personal group as party, platform-side). */
export async function enrollSelf(journeyId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/journeys/${journeyId}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

/** JRN-4: enrol a group offered by the payload's enrollable_groups. */
export async function enrollGroup(
  journeyId: string,
  groupId: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/journeys/${journeyId}/enroll`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ group_id: groupId }),
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

/** STORY-5: withdraw an enrolment (refusals carry the contract's message). */
export async function withdrawEnrollment(
  journeyId: string,
  enrollmentId: string,
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/journeys/${journeyId}/withdraw`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enrollment_id: enrollmentId }),
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  return (await res.json()) as Record<string, unknown>;
}

// --- STORY-8 (TASK-JRN-PAUSE-01): pause / resume, with the J-D write-through ---

/** The confirmed status is written through to the session cache so the next
 *  client-side mount never replays the pre-transition slice (the J-D rule, PR
 *  #146). Nothing is invented: with no cached slice there is nothing to patch. */
function applyEnrollmentStatus(enrollmentId: string, status: string): void {
  if (!cachedEnrollments) return;
  cachedEnrollments = cachedEnrollments.map((e) =>
    e.enrollment_id === enrollmentId ? { ...e, status } : e,
  );
}

async function postEnrollmentTransition(
  journeyId: string,
  enrollmentId: string,
  verb: 'pause' | 'resume',
): Promise<Record<string, unknown>> {
  const res = await fetch(`/api/journeys/${journeyId}/${verb}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ enrollment_id: enrollmentId }),
  });
  if (!res.ok) await throwFrom(res, `Request failed (${res.status})`);
  const confirmed = (await res.json()) as Record<string, unknown>;
  const status =
    typeof confirmed.status === 'string' ? confirmed.status : verb === 'pause' ? 'paused' : 'active';
  applyEnrollmentStatus(enrollmentId, status);
  return confirmed;
}

/** STORY-8: pause an own walk (refusals carry the contract's message + the BFF status). */
export function pauseEnrollment(journeyId: string, enrollmentId: string): Promise<Record<string, unknown>> {
  return postEnrollmentTransition(journeyId, enrollmentId, 'pause');
}

/** STORY-8: resume an own paused walk at the held position. */
export function resumeEnrollment(journeyId: string, enrollmentId: string): Promise<Record<string, unknown>> {
  return postEnrollmentTransition(journeyId, enrollmentId, 'resume');
}
