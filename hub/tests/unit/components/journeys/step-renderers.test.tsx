import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react';
import type { PlayerStep } from '@/lib/journeys/player';
import { getStepRenderer } from '@/components/journeys/step-renderers';

/**
 * FEAT-H020 STORY-6 (unit) — the JRN-18 kind -> renderer registry. Lookup is by
 * open-vocabulary `kind: string` (ADR-U044): each seeded Tier-1 kind presents its
 * content payload plainly; an unknown key falls to the MANDATORY fallback that
 * renders the payload as data and never crashes. No union, no exhaustive switch.
 * Red-first for TASK-JB-05 (fails until the registry module exists).
 */

const STEP = (over: Partial<PlayerStep> = {}): PlayerStep => ({
  id: 's',
  step_order: 1,
  title: 'A step',
  kind: 'narrative',
  family: 'text',
  ask_verb: 'Read',
  required: false,
  repeatable: false,
  duration_minutes: null,
  content: null,
  ...over,
});

const renderKind = (step: PlayerStep) => {
  const Renderer = getStepRenderer(step.kind);
  return render(<Renderer step={step} />);
};

describe('JRN-18 kind renderers — the seven seeded Tier-1 kinds', () => {
  const cases: Array<[string, string, Record<string, unknown>, string[]]> = [
    ['narrative', 'renderer-narrative', { body: 'A short story' }, ['A short story']],
    ['reflection', 'renderer-reflection', { prompt: 'What did you feel?' }, ['What did you feel?']],
    [
      'assessment',
      'renderer-assessment',
      { question: 'Rate your confidence', options: ['Low', 'High'] },
      ['Rate your confidence', 'Low', 'High'],
    ],
    [
      'choice',
      'renderer-choice',
      { prompt: 'Pick a path', options: ['Left', 'Right'] },
      ['Pick a path', 'Left', 'Right'],
    ],
    ['activity', 'renderer-activity', { instructions: 'Do ten pushups' }, ['Do ten pushups']],
    ['journal', 'renderer-journal', { prompt: 'Write about today' }, ['Write about today']],
    [
      'checklist',
      'renderer-checklist',
      { prompt: 'Before you go', items: ['Water', 'Keys'] },
      ['Before you go', 'Water', 'Keys'],
    ],
  ];

  it.each(cases)('renders the %s kind with its content payload', (kind, testid, content, expected) => {
    const { getByTestId, container } = renderKind(STEP({ kind, content }));
    expect(getByTestId(testid)).toBeTruthy();
    for (const text of expected) expect(container.textContent).toContain(text);
  });
});

describe('JRN-18 fallback — unknown kind renders as data, never crashes', () => {
  it('returns the fallback renderer for an unknown key and renders the payload', () => {
    const { getByTestId, container } = renderKind(
      STEP({ kind: 'ritual-of-the-mist', content: { body: 'raw payload' } }),
    );
    expect(getByTestId('renderer-fallback')).toBeTruthy();
    expect(container.textContent).toContain('raw payload');
  });

  it('never crashes on a null payload for a known or an unknown kind', () => {
    expect(() => renderKind(STEP({ kind: 'narrative', content: null }))).not.toThrow();
    expect(() => renderKind(STEP({ kind: 'mystery-kind', content: null }))).not.toThrow();
  });

  it('adding a kind is data-only: an unmapped key still returns a working renderer', () => {
    const Renderer = getStepRenderer('some-future-kind');
    expect(typeof Renderer).toBe('function');
    expect(() => render(<Renderer step={STEP({ kind: 'some-future-kind' })} />)).not.toThrow();
  });
});
