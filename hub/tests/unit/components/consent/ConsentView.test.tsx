import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentView } from '@/components/consent/ConsentView';
import type { ConsentState } from '@/lib/consent/queries';

/**
 * FEAT-H008 — render consent state (IDN-6). `ConsentView` is the pure surface:
 * given the resolved consent state + loading/error, it renders the member's
 * effective decisions + full history, read-only. Drift is shown, not acted on;
 * loading/error/empty are honest; no grant/withdraw controls (that is FEAT-H009).
 */
const noop = () => {};

function makeState(over: Partial<ConsentState> = {}): ConsentState {
  return {
    effective: [
      {
        purpose: 'transcendence',
        label: 'Becoming a member',
        description: 'The foundational agreement.',
        decision: 'granted',
        policy_version: 'v1',
        decided_at: '2026-06-01T10:00:00Z',
        withdrawable: false,
        current_policy_version: 'v1',
        needs_reconsent: false,
      },
      {
        purpose: 'product_analytics',
        label: 'Product analytics',
        description: 'Optional analytics.',
        decision: null,
        policy_version: null,
        decided_at: null,
        withdrawable: true,
        current_policy_version: 'v1',
        needs_reconsent: false,
      },
    ],
    history: [
      {
        purpose: 'transcendence',
        decision: 'granted',
        policy_version: 'v1',
        captured_at: '2026-06-01T10:00:00Z',
        capture_context: null,
      },
    ],
    ...over,
  };
}

describe('ConsentView (FEAT-H008 — render consent state)', () => {
  it('STORY-4: shows a loading state for a genuine wait — deferred ~300 ms so a fast response never flashes it', () => {
    jest.useFakeTimers();
    render(<ConsentView loading error={null} state={null} onRetry={noop} />);
    // Deferred indicator (UX revision 2026-07-02): silent window first...
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    expect(screen.queryByTestId('consent-effective')).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(300);
    });
    // ...then the spinner for a wait that outlasts it (never a frozen UI).
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.queryByTestId('consent-effective')).not.toBeInTheDocument();
    jest.useRealTimers();
  });

  it('STORY-4: on error, shows a clear error with retry — never a silent blank', async () => {
    const onRetry = jest.fn();
    render(
      <ConsentView loading={false} error="We could not load your consent." state={null} onRetry={onRetry} />,
    );
    expect(screen.getByTestId('consent-error')).toBeInTheDocument();
    expect(screen.queryByTestId('consent-effective')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('STORY-1: renders one effective row per purpose with its label + current decision', () => {
    render(<ConsentView loading={false} error={null} state={makeState()} onRetry={noop} />);
    const rows = screen.getAllByTestId(/^consent-effective-row-/);
    expect(rows).toHaveLength(2);

    const transcendence = screen.getByTestId('consent-effective-row-transcendence');
    expect(within(transcendence).getByText('Becoming a member')).toBeInTheDocument();
    expect(within(transcendence).getByText(/granted/i)).toBeInTheDocument();

    // an undecided optional purpose reads as "not yet decided"
    const analytics = screen.getByTestId('consent-effective-row-product_analytics');
    expect(within(analytics).getByText(/not yet decided/i)).toBeInTheDocument();
  });

  it('STORY-1: is read-only — no grant/withdraw controls (those are FEAT-H009)', () => {
    render(<ConsentView loading={false} error={null} state={makeState()} onRetry={noop} />);
    expect(screen.queryByRole('button', { name: /withdraw/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /grant/i })).not.toBeInTheDocument();
  });

  it('STORY-2: renders the full history newest-first with decision, policy version, and timestamp', () => {
    const state = makeState({
      history: [
        { purpose: 'product_analytics', decision: 'withdrawn', policy_version: 'v1', captured_at: '2026-06-03T10:00:00Z', capture_context: null },
        { purpose: 'product_analytics', decision: 'granted', policy_version: 'v1', captured_at: '2026-06-02T10:00:00Z', capture_context: null },
        { purpose: 'transcendence', decision: 'granted', policy_version: 'v1', captured_at: '2026-06-01T10:00:00Z', capture_context: null },
      ],
    });
    render(<ConsentView loading={false} error={null} state={state} onRetry={noop} />);
    const rows = screen.getAllByTestId('consent-history-row');
    expect(rows).toHaveLength(3);
    // newest first — the withdrawn event leads (the component preserves contract order)
    expect(within(rows[0]).getByText(/withdrawn/i)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/v1/)).toBeInTheDocument();
  });

  it('STORY-3: a drifted entry shows an informational hint and NO call-to-action', () => {
    const state = makeState();
    state.effective[1] = { ...state.effective[1], decision: 'granted', policy_version: 'v0-old', needs_reconsent: true };
    render(<ConsentView loading={false} error={null} state={state} onRetry={noop} />);

    const drift = screen.getByTestId('consent-drift-product_analytics');
    expect(drift).toBeInTheDocument();
    expect(drift).toHaveTextContent(/updated/i);
    // informational only — no action button in the drift hint
    expect(within(drift).queryByRole('button')).not.toBeInTheDocument();
  });

  it('STORY-3: no drift hint when needs_reconsent is false', () => {
    render(<ConsentView loading={false} error={null} state={makeState()} onRetry={noop} />);
    expect(screen.queryByTestId('consent-drift-transcendence')).not.toBeInTheDocument();
    expect(screen.queryByTestId('consent-drift-product_analytics')).not.toBeInTheDocument();
  });

  it('STORY-4: a FIM with only the transcendence record sees that one honest row (valid non-empty state)', () => {
    const state: ConsentState = {
      effective: [makeState().effective[0]],
      history: [makeState().history[0]],
    };
    render(<ConsentView loading={false} error={null} state={state} onRetry={noop} />);
    expect(screen.getByTestId('consent-effective-row-transcendence')).toBeInTheDocument();
    expect(screen.getAllByTestId('consent-history-row')).toHaveLength(1);
  });
});
