'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { JourneyEnrollmentPanel } from '@/components/journeys/JourneyEnrollmentPanel';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { fetchJourneyDetail, peekJourneyCatalog, JourneysApiError } from '@/lib/journeys/client';
import type { JourneyCard, JourneyDetail } from '@/lib/journeys/queries';

/**
 * FEAT-H019 STORY-2/3/4/5 — the /journeys/[id] detail page (JRN-2).
 *
 * Renders the PD002 detail payload: the journey fields, the steps overview
 * (title/kind/duration — never step content), and the viewer-shaped enrolment
 * block. A BFF 404 renders the house not-found — unpublished and absent
 * indistinguishable. Mutations re-read the whole payload (no optimism).
 * Step kinds and difficulty render vocabulary-tolerantly.
 *
 * J-O3 gate rider R1 (2026-07-19, Stefan's felt-walk decision): the FIM-only
 * gate is retired — a Mist reads the detail too (the substrate's visibility
 * disjunction is the wall; the read was never FIM-gated platform-side). For a
 * Mist the enrolment panel never renders (enrol/withdraw are FIM-only verbs —
 * no fake doors): an enrolled Mist gets the continue-your-walk door into the
 * player; an unenrolled Mist gets the become-a-FIM invitation. Browse → want
 * → transcend.
 */
export default function JourneyDetailPage() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const journeyId = params.id;

  const [journey, setJourney] = useState<JourneyDetail | null>(null);
  // B3/B4 seed (spec Performance budget): the cached catalogue card paints
  // the header immediately; the full payload fills in. Fields only — the
  // enrolment block and steps always wait for the real viewer-shaped payload.
  const [seed] = useState<JourneyCard | null>(
    () => peekJourneyCatalog()?.find((c) => c.id === journeyId) ?? null,
  );
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      // No synchronous setState before the first await
      // (react-hooks/set-state-in-effect); error resets on success.
      const detail = await fetchJourneyDetail(journeyId);
      setJourney(detail);
      setError(null);
    } catch (err) {
      if (err instanceof JourneysApiError && err.status === 404) {
        setNotFound(true);
        return;
      }
      setError('Failed to load the journey.');
      emitTelemetry('journey.client_detail_failed', { message: (err as Error).message });
    }
  }, [journeyId]);

  const userId = user?.id ?? null;
  useEffect(() => {
    if (authLoading) return;
    if (!userId || identity === 'sessionless') {
      router.replace(`/login?redirect=/journeys/${journeyId}`);
      return;
    }
    // react-hooks/set-state-in-effect suppression: deliberate load-on-mount
    // house pattern (see app/groups/page.tsx note; disposition at the J-A retro).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [userId, identity, authLoading, router, journeyId, load]);

  if (notFound) {
    return (
      <AppShell title="Journeys">
        <div data-testid="journey-not-found">
          <EmptyState
            title="Journey not found"
            description="This journey doesn't exist or isn't available."
          />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title={journey?.title ?? 'Journeys'}>
      {authLoading || (identity !== 'fim' && identity !== 'mist') || (!error && journey === null) ? (
        seed && !authLoading && (identity === 'fim' || identity === 'mist') ? (
          <header>
            <h1 className="text-3xl font-bold text-gray-900">{seed.title}</h1>
            {seed.description && <p className="mt-4 text-gray-700">{seed.description}</p>}
            <LoadingState label="Opening the journey..." />
          </header>
        ) : (
          <LoadingState label="Opening the journey..." />
        )
      ) : error ? (
        <InlineError message={error} />
      ) : journey ? (
        <article>
          <header>
            <h1 className="text-3xl font-bold text-gray-900">{journey.title}</h1>
            <p className="mt-2 text-sm text-gray-500">
              {journey.difficulty_level && (
                <span className="capitalize">{journey.difficulty_level}</span>
              )}
              {journey.difficulty_level && journey.estimated_duration_minutes != null && ' · '}
              {journey.estimated_duration_minutes != null &&
                `${journey.estimated_duration_minutes} min`}
              {' · '}
              {journey.step_count} {journey.step_count === 1 ? 'step' : 'steps'}
            </p>
            {journey.description && (
              <p className="mt-4 text-gray-700">{journey.description}</p>
            )}
            {journey.tags.length > 0 && (
              <p className="mt-3 flex flex-wrap gap-1">
                {journey.tags.map((t) => (
                  <span key={t} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {t}
                  </span>
                ))}
              </p>
            )}
          </header>

          {/* J-B reserves this slot: the player's primary action lands here. */}

          <section className="mt-8">
            <h2 className="text-lg font-semibold text-gray-800">The steps</h2>
            <ol data-testid="steps-overview" className="mt-3 space-y-2">
              {journey.steps.map((s, i) => (
                <li
                  key={`${i}-${s.title}`}
                  className="flex items-baseline justify-between rounded-lg border border-gray-100 bg-white px-4 py-3 text-sm"
                >
                  <span className="font-medium text-gray-800">
                    {i + 1}. {s.title}
                  </span>
                  <span className="text-xs text-gray-500">
                    {/* Vocabulary-tolerant: kinds render as the payload says. */}
                    {s.kind}
                    {s.duration_minutes != null && ` · ${s.duration_minutes} min`}
                  </span>
                </li>
              ))}
            </ol>
          </section>

          {identity === 'fim' ? (
            <JourneyEnrollmentPanel journey={journey} onRefresh={() => void load()} />
          ) : journey.is_enrolled_individually && journey.individual_enrollment ? (
            /* R1: the enrolled Mist's one true door — the walk itself (active
               resumes; completed opens review). Never enrol/withdraw. */
            <section className="mt-8">
              <Link
                data-testid="mist-continue-walk"
                href={`/journeys/${journey.id}/play?enrollment=${journey.individual_enrollment.enrollment_id}`}
                className="inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Continue your walk
              </Link>
            </section>
          ) : (
            /* R1: the unenrolled Mist's honest door — transcendence. */
            <section
              data-testid="mist-transcend-invite"
              className="mt-8 rounded-xl border border-blue-100 bg-blue-50 p-6"
            >
              <p className="text-sm text-gray-700">
                Walking this journey needs a lasting presence — that&rsquo;s what becoming a FIM
                gives you.
              </p>
              <Link
                href="/become-a-fim"
                className="mt-3 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Become a FIM to walk this journey
              </Link>
            </section>
          )}
        </article>
      ) : null}
    </AppShell>
  );
}
