import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { PlayerStep } from '@/lib/journeys/player';

/**
 * FEAT-H020 (unit) — StepRail is the player's step overview: every step in
 * step_order, a required mark on required steps, a completion tick on steps the
 * caller has finished (from their own instances), and the current step flagged.
 * Display-only (linear prev/next owns navigation; no non-linear jump UX — a
 * FEAT-H020 no-go). Red-first for TASK-JB-04.
 */

const steps: PlayerStep[] = [
  { id: 's1', step_order: 1, title: 'Orient', kind: 'content', family: 'text', ask_verb: 'Read', required: true, repeatable: false, duration_minutes: 10, content: null },
  { id: 's2', step_order: 2, title: 'Reflect', kind: 'reflection', family: 'prompt', ask_verb: 'Reflect', required: false, repeatable: false, duration_minutes: 15, content: null },
];

import { StepRail } from '@/components/journeys/StepRail';

describe('StepRail — order, required marks, completion ticks, current step', () => {
  it('renders every step in order', () => {
    render(<StepRail steps={steps} currentStepId="s1" completedStepIds={new Set()} />);
    const items = screen.getByTestId('step-rail').querySelectorAll('[data-testid^="rail-step-"]');
    expect(items).toHaveLength(2);
    expect(items[0].textContent).toContain('Orient');
    expect(items[1].textContent).toContain('Reflect');
  });

  it('marks required steps and ticks completed ones', () => {
    render(<StepRail steps={steps} currentStepId="s2" completedStepIds={new Set(['s1'])} />);
    // s1 required + completed; s2 optional + incomplete.
    expect(screen.getByTestId('step-rail').querySelector('[data-testid="rail-step-s1"] [data-testid="rail-required"]')).toBeTruthy();
    expect(screen.getByTestId('step-rail').querySelector('[data-testid="rail-step-s1"] [data-testid="rail-tick"]')).toBeTruthy();
    expect(screen.getByTestId('step-rail').querySelector('[data-testid="rail-step-s2"] [data-testid="rail-required"]')).toBeNull();
    expect(screen.getByTestId('step-rail').querySelector('[data-testid="rail-step-s2"] [data-testid="rail-tick"]')).toBeNull();
  });

  it('flags the current step for assistive tech', () => {
    render(<StepRail steps={steps} currentStepId="s2" completedStepIds={new Set()} />);
    const current = screen.getByTestId('step-rail').querySelector('[aria-current="step"]');
    expect(current?.getAttribute('data-testid')).toBe('rail-step-s2');
  });

  it('shows no per-step time when no timing block is passed (H020 shape unchanged)', () => {
    render(<StepRail steps={steps} currentStepId="s1" completedStepIds={new Set()} />);
    expect(screen.getByTestId('step-rail').querySelector('[data-testid="rail-time-s1"]')).toBeNull();
  });
});

describe('StepRail — FEAT-H021 per-step engagement time (JRN-11)', () => {
  const timing = {
    per_step: [{ step_id: 's1', seconds: 600 }, { step_id: 's2', seconds: 0 }],
    total_seconds: 600,
    wall_clock: { enrolled_at: '2026-07-06T09:00:00+00:00', completed_at: null },
  };

  it('renders each step time from the timing block (coarse), never re-derived', () => {
    render(<StepRail steps={steps} currentStepId="s1" completedStepIds={new Set(['s1'])} timing={timing} />);
    const rail = screen.getByTestId('step-rail');
    expect(rail.querySelector('[data-testid="rail-time-s1"]')?.textContent).toContain('10 min');
  });

  it('renders an em-dash for a step with no accrued time — never "0 min", never fabricated', () => {
    render(<StepRail steps={steps} currentStepId="s1" completedStepIds={new Set()} timing={timing} />);
    const rail = screen.getByTestId('step-rail');
    // s2 has a zero-second entry -> em-dash; a step absent from per_step -> em-dash too.
    expect(rail.querySelector('[data-testid="rail-time-s2"]')?.textContent).toContain('—');
    expect(rail.querySelector('[data-testid="rail-time-s2"]')?.textContent).not.toContain('0 min');
  });
});
