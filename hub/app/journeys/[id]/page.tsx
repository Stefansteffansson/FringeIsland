'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { JourneyEnrollmentPanel } from '@/components/journeys/JourneyEnrollmentPanel';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { fetchJourneyDetail, JourneysApiError } from '@/lib/journeys/client';
import type { JourneyDetail } from '@/lib/journeys/queries';

/**
 * FEAT-H019 STORY-2/3/4/5 — the /journeys/[id] detail page (JRN-2).
 *
 * FIM-only per the journal pattern. Renders the PD002 detail payload: the
 * journey fields, the steps overview (title/kind/duration — never step
 * content; the player is J-B and the primary-action slot below the header
 * is structurally reserved for its entry), and the viewer-shaped enrolment
 * block. A BFF 404 renders the house not-found — unpublished and absent
 * indistinguishable. Mutations re-read the whole payload (no optimism).
 * Step kinds and difficulty render vocabulary-tolerantly.
 */
export default function JourneyDetailPage() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const journeyId = params.id;

  const [journey, setJourney] = useState<JourneyDetail | null>(null);
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
    if (identity === 'mist') {
      router.replace('/');
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
      {authLoading || identity !== 'fim' || (!error && journey === null) ? (
        <LoadingState label="Opening the journey..." />
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

          <JourneyEnrollmentPanel journey={journey} onRefresh={() => void load()} />
        </article>
      ) : null}
    </AppShell>
  );
}
