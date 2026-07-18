'use client';

import { useState } from 'react';
import type { PlayerStep } from '@/lib/journeys/player';
import { getStepRenderer } from './step-renderers';
import { StepResponseInput } from './StepResponseInput';

/**
 * FEAT-H024 STORY-4 — narrow the per-step authored takeaway out of the content
 * payload ({body} JSONB by convention, a bare string tolerated). Absence is
 * silent — null means no frame renders.
 */
function pickTakeaway(content: unknown): string | null {
  if (!content || typeof content !== 'object') return null;
  const takeaway = (content as Record<string, unknown>).takeaway;
  if (typeof takeaway === 'string' && takeaway.trim().length > 0) return takeaway;
  if (takeaway && typeof takeaway === 'object') {
    const body = (takeaway as Record<string, unknown>).body;
    if (typeof body === 'string' && body.trim().length > 0) return body;
  }
  return null;
}

/**
 * FEAT-H020 STORY-3/6 — the step canvas. It renders the JRN-18 kind renderer for
 * the step (registry-key -> renderer with a mandatory fallback) and drives the
 * JRN-8 completion flow. Four states:
 *   (a) completable — pressing paints the tick OPTIMISTICALLY, fires `onComplete`
 *       (the page wires `completeStep`), and on failure rolls the tick back with a
 *       non-blocking retry surface (the JB-04 auto-save indicator pattern);
 *   (b) locked — the affordance is disabled with the reason naming the blocking
 *       required predecessor (page-computed); a raced server P0001 (409) rolls the
 *       optimistic tick back into this same honest posture;
 *   (c) completed non-repeatable — review posture (content stays visible, the
 *       completion mark replaces the affordance);
 *   (d) completed repeatable — the ask-verb affordance is offered again (a repeat
 *       is a fresh engagement the page re-enters then completes).
 *
 * The affordance always carries the step's own `ask_verb` from the payload — never
 * a hardcoded verb map. The parent keys this component by `step.id`, so the
 * transient optimistic/retry state resets naturally on navigation.
 *
 * FEAT-H022 STORY-1 — `readOnly` (frozen posture) suppresses EVERY completion
 * affordance: no verb button, no repeat, no lock (a frozen walk gates nothing —
 * it is simply readable). A completed step still shows its mark; content always
 * stays visible. This is stronger than review posture, which keeps the affordances.
 */
const LOCK_FALLBACK = 'A required step must be completed first.';

export function StepCanvas({
  step,
  completed = false,
  locked = false,
  lockReason = null,
  readOnly = false,
  onComplete,
  responseBody = '',
  onSaveResponse,
}: {
  step: PlayerStep;
  completed?: boolean;
  locked?: boolean;
  lockReason?: string | null;
  readOnly?: boolean;
  onComplete?: () => Promise<void>;
  /** FEAT-H024: the traveller's saved words for THIS step ('' = unanswered). */
  responseBody?: string;
  /** FEAT-H024: the background save transport; resolves to the confirmed body. */
  onSaveResponse?: (body: string) => Promise<{ body: string }>;
}) {
  const [optimistic, setOptimistic] = useState(false);
  const [retry, setRetry] = useState(false);
  const [raced, setRaced] = useState(false);

  // Look up by open-vocabulary key and invoke the stateless renderer as a plain
  // function (not `<Renderer/>`) — the registry values are created at module load,
  // not during render (react-hooks/static-components).
  const renderKind = getStepRenderer(step.kind);
  const isCompleted = completed || optimistic;
  const showLocked = !readOnly && (locked || raced);
  const verb = step.ask_verb || 'Complete';

  async function handleComplete() {
    if (!onComplete) return;
    // Optimistic-progress scope (FEAT-H020 §Solution sketch): paint the mark now,
    // confirm in the background, and reconcile to the re-read truth via `completed`.
    setOptimistic(true);
    setRetry(false);
    setRaced(false);
    try {
      await onComplete();
    } catch (err) {
      setOptimistic(false); // roll the tick back
      const status = (err as { status?: number } | null)?.status;
      if (status === 409) {
        setRaced(true); // a raced P0001 gate -> the honest locked posture
      } else {
        setRetry(true); // transient failure -> non-blocking retry surface
      }
    }
  }

  return (
    <section
      data-testid="step-canvas"
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <header>
        <h2 className="text-xl font-semibold text-gray-900">{step.title}</h2>
        {step.duration_minutes != null && (
          <p className="mt-1 text-xs text-gray-500">{step.duration_minutes} min</p>
        )}
      </header>

      <div className="mt-4">{renderKind({ step })}</div>

      {/* FEAT-H024 STORY-1/3: the Ask capture — placed by the payload's
          captures_response alone (the registry decides, never a kind list).
          Frozen posture (readOnly): saved words render with the pen down;
          absence is silent (no input when nothing was written). */}
      {step.captures_response === true &&
        onSaveResponse &&
        (!readOnly || responseBody.length > 0) && (
          <StepResponseInput
            key={`${step.id}-response`}
            askVerb={step.ask_verb || 'Respond'}
            initialBody={responseBody}
            readOnly={readOnly}
            onSave={onSaveResponse}
          />
        )}

      {/* FEAT-H024 STORY-4: the author's closing word arrives AFTER the passage —
          keyed on the page's completed-instance derivation, never a second
          completion computation. Absence is silent. */}
      {completed && pickTakeaway(step.content) && (
        <div
          data-testid="step-takeaway"
          className="mt-6 rounded-lg border border-blue-100 bg-blue-50 p-4"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-500">
            Takeaway
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
            {pickTakeaway(step.content)}
          </p>
        </div>
      )}

      <div className="mt-6">
        {readOnly ? (
          isCompleted ? (
            <p
              data-testid="step-completed"
              className="inline-flex items-center gap-2 text-sm font-medium text-green-700"
            >
              <span aria-hidden className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
              Completed
            </p>
          ) : null
        ) : isCompleted && !step.repeatable ? (
          <p
            data-testid="step-completed"
            className="inline-flex items-center gap-2 text-sm font-medium text-green-700"
          >
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"
            />
            Completed
          </p>
        ) : showLocked ? (
          <div>
            <button
              type="button"
              data-testid="step-complete"
              disabled
              className="cursor-not-allowed rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500"
            >
              {verb}
            </button>
            <p data-testid="step-lock-reason" className="mt-2 text-xs text-amber-700">
              {lockReason ?? LOCK_FALLBACK}
            </p>
          </div>
        ) : (
          <>
            <button
              type="button"
              data-testid="step-complete"
              onClick={handleComplete}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {verb}
            </button>
            {isCompleted && step.repeatable && (
              <span data-testid="step-completed" className="ml-3 text-xs text-green-700">
                Completed — {verb} again to repeat.
              </span>
            )}
          </>
        )}

        {retry && (
          <div
            data-testid="complete-error"
            role="status"
            className="mt-3 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700"
          >
            <span>Not saved.</span>
            <button
              type="button"
              data-testid="complete-retry"
              onClick={handleComplete}
              className="font-medium text-amber-800 underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
