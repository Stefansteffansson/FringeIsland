'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { StepCanvas } from '@/components/journeys/StepCanvas';
import { StepRail } from '@/components/journeys/StepRail';
import { PlayerSkeleton } from '@/components/journeys/PlayerSkeleton';
import { JourneyCompletionPanel } from '@/components/journeys/JourneyCompletionPanel';
import { FreezeBanner } from '@/components/journeys/FreezeBanner';
import { SharingToggle } from '@/components/journeys/SharingToggle';
import { emitTelemetry } from '@/lib/observability/telemetry';
import {
  peekJourneyCatalog,
  peekMyJourneyEnrollments,
  fetchMyJourneyEnrollments,
  JourneysApiError,
} from '@/lib/journeys/client';
import { peekPlayerState, fetchPlayerState, enterStep, completeStep } from '@/lib/journeys/player';
import type { PlayerState } from '@/lib/journeys/player';
import type { MyEnrollment } from '@/lib/journeys/queries';

/**
 * FEAT-H020 STORY-1/2/4/5 — the /journeys/[id]/play player (JRN-6/7/9/10).
 *
 * FIM-gated like the catalogue/detail. Enrolment resolution: `?enrollment=`
 * pre-selects; else exactly one active enrolment goes straight in, several raise
 * a named chooser (individual vs each via-group), none routes honestly back to
 * the detail. Boot is ONE `fetchPlayerState` read (per-enrolment session cache,
 * ADR-U042) with the header seeded from cache; the canvas opens at the resume
 * pointer; the rail shows order / required / ticks. Prev/next paints from the
 * in-memory payload (optimistic advance, B5) while `enter` fires as a background
 * auto-save (JRN-9) whose failure surfaces a non-blocking retry and never blocks
 * the paint. A non-active enrolment gets one honest state, no step affordances
 * (J-C / J-D own richer treatments). STORY-3 completion + JRN-18 kind rendering
 * are TASK-JB-05 — the `StepCanvas` seam is where they land.
 */
