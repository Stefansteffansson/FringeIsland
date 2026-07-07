import type { PlayerStep } from '@/lib/journeys/player';

/**
 * FEAT-H020 — the step canvas. THIS IS THE JB-05 SEAM: TASK-JB-05 replaces the
 * body below with the kind-renderer registry (JRN-18: registry-key -> renderer
 * with a mandatory fallback) and the real completion flow (JRN-8: the ask-verb
 * affordance + P0001 gating). JB-04 keeps it deliberately minimal — the player
 * page owns boot / resume / linear navigation / auto-save around this component,
 * so swapping the canvas body needs no change to that logic.
 *
 * For now: title, duration, a plain rendering of `content.body` when present,
 * and a DISABLED generic Complete placeholder. Content is open-vocabulary
 * (`kind: string`, `content: unknown`) — this must never crash on an unknown
 * kind or a null payload.
 */
function stepBody(content: unknown): string | null {
  if (content && typeof content === 'object' && 'body' in content) {
    const body = (content as { body: unknown }).body;
    if (typeof body === 'string') return body;
  }
  return null;
}

export function StepCanvas({ step }: { step: PlayerStep }) {
  const body = stepBody(step.content);

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

      {body && (
        <div data-testid="step-body" className="mt-4 whitespace-pre-wrap text-sm text-gray-700">
          {body}
        </div>
      )}

      {/* JB-05 replaces this placeholder with the kind's ask-verb completion. */}
      <button
        type="button"
        data-testid="step-complete"
        disabled
        className="mt-6 cursor-not-allowed rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500"
      >
        Complete
      </button>
    </section>
  );
}
