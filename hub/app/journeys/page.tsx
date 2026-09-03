'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { SkeletonGrid } from '@/components/ui/SkeletonGrid';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { emitTelemetry } from '@/lib/observability/telemetry';
import {
  fetchJourneyCatalog,
  fetchMyJourneyEnrollments,
  resumeEnrollment,
  peekJourneyCatalog,
  peekMyJourneyEnrollments,
} from '@/lib/journeys/client';
import type { JourneyCard, MyEnrollment } from '@/lib/journeys/queries';

/**
 * FEAT-H019 STORY-1 — the /journeys catalogue (JRN-1).
 *
 * FIM-only per the journal pattern: sessionless → sign-in with destination
 * preserved; Mist → entry (the Mist journey surface is J-E's, ADR-U045).
 * Cards render the payload's fields in payload order — a stable, non-ranking
 * default (DS-6 stays a seam; no search/sort/rank controls). The Enrolled
 * badge derives from the my-enrolments read (individual or via-group).
 * Loading is the deferred skeleton grid (B6 — never spinner-first); a
 * revisit paints instantly from the session cache and revalidates in the
 * background (B4).
 */
export default function JourneysPage() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();

  const [journeys, setJourneys] = useState<JourneyCard[] | null>(() => peekJourneyCatalog());
  const [mine, setMine] = useState<MyEnrollment[] | null>(() => peekMyJourneyEnrollments());
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // API-first: both reads ride the BFF; the session cache shares in-flight
      // requests, so auth-event churn never duplicates fetches. No synchronous
      // setState before the first await (react-hooks/set-state-in-effect) —
      // the error resets on success, which also keeps a failed state honest
      // while a retry is in flight.
      const [catalog, enrollments] = await Promise.all([
        fetchJourneyCatalog(),
        fetchMyJourneyEnrollments(),
      ]);
      setJourneys(catalog);
      setMine(enrollments);
      setError(null);
    } catch (err) {
      setError('Failed to load the journeys.');
      emitTelemetry('journey.client_load_failed', { message: (err as Error).message });
    }
  }, []);

  // FEAT-H019 STORY-8 (TASK-JRN-PAUSE-01): Resume from the card — no ceremony.
  // The transport writes the confirmed status through to the session cache and
  // the list re-reads, so Continue returns from the payload, never a client flip.
  // A refusal shows above the list and the paused card stays as last read.
  const [actionError, setActionError] = useState<string | null>(null);
  const [resuming, setResuming] = useState<string | null>(null);
  const resume = useCallback(
    async (journeyId: string, enrollmentId: string) => {
      setResuming(enrollmentId);
      setActionError(null);
      try {
        await resumeEnrollment(journeyId, enrollmentId);
        await load();
      } catch (err) {
        setActionError((err as Error).message || 'The request was refused.');
      } finally {
        setResuming(null);
      }
    },
    [load],
  );

  // Keyed on the STABLE user id, never the user object (the groups-page
  // 3x-refire lesson, measured 2026-07-06).
  const userId = user?.id ?? null;
  useEffect(() => {
    if (authLoading) return;
    if (!userId || identity === 'sessionless') {
      router.replace('/login?redirect=/journeys');
      return;
    }
    // FEAT-H023 (J-E): a Mist is admitted — their onboarding walk must stay
    // deliberately resumable from this list (STORY-3, ADR-U045). The reads
    // (catalogue, my-enrolments) are actor-gated Mist-callable contracts;
    // enrol attempts on anything but onboarding refuse 42501 platform-side.
    // Deliberate load-on-mount house pattern (see app/groups/page.tsx note;
    // disposition at the J-A retro). The react-hooks/set-state-in-effect
    // suppression that stood here became unused on 2026-09-03, when STORY-8 gave
    // `load` a second caller and the rule stopped reporting this call; it was
    // removed to keep lint at zero warnings — restore it if the report returns.
    void load();
  }, [userId, identity, authLoading, router, load]);

  const enrolledIds = new Set((mine ?? []).map((e) => e.journey_id));

  return (
    <AppShell title="Journeys">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Journeys</h1>
      {actionError && <InlineError message={actionError} />}

      {/* FEAT-H023: a Mist renders too (their onboarding row lives here) —
          the skeleton covers auth resolution + the sessionless window only. */}
      {authLoading || identity === 'sessionless' || (!error && journeys === null) ? (
        <SkeletonGrid />
      ) : error ? (
        <InlineError message={error} />
      ) : !journeys || journeys.length === 0 ? (
        <EmptyState
          title="No journeys yet"
          description="There are no published journeys to browse right now."
        />
      ) : (
        <ul data-testid="journeys-list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {journeys.map((j) => (
            <li
              key={j.id}
              data-testid={`journey-card-${j.id}`}
              className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-800">
                  <Link href={`/journeys/${j.id}`} className="hover:underline">
                    {j.title}
                  </Link>
                </h2>
                {enrolledIds.has(j.id) && (
                  <span
                    data-testid="enrolled-badge"
                    className="rounded bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                  >
                    Enrolled
                  </span>
                )}
              </div>
              {j.description && <p className="mt-2 text-sm text-gray-600">{j.description}</p>}
              <p className="mt-4 text-xs text-gray-500">
                {/* Vocabulary-tolerant: difficulty renders as the payload says. */}
                {j.difficulty_level && <span className="capitalize">{j.difficulty_level}</span>}
                {j.difficulty_level && j.estimated_duration_minutes != null && ' · '}
                {j.estimated_duration_minutes != null && `${j.estimated_duration_minutes} min`}
                {(j.difficulty_level || j.estimated_duration_minutes != null) && ' · '}
                {j.step_count} {j.step_count === 1 ? 'step' : 'steps'}
              </p>
              {j.tags.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-1">
                  {j.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                    >
                      {t}
                    </span>
                  ))}
                </p>
              )}
              {/* FEAT-H021 STORY-4 + FEAT-H022 STORY-1: the affordance swaps on the
                  enrolment's own status — 'completed' opens Review, 'frozen' opens View
                  (the read-only door), 'active' Continue, 'withdrawn' neither. The
                  deep-link preserves ?enrollment= for the dual-enrolment case. */}
              {(mine ?? [])
                .filter(
                  (e) =>
                    e.journey_id === j.id &&
                    (e.status === 'active' || e.status === 'completed' || e.status === 'frozen' || e.status === 'paused'),
                )
                .map((e) => {
                  const suffix =
                    e.kind === 'via_group' && e.group_name ? ` (${e.group_name})` : '';
                  const href = `/journeys/${j.id}/play?enrollment=${e.enrollment_id}`;
                  // FEAT-H019 STORY-8: a paused walk reads "(paused)" + Resume — never
                  // Continue. Only an own (individual) walk can be resumed here; a
                  // group's walk is the group's (the contract refuses the rest).
                  if (e.status === 'paused') {
                    return (
                      <span key={e.enrollment_id} className="mt-4 mr-3 inline-block text-xs">
                        <span data-testid="card-paused" className="text-gray-500">
                          (paused{suffix})
                        </span>
                        {e.kind === 'individual' && (
                          <button
                            type="button"
                            data-testid="card-resume"
                            disabled={resuming === e.enrollment_id}
                            onClick={() => void resume(j.id, e.enrollment_id)}
                            className="ml-2 font-medium text-blue-600 hover:underline disabled:opacity-50"
                          >
                            Resume
                          </button>
                        )}
                      </span>
                    );
                  }
                  const label =
                    e.status === 'completed' ? 'Review' : e.status === 'frozen' ? 'View' : 'Continue';
                  const testId =
                    e.status === 'completed'
                      ? 'card-review'
                      : e.status === 'frozen'
                        ? 'card-view'
                        : 'card-continue';
                  return (
                    <Link
                      key={e.enrollment_id}
                      href={href}
                      data-testid={testId}
                      className="mt-4 mr-3 inline-block text-xs font-medium text-blue-600 hover:underline"
                    >
                      {label}
                      {suffix}
                    </Link>
                  );
                })}
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
