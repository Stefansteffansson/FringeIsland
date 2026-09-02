import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import type { PlayerStep } from '@/lib/journeys/player';
import { StepCanvas } from '@/components/journeys/StepCanvas';

/**
 * FEAT-H020 STORY-3/6 (unit) — the StepCanvas renders the JRN-18 kind renderer
 * for the step and drives the JRN-8 completion flow. Four states:
 * (a) completable — optimistic tick on press, rollback + retry surface on failure;
 * (b) locked — disabled affordance naming the blocking required predecessor, and
 *     the same honest posture on a raced server P0001 (409);
 * (c) completed non-repeatable — review posture (mark replaces the affordance);
 * (d) completed repeatable — the ask-verb affordance is offered again.
 * The affordance always carries the step's own `ask_verb` (never a hardcoded map).
 * Red-first for TASK-JB-05 (the JB-04 canvas has only a disabled placeholder).
 */

const STEP = (over: Partial<PlayerStep> = {}): PlayerStep => ({
  id: 's1',
  step_order: 1,
  title: 'Orient',
  kind: 'narrative',
  family: 'text',
  ask_verb: 'Read',
  required: true,
  repeatable: false,
  duration_minutes: 10,
  content: { body: 'Welcome to the journey.' },
  ...over,
});

/**
 * FEAT-H024 STORY-1/3/4 (red-first for TASK-JF-04/05) — the canvas places the
 * Ask capture input by the payload's `captures_response` (the registry decides,
 * never a kind list), and renders the per-step `content.takeaway` once the step
 * is completed (the author's closing word arrives after the passage).
 */
describe('StepCanvas — the Ask capture placement (FEAT-H024 STORY-1)', () => {
  const saveResponse = () =>
    jest.fn<(body: string) => Promise<{ body: string }>>().mockResolvedValue({ body: 'x' });

  it('renders the response input beneath the content when the payload says captures_response', () => {
    render(
      <StepCanvas
        step={STEP({ kind: 'reflection', ask_verb: 'Reflect', captures_response: true })}
        completed={false}
        locked={false}
        onComplete={jest.fn<() => Promise<void>>()}
        responseBody=""
        onSaveResponse={saveResponse()}
      />,
    );
    expect(screen.getByTestId('response-input')).toBeTruthy();
    expect(screen.getByTestId('response-label').textContent).toContain('Reflect');
  });

  it('renders no input when captures_response is false — the registry decides, never a kind list', () => {
    render(
      <StepCanvas
        step={STEP({ kind: 'reflection', captures_response: false })}
        completed={false}
        locked={false}
        onComplete={jest.fn<() => Promise<void>>()}
        responseBody=""
        onSaveResponse={saveResponse()}
      />,
    );
    expect(screen.queryByTestId('response-input')).toBeNull();
  });

  it('an unknown future kind that declares capture gets the input with zero Hub changes', () => {
    render(
      <StepCanvas
        step={STEP({ kind: 'ritual-of-the-mist', ask_verb: 'Offer', captures_response: true })}
        completed={false}
        locked={false}
        onComplete={jest.fn<() => Promise<void>>()}
        responseBody=""
        onSaveResponse={saveResponse()}
      />,
    );
    expect(screen.getByTestId('response-input')).toBeTruthy();
    expect(screen.getByTestId('response-label').textContent).toContain('Offer');
  });

  it('frozen posture: saved words render read-only; nothing renders when nothing was written', () => {
    const { unmount } = render(
      <StepCanvas
        step={STEP({ kind: 'reflection', captures_response: true })}
        completed={false}
        locked={false}
        readOnly
        responseBody="Frozen words."
        onSaveResponse={saveResponse()}
      />,
    );
    const input = screen.getByTestId('response-input') as HTMLTextAreaElement;
    expect(input.disabled).toBe(true);
    expect(input.value).toBe('Frozen words.');
    unmount();
    // Absence is silent: frozen with no saved words shows no input at all.
    render(
      <StepCanvas
        step={STEP({ kind: 'reflection', captures_response: true })}
        completed={false}
        locked={false}
        readOnly
        responseBody=""
        onSaveResponse={saveResponse()}
      />,
    );
    expect(screen.queryByTestId('response-input')).toBeNull();
  });
});

