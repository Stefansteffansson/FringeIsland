import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import type { PlayerStep } from '@/lib/journeys/player';

/**
 * FEAT-H020 (unit) — StepCanvas is the JB-04 minimal canvas and the seam
 * TASK-JB-05 swaps for the kind-renderer registry + real completion flow. For
 * now it presents one step plainly: title, duration, a plain rendering of
 * `content.body` when present, and a DISABLED generic Complete placeholder
 * (completion is JB-05's). It must never crash on an unknown kind or a null
 * content payload (open vocabulary, JRN-18). Red-first for TASK-JB-04.
 */

const STEP = (over: Partial<PlayerStep> = {}): PlayerStep => ({
  id: 's1',
  step_order: 1,
  title: 'Orient',
  kind: 'content',
  family: 'text',
  ask_verb: 'Read',
  required: true,
  repeatable: false,
  duration_minutes: 10,
  content: { body: 'Welcome to the journey.' },
  ...over,
});

import { StepCanvas } from '@/components/journeys/StepCanvas';

describe('StepCanvas — minimal step presentation (JB-04 seam)', () => {
  it('renders the title, duration and a plain content body', () => {
    render(<StepCanvas step={STEP()} />);
    const canvas = screen.getByTestId('step-canvas');
    expect(canvas.textContent).toContain('Orient');
    expect(canvas.textContent).toContain('10 min');
    expect(canvas.textContent).toContain('Welcome to the journey.');
  });

  it('renders a DISABLED generic Complete placeholder (JB-05 owns real completion)', () => {
    render(<StepCanvas step={STEP()} />);
    const complete = screen.getByTestId('step-complete') as HTMLButtonElement;
    expect(complete.disabled).toBe(true);
  });

  it('does not crash on a null content payload or an unknown kind (open vocabulary)', () => {
    render(<StepCanvas step={STEP({ kind: 'ritual-of-the-mist', content: null })} />);
    const canvas = screen.getByTestId('step-canvas');
    expect(canvas.textContent).toContain('Orient');
    expect(canvas.textContent).not.toContain('undefined');
  });
});
