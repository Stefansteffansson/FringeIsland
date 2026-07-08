import type { PlayerStep, PlayerTiming } from '@/lib/journeys/player';
import { stepSeconds, formatEngagementTime } from '@/lib/journeys/timing';

/**
 * FEAT-H020 — the step rail: every step in step_order, a required mark on
 * required steps, a completion tick on the ones the caller has finished (from
 * their OWN instances — invariant 4), and the current step flagged for
 * assistive tech. Display-only: linear prev/next owns navigation and there is
 * no non-linear jump UX (a FEAT-H020 no-go — `open`/`gated` sequencing is
 * forward data, not a Hub affordance yet).
 *
 * FEAT-H021 (JRN-11): when a `timing` block is passed (review posture), each step
 * shows its OWN accrued engagement time from the block — never re-derived, and an
 * honest em-dash where none accrued (never "0 min").
 */
export function StepRail({
  steps,
  currentStepId,
  completedStepIds,
  timing,
}: {
  steps: PlayerStep[];
  currentStepId: string | null;
  completedStepIds: Set<string>;
  timing?: PlayerTiming;
}) {
  return (
    <nav data-testid="step-rail" aria-label="Steps" className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <ol className="space-y-1">
        {steps.map((s, i) => {
          const isCurrent = s.id === currentStepId;
          const isDone = completedStepIds.has(s.id);
          return (
            <li
              key={s.id}
              data-testid={`rail-step-${s.id}`}
              aria-current={isCurrent ? 'step' : undefined}
              className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm ${
                isCurrent ? 'bg-blue-50 font-medium text-blue-800' : 'text-gray-700'
              }`}
            >
              <span className="flex items-center gap-1">
                <span className="text-xs text-gray-400">{i + 1}.</span>
                {s.title}
                {s.required && (
                  <span
                    data-testid="rail-required"
                    aria-label="required"
                    title="Required"
                    className="text-red-500"
                  >
                    *
                  </span>
                )}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {timing && (
                  <span
                    data-testid={`rail-time-${s.id}`}
                    className="text-xs tabular-nums text-gray-400"
                  >
                    {formatEngagementTime(stepSeconds(timing, s.id))}
                  </span>
                )}
                {isDone && (
                  <span
                    data-testid="rail-tick"
                    role="img"
                    aria-label="completed"
                    title="Completed"
                    className="inline-block h-2.5 w-2.5 rounded-full bg-green-500"
                  />
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