describe('StepCanvas — the per-step takeaway (FEAT-H024 STORY-4)', () => {
  const withTakeaway = () =>
    STEP({ content: { body: 'The prompt.', takeaway: { body: 'The closing word.' } } });

  it('renders content.takeaway once the step is completed', () => {
    render(<StepCanvas step={withTakeaway()} completed={true} locked={false} />);
    expect(screen.getByTestId('step-takeaway').textContent).toContain('The closing word.');
  });

  it('does not render the takeaway before completion — it never front-runs the step', () => {
    render(
      <StepCanvas step={withTakeaway()} completed={false} locked={false} onComplete={jest.fn<() => Promise<void>>()} />,
    );
    expect(screen.queryByTestId('step-takeaway')).toBeNull();
  });

  it('absence is silent — a completed step without a takeaway renders no frame', () => {
    render(<StepCanvas step={STEP()} completed={true} locked={false} />);
    expect(screen.queryByTestId('step-takeaway')).toBeNull();
  });
});

describe('StepCanvas — presentation + kind rendering (STORY-6)', () => {
  it('renders the title, duration and the kind renderer payload', () => {
    render(<StepCanvas step={STEP()} completed={false} locked={false} onComplete={jest.fn<() => Promise<void>>()} />);
    const canvas = screen.getByTestId('step-canvas');
    expect(canvas.textContent).toContain('Orient');
    expect(canvas.textContent).toContain('10 min');
    expect(canvas.textContent).toContain('Welcome to the journey.');
    expect(screen.getByTestId('renderer-narrative')).toBeTruthy();
  });

  it('routes an unknown kind to the fallback renderer and never crashes on null content', () => {
    render(
      <StepCanvas
        step={STEP({ kind: 'ritual-of-the-mist', content: null })}
        completed={false}
        locked={false}
        onComplete={jest.fn<() => Promise<void>>()}
      />,
    );
    const canvas = screen.getByTestId('step-canvas');
    expect(canvas.textContent).toContain('Orient');
    expect(canvas.textContent).not.toContain('undefined');
    expect(screen.getByTestId('renderer-fallback')).toBeTruthy();
  });

  it('labels the complete affordance with the payload ask_verb (never a hardcoded verb)', () => {
    render(
      <StepCanvas step={STEP({ ask_verb: 'Reflect' })} completed={false} locked={false} onComplete={jest.fn<() => Promise<void>>()} />,
    );
    expect(screen.getByTestId('step-complete').textContent).toContain('Reflect');
  });
});