function JourneyPlayer() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const journeyId = params.id;
  const searchParams = useSearchParams();
  const paramEnrollment = searchParams.get('enrollment');

  // `?enrollment=` pre-selects; otherwise the chooser resolves one into `picked`.
  const [picked, setPicked] = useState<string | null>(null);
  const enrollmentId = paramEnrollment ?? picked;

  // Header seed (B3/B4): the cached player state (revisit) or catalogue card
  // paints the title immediately while the canvas boots.
  const [seedTitle] = useState<string | null>(
    () =>
      (paramEnrollment ? (peekPlayerState(paramEnrollment)?.journey.title ?? null) : null) ??
      peekJourneyCatalog()?.find((c) => c.id === journeyId)?.title ??
      null,
  );

  // B4 revisit: seed the canvas from the last resolved state for this enrolment.
  const [player, setPlayer] = useState<PlayerState | null>(
    () => (paramEnrollment ? peekPlayerState(paramEnrollment) : null),
  );
  const [currentStepId, setCurrentStepId] = useState<string | null>(() => {
    const seeded = paramEnrollment ? peekPlayerState(paramEnrollment) : null;
    return seeded ? (seeded.resume_step_id ?? seeded.steps[0]?.id ?? null) : null;
  });
  // Position at resume exactly once per enrolment — a background revalidate must
  // never yank the traveller back from a step they navigated to.
  const positioned = useRef(currentStepId !== null);

  const [mine, setMine] = useState<MyEnrollment[] | null>(() => peekMyJourneyEnrollments());
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<{ stepId: string } | null>(null);

  const applyState = useCallback((fresh: PlayerState) => {
    setPlayer(fresh);
    if (!positioned.current) {
      setCurrentStepId(fresh.resume_step_id ?? fresh.steps[0]?.id ?? null);
      positioned.current = true;
    }
  }, []);

  const boot = useCallback(async () => {
    if (enrollmentId) {
      // One justified standalone read; the session cache de-dupes concurrent
      // callers and paints a revisit instantly (already seeded above).
      try {
        applyState(await fetchPlayerState(enrollmentId));
        setError(null);
      } catch (err) {
        if (err instanceof JourneysApiError && err.status === 404) {
          router.replace(`/journeys/${journeyId}`); // honest — no broken shell
          return;
        }
        setError('Failed to open the player.');
        emitTelemetry('journey.client_player_failed', { message: (err as Error).message });
      }
      return;
    }
    // No enrolment chosen — resolve from my-enrolments (cached; revalidates).
    try {
      const list = peekMyJourneyEnrollments() ?? (await fetchMyJourneyEnrollments());
      setMine(list);
      const active = list.filter((e) => e.journey_id === journeyId && e.status === 'active');
      if (active.length === 0) {
        router.replace(`/journeys/${journeyId}`); // nothing active to walk
        return;
      }
      if (active.length === 1) {
        setPicked(active[0].enrollment_id); // straight in
      }
      // several -> the chooser renders from `mine`.
    } catch (err) {
      setError('Failed to open the player.');
      emitTelemetry('journey.client_player_failed', { message: (err as Error).message });
    }
  }, [enrollmentId, journeyId, router, applyState]);

  // Keyed on the STABLE user id + enrolment, never the user object — the auth
  // listener hands out a new reference per event (INITIAL_SESSION /
  // TOKEN_REFRESHED); keying on the object re-fired the effect and duplicated
  // the read (the groups-page 3x-refire lesson, measured 2026-07-06).
  const userId = user?.id ?? null;
  useEffect(() => {
    if (authLoading) return;
    const dest = `/journeys/${journeyId}/play${paramEnrollment ? `?enrollment=${paramEnrollment}` : ''}`;
    if (!userId || identity === 'sessionless') {
      router.replace(`/login?redirect=${dest}`);
      return;
    }
    // FEAT-H023 (J-E): a Mist is admitted — the front door lands them IN the
    // player (STORY-1, ADR-U045). What a Mist may boot stays enforced
    // platform-side: get_player_state is enrolment-scoped, and a Mist can
    // hold exactly one enrolment (the designated onboarding journey).
    // react-hooks/set-state-in-effect suppression: the deliberate load-on-mount
    // house pattern (catalogue / detail / groups) — a single `boot()` per stable
    // (userId, enrolment) so auth-event churn fires no duplicate read.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void boot();
  }, [userId, identity, authLoading, router, journeyId, paramEnrollment, boot]);

  const steps = player?.steps ?? [];
  const completedStepIds = new Set(
    (player?.instances ?? []).filter((i) => i.completed_at).map((i) => i.step_id),
  );

  // FEAT-H021 (JRN-13): review posture is DERIVED per render from the payload — no
  // client mode enum, no stored state. A `completed` enrolment, or a traveller whose
  // OWN walk is complete while a via-group row stays `active` (completion.traveller_
  // completed), reads as review. `withdrawn`/`paused` keep the honest status panel
  // exactly as H020 ships it — review admits completed walks only.
  //
  // FEAT-H022 (JRN-14): `frozen` is its OWN posture and it WINS — derived FIRST, and
  // review is defined to exclude it. A frozen walk reads read-only with the banner;
  // a walk that completed before it froze shows the completion framing INSIDE the
  // frozen frame (the banner adds to the record, never replaces it).
  const travellerComplete = player?.completion?.traveller_completed === true;
  const isFrozen = player != null && player.status === 'frozen';
  const inReview =
    !isFrozen &&
    player != null &&
    (player.status === 'completed' || (player.status === 'active' && travellerComplete));
  // Read posture (review OR frozen): navigation opens no background engagement.
  const readPosture = inReview || isFrozen;
  // The gentle completion framing renders in review, and inside frozen for a walk
  // completed before it froze.
  const showCompletion = travellerComplete && (inReview || isFrozen);
  // paused/withdrawn keep the bare honest panel; frozen no longer falls here.
  const honestStatus = player != null && player.status !== 'active' && !inReview && !isFrozen;

  // Observability: the freeze banner render is a meaningful surface event (STORY-1),
  // emitted once the frozen payload resolves. Telemetry only — no state, no suppression.
  useEffect(() => {
    if (isFrozen && enrollmentId) {
      emitTelemetry('player.freeze_banner_shown', {
        enrollment: enrollmentId,
        reason: player?.freeze?.reason ?? null,
      });
    }
  }, [isFrozen, enrollmentId, player?.freeze?.reason]);

  const currentIndex = steps.findIndex((s) => s.id === currentStepId);
  const currentStep = currentIndex >= 0 ? steps[currentIndex] : null;
  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null;
  const nextStep =
    currentIndex >= 0 && currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null;

  // JRN-8 gating, computed here (never in the canvas): the current step is locked
  // by the FIRST incomplete required step with a lower order — its title names the
  // reason. A completed step is in review posture, not locked.
  const currentCompleted = currentStep != null && completedStepIds.has(currentStep.id);
  const blockingPredecessor = currentStep
    ? steps.find(
        (s) => s.required && s.step_order < currentStep.step_order && !completedStepIds.has(s.id),
      )
    : undefined;
  const currentLocked = currentStep != null && !currentCompleted && blockingPredecessor != null;
  const lockReason = blockingPredecessor ? `Complete "${blockingPredecessor.title}" first.` : null;

  const saveEnter = useCallback(
    (stepId: string) => {
      if (!enrollmentId) return;
      // Background auto-save (JRN-9): never awaited on the interaction path. A
      // failure raises the non-blocking retry; a later success clears it.
      enterStep(enrollmentId, stepId)
        .then(() => setSaveError((cur) => (cur?.stepId === stepId ? null : cur)))
        .catch(() => setSaveError({ stepId }));
    },
    [enrollmentId],
  );

  const navigate = (stepId: string) => {
    setCurrentStepId(stepId); // optimistic paint from the in-memory payload (B5)
    // JRN-13/JRN-14: review AND frozen posture suppress the background enter — resume
    // = last, so position saving is meaningless, mere navigation must not open an
    // engagement, and a frozen walk records NOTHING at all. Explicit re-engagement
    // verbs still ride the complete path (never available in frozen posture).
    if (!readPosture) saveEnter(stepId);
  };

  // FEAT-H021 (JRN-13) post-6-done follow-up (Stefan, 2026-07-08): the panel's
  // "review entry" button was removed — review is the posture the player is already
  // in (prev/next navigates it); a richer review entry returns with step-response
  // capture (the routed J-O6 open question in the Journeys completion plan).

  // JRN-8 completion: the canvas paints the tick optimistically, then awaits this.
  // A repeat (completed + repeatable) opens a fresh engagement first (`enter` then
  // `complete`). A rejected `complete` propagates so the canvas rolls back / gates;
  // a successful write reconciles to the re-read truth (rail tick, gating) — the
  // re-read is best-effort so a failed read never undoes a landed completion.
  const saveComplete = useCallback(
    async (stepId: string) => {
      if (!enrollmentId) return;
      const target = (player?.steps ?? []).find((s) => s.id === stepId);
      const already = (player?.instances ?? []).some((i) => i.step_id === stepId && i.completed_at);
      if (target?.repeatable && already) {
        await enterStep(enrollmentId, stepId);
      }
      const result = await completeStep(enrollmentId, stepId);
      // JRN-12: the milestone is server-confirmed by THIS response — journey_completed
      // marks the transition edge (never optimistic; a failed save never reaches here,
      // so no milestone ever shows on rollback). Merge the completion block so the
      // moment paints from the save response + the in-memory boot timing, needing no
      // read of its own (B5). The reconcile read below then carries fresh timing.
      if (result.journey_completed && result.completion) {
        const completion = result.completion;
        setPlayer((cur) => (cur ? { ...cur, completion } : cur));
      }
      try {
        applyState(await fetchPlayerState(enrollmentId));
      } catch {
        /* the write landed; a failed reconcile read must not undo the mark */
      }
    },
    [enrollmentId, player, applyState],
  );

  const activeForJourney = (mine ?? []).filter(
    (e) => e.journey_id === journeyId && e.status === 'active',
  );

  const title = player?.journey.title ?? seedTitle ?? 'Journey';

  let body: React.ReactNode;
  // FEAT-H023: a Mist renders too — the skeleton covers auth resolution and
  // the sessionless redirect window only (the substrate scopes what boots).
  if (authLoading || identity === 'sessionless') {
    body = <PlayerSkeleton />;
  } else if (error) {
    body = <InlineError message={error} />;
  } else if (!enrollmentId) {
    body =
      activeForJourney.length > 1 ? (
        <section data-testid="player-enrollment-chooser">
          <p className="mb-3 text-sm text-gray-700">
            You have more than one way onto this journey. Which would you like to continue?
          </p>
          <ul className="space-y-2">
            {activeForJourney.map((e) => (
              <li key={e.enrollment_id}>
                <button
                  type="button"
                  data-testid="player-enrollment-option"
                  onClick={() => setPicked(e.enrollment_id)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  {e.kind === 'individual' ? 'Your own travel' : (e.group_name ?? 'Via a group')}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <PlayerSkeleton />
      );
  } else if (!player) {
    body = <PlayerSkeleton />;
  } else if (honestStatus) {
    body = (
      <div data-testid="player-nonactive">
        <EmptyState
          title="This enrolment is not active"
          description={`This enrolment is ${player.status}. You cannot walk it here right now.`}
        />
      </div>
    );
  } else {
    body = (
      <div data-testid="journey-player" className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          {/* JRN-14: the freeze banner sits above everything — it explains the frozen
              state and adds to the record; it never replaces the completion framing. */}
          {isFrozen && <FreezeBanner freeze={player.freeze} />}
          {/* JRN-12: the completion framing opens the review posture, and renders INSIDE
              the frozen posture for a walk completed before it froze (server-confirmed). */}
          {showCompletion && (
            <JourneyCompletionPanel
              completion={player.completion}
              timing={player.timing}
            />
          )}
          {currentStep ? (
            <StepCanvas
              key={currentStep.id}
              step={currentStep}
              completed={currentCompleted}
              locked={currentLocked}
              lockReason={lockReason}
              // JRN-14: frozen posture is read-only — no completion affordance anywhere.
              readOnly={isFrozen}
              onComplete={isFrozen ? undefined : () => saveComplete(currentStep.id)}
            />
          ) : (
            <EmptyState title="No steps yet" description="This journey has no steps to walk." />
          )}

          {(prevStep || nextStep) && (
            <div className="mt-4 flex items-center justify-between">
              {prevStep ? (
                <button
                  type="button"
                  data-testid="player-prev"
                  onClick={() => navigate(prevStep.id)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </button>
              ) : (
                <span />
              )}
              {nextStep ? (
                <button
                  type="button"
                  data-testid="player-next"
                  onClick={() => navigate(nextStep.id)}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Next
                </button>
              ) : (
                <span />
              )}
            </div>
          )}

          {saveError && (
            <div
              data-testid="autosave-error"
              role="status"
              className="mt-3 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
            >
              <span>Not saved.</span>
              <button
                type="button"
                data-testid="autosave-retry"
                onClick={() => saveEnter(saveError.stepId)}
                className="font-medium text-amber-800 underline hover:no-underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* JRN-17: the consent control rides via-group walks only (progress_sharing
              .available). It is a WRITE surface, so it has no place in the read-only
              frozen posture — suppressed there deliberately. */}
          {enrollmentId && player.progress_sharing?.available && !isFrozen && (
            <SharingToggle
              enrollmentId={enrollmentId}
              sharing={player.progress_sharing.sharing}
            />
          )}
          <StepRail
            steps={steps}
            currentStepId={currentStepId}
            completedStepIds={completedStepIds}
            timing={showCompletion ? player.timing : undefined}
          />
        </div>
      </div>
    );
  }

  return (
    <AppShell title={title}>
      <h1 className="mb-6 text-3xl font-bold text-gray-900">{title}</h1>
      {inReview && (
        <p data-testid="player-complete-header" className="-mt-4 mb-6 text-sm font-medium text-green-700">
          Completed — this is your walk in review.
        </p>
      )}
      {body}
    </AppShell>
  );
}

export default function JourneyPlayerPage() {
  // `useSearchParams` needs a Suspense boundary (Next 16 static-render rule).
  return (
    <Suspense fallback={null}>
      <JourneyPlayer />
    </Suspense>
  );
}
