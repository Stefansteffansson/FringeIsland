import type { PlayerCompletion, PlayerTiming } from '@/lib/journeys/player';
import { formatEngagementTime, formatCalendarSpan } from '@/lib/journeys/timing';

/**
 * FEAT-H021 STORY-1/3 (JRN-12/11) — the gentle completion panel at the top of the
 * completed framing. Canon voice: an arrival, not a jackpot — no confetti, no
 * animation, existing primitives only. It states the completion, shows the traveller's
 * OWN engagement total and the enrolled→completed calendar span LABELLED as two
 * different things (never conflated; nothing comparative — invariant 8), and offers a
 * path into review (in-page, no navigation — the player itself is already in review
 * posture). Renders from the FEAT-PD004 blocks; it never re-derives time.
 */
export function JourneyCompletionPanel({
  completion,
  timing,
  onEnterReview,
}: {
  completion?: PlayerCompletion;
  timing?: PlayerTiming;
  onEnterReview?: () => void;
}) {
  void completion; // row-grain block is carried for parity; the panel renders own time
  const calendarSpan = timing
    ? formatCalendarSpan(timing.wall_clock.enrolled_at, timing.wall_clock.completed_at)
    : null;

  return (
    <section
      data-testid="journey-completion-panel"
      className="mb-6 rounded-xl border border-green-100 bg-green-50 p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-green-800">You&rsquo;ve completed this journey.</h2>
      <p className="mt-1 text-sm text-green-700">
        Your walk is recorded and stays open to revisit.
      </p>

      <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
        <div data-testid="completion-total-time">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-green-600">
            Time engaged
          </dt>
          <dd className="text-sm font-medium text-gray-800">
            {formatEngagementTime(timing?.total_seconds)}
          </dd>
        </div>
        {calendarSpan && (
          <div data-testid="completion-calendar-span">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-green-600">
              From start to finish
            </dt>
            <dd className="text-sm font-medium text-gray-800">{calendarSpan}</dd>
          </div>
        )}
      </dl>

      {onEnterReview && (
        <button
          type="button"
          data-testid="review-enter"
          onClick={onEnterReview}
          className="mt-5 rounded-lg border border-green-200 bg-white px-4 py-2 text-sm font-medium text-green-800 hover:bg-green-100"
        >
          Review your journey
        </button>
      )}
    </section>
  );
}
