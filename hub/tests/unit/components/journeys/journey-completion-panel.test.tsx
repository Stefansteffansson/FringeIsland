import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { PlayerCompletion, PlayerTiming } from '@/lib/journeys/player';
import { JourneyCompletionPanel } from '@/components/journeys/JourneyCompletionPanel';

/**
 * FEAT-H021 STORY-1/3 (unit) — the gentle completion panel (JRN-12). An arrival,
 * not a jackpot (canon voice, no confetti): the panel states the completion, shows
 * the total engagement time and the enrolled→completed calendar span LABELLED as two
 * different things (never conflated, invariant 8 — nothing comparative), and offers a
 * path into review. Renders own data only, from the FEAT-PD004 blocks — never
 * re-derived. Red-first for TASK-JC-03 (fails until the component exists).
 */

const TIMING: PlayerTiming = {
  per_step: [{ step_id: 's1', seconds: 600 }],
  total_seconds: 1500,
  wall_clock: { enrolled_at: '2026-07-06T09:00:00+00:00', completed_at: '2026-07-08T10:00:00+00:00' },
};

const COMPLETION: PlayerCompletion = {
  traveller_completed: true,
  traveller_completed_at: '2026-07-08T10:00:00+00:00',
  enrollment_status: 'completed',
  enrollment_completed_at: '2026-07-08T10:00:00+00:00',
};

describe('JourneyCompletionPanel — the arrival', () => {
  it('renders the panel with a completion statement (an arrival, not a jackpot)', () => {
    render(<JourneyCompletionPanel completion={COMPLETION} timing={TIMING} />);
    const panel = screen.getByTestId('journey-completion-panel');
    expect(panel).toBeTruthy();
    expect(panel.textContent?.toLowerCase()).toContain('complete');
  });

  it('shows the total engagement time from the timing block (coarse)', () => {
    render(<JourneyCompletionPanel completion={COMPLETION} timing={TIMING} />);
    // 1500s -> 25 min, own-data engagement total.
    expect(screen.getByTestId('completion-total-time').textContent).toContain('25 min');
  });

  it('shows the enrolled→completed calendar span, LABELLED distinctly from engagement time', () => {
    render(<JourneyCompletionPanel completion={COMPLETION} timing={TIMING} />);
    const engagement = screen.getByTestId('completion-total-time');
    const span = screen.getByTestId('completion-calendar-span');
    expect(span.textContent).toContain('2 days');
    // The two numbers carry different labels — not conflated.
    expect(engagement.textContent).not.toEqual(span.textContent);
  });

  it('offers no interactive affordance — a summary, not a menu (J-O6: review substance is a routed open question)', () => {
    render(<JourneyCompletionPanel completion={COMPLETION} timing={TIMING} />);
    expect(screen.queryByTestId('review-enter')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('omits the calendar span honestly when there is no completed_at (via-group walk, row still active)', () => {
    const viaTiming: PlayerTiming = { ...TIMING, wall_clock: { enrolled_at: TIMING.wall_clock.enrolled_at, completed_at: null } };
    const viaCompletion: PlayerCompletion = { ...COMPLETION, enrollment_status: 'active', enrollment_completed_at: null };
    render(<JourneyCompletionPanel completion={viaCompletion} timing={viaTiming} />);
    // Engagement time still shows; the calendar span is absent (never fabricated).
    expect(screen.getByTestId('completion-total-time').textContent).toContain('25 min');
    expect(screen.queryByTestId('completion-calendar-span')).toBeNull();
  });
});