describe('StepCanvas — completion (STORY-3 state a)', () => {
  it('optimistically paints completed on press and calls onComplete', () => {
    const onComplete = jest.fn<() => Promise<void>>().mockReturnValue(new Promise(() => {})); // pending
    render(<StepCanvas step={STEP()} completed={false} locked={false} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('step-complete'));
    // Review posture immediately (non-repeatable): the mark replaces the affordance.
    expect(screen.getByTestId('step-completed')).toBeTruthy();
    expect(screen.queryByTestId('step-complete')).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('rolls the tick back and offers a non-blocking retry when the save fails', async () => {
    const onComplete = jest
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))
      .mockResolvedValueOnce(undefined);
    render(<StepCanvas step={STEP()} completed={false} locked={false} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('step-complete'));
    await waitFor(() => expect(screen.getByTestId('complete-error')).toBeTruthy());
    // Rolled back -> the affordance is completable again.
    expect(screen.getByTestId('step-complete')).toBeTruthy();
    expect(screen.queryByTestId('step-completed')).toBeNull();
    // Retry succeeds -> the mark paints and the error clears.
    fireEvent.click(screen.getByTestId('complete-retry'));
    await waitFor(() => expect(screen.getByTestId('step-completed')).toBeTruthy());
    expect(screen.queryByTestId('complete-error')).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
});

describe('StepCanvas — gating (STORY-3 state b)', () => {
  it('locks the affordance and names the blocking predecessor', () => {
    render(
      <StepCanvas
        step={STEP()}
        completed={false}
        locked
        lockReason={'Complete "Orient" first.'}
        onComplete={jest.fn<() => Promise<void>>()}
      />,
    );
    const btn = screen.getByTestId('step-complete') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(screen.getByTestId('step-lock-reason').textContent).toContain('Orient');
  });

  it('renders the same locked posture when the server races a P0001 (409)', async () => {
    const onComplete = jest
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(Object.assign(new Error('gated'), { status: 409 }));
    render(<StepCanvas step={STEP()} completed={false} locked={false} onComplete={onComplete} />);
    fireEvent.click(screen.getByTestId('step-complete'));
    await waitFor(() =>
      expect((screen.getByTestId('step-complete') as HTMLButtonElement).disabled).toBe(true),
    );
    expect(screen.getByTestId('step-lock-reason')).toBeTruthy();
    expect(screen.queryByTestId('step-completed')).toBeNull(); // rolled back
  });
});

describe('StepCanvas — read-only (FEAT-H022 frozen posture)', () => {
  it('renders content but NO complete affordance, ever — a completed step shows only its mark', () => {
    render(<StepCanvas step={STEP()} completed readOnly onComplete={jest.fn<() => Promise<void>>()} />);
    expect(screen.getByTestId('step-canvas').textContent).toContain('Welcome to the journey.');
    expect(screen.getByTestId('step-completed')).toBeTruthy();
    expect(screen.queryByTestId('step-complete')).toBeNull();
  });

  it('an incomplete step read-only shows content with no affordance and no lock', () => {
    render(<StepCanvas step={STEP()} completed={false} readOnly onComplete={jest.fn<() => Promise<void>>()} />);
    expect(screen.getByTestId('step-canvas').textContent).toContain('Welcome to the journey.');
    expect(screen.queryByTestId('step-complete')).toBeNull();
    expect(screen.queryByTestId('step-completed')).toBeNull();
    expect(screen.queryByTestId('step-lock-reason')).toBeNull();
  });

  it('suppresses the repeat affordance too — a completed repeatable step offers nothing to press', () => {
    render(
      <StepCanvas step={STEP({ repeatable: true, ask_verb: 'Write an entry' })} completed readOnly onComplete={jest.fn<() => Promise<void>>()} />,
    );
    expect(screen.queryByTestId('step-complete')).toBeNull();
    expect(screen.getByTestId('step-completed')).toBeTruthy();
  });
});

describe('StepCanvas — completed posture (STORY-3 state c/d)', () => {
  it('a completed non-repeatable step renders in review posture (mark, no affordance)', () => {
    render(<StepCanvas step={STEP({ repeatable: false })} completed locked={false} onComplete={jest.fn<() => Promise<void>>()} />);
    expect(screen.getByTestId('step-completed')).toBeTruthy();
    expect(screen.queryByTestId('step-complete')).toBeNull();
    // Content stays visible in review posture.
    expect(screen.getByTestId('step-canvas').textContent).toContain('Welcome to the journey.');
  });

  it('a completed repeatable step offers the ask-verb affordance again', () => {
    render(
      <StepCanvas
        step={STEP({ repeatable: true, ask_verb: 'Write an entry' })}
        completed
        locked={false}
        onComplete={jest.fn<() => Promise<void>>()}
      />,
    );
    const btn = screen.getByTestId('step-complete') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn.textContent).toContain('Write an entry');
  });
});
