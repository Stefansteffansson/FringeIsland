import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentView } from '@/components/consent/ConsentView';
import type { ConsentState, ConsentEffectiveEntry } from '@/lib/consent/queries';

/**
 * FEAT-H009 — grant/withdraw controls (IDN-7 consent half). The controls are
 * OPT-IN on `ConsentView` via `onRequestChange`: a withdrawable purpose gets a
 * grant/withdraw control reflecting its current decision; a non-withdrawable one
 * renders LOCKED (no control — the Hub never offers an action the platform will
 * refuse). Without `onRequestChange` the surface stays read-only (FEAT-H008).
 */
const noop = () => {};

function entry(over: Partial<ConsentEffectiveEntry>): ConsentEffectiveEntry {
  return {
    purpose: 'product_analytics',
    label: 'Product analytics',
    description: 'Optional analytics.',
    decision: null,
    policy_version: null,
    decided_at: null,
    withdrawable: true,
    current_policy_version: 'v1',
    needs_reconsent: false,
    ...over,
  };
}

function stateWith(...effective: ConsentEffectiveEntry[]): ConsentState {
  return { effective, history: [] };
}

const TRANSCENDENCE = entry({
  purpose: 'transcendence',
  label: 'Becoming a member',
  decision: 'granted',
  withdrawable: false,
});

describe('ConsentView controls (FEAT-H009 — grant/withdraw)', () => {
  it('a withdrawable GRANTED purpose offers a Withdraw control that requests withdrawn', async () => {
    const onRequestChange = jest.fn();
    render(
      <ConsentView
        loading={false}
        error={null}
        state={stateWith(entry({ decision: 'granted' }))}
        onRetry={noop}
        onRequestChange={onRequestChange}
      />,
    );
    const row = screen.getByTestId('consent-effective-row-product_analytics');
    await userEvent.click(within(row).getByRole('button', { name: /withdraw/i }));
    expect(onRequestChange).toHaveBeenCalledWith('product_analytics', 'withdrawn');
  });

  it('a withdrawable UNDECIDED purpose offers a Grant control that requests granted', async () => {
    const onRequestChange = jest.fn();
    render(
      <ConsentView
        loading={false}
        error={null}
        state={stateWith(entry({ decision: null }))}
        onRetry={noop}
        onRequestChange={onRequestChange}
      />,
    );
    const row = screen.getByTestId('consent-effective-row-product_analytics');
    await userEvent.click(within(row).getByRole('button', { name: /grant/i }));
    expect(onRequestChange).toHaveBeenCalledWith('product_analytics', 'granted');
  });

  it('a withdrawable WITHDRAWN purpose offers a Grant control (re-grant)', async () => {
    const onRequestChange = jest.fn();
    render(
      <ConsentView
        loading={false}
        error={null}
        state={stateWith(entry({ decision: 'withdrawn' }))}
        onRetry={noop}
        onRequestChange={onRequestChange}
      />,
    );
    const row = screen.getByTestId('consent-effective-row-product_analytics');
    await userEvent.click(within(row).getByRole('button', { name: /grant/i }));
    expect(onRequestChange).toHaveBeenCalledWith('product_analytics', 'granted');
  });

  it('a NON-withdrawable purpose is locked — no control, even with onRequestChange', () => {
    render(
      <ConsentView
        loading={false}
        error={null}
        state={stateWith(TRANSCENDENCE)}
        onRetry={noop}
        onRequestChange={jest.fn()}
      />,
    );
    const row = screen.getByTestId('consent-effective-row-transcendence');
    expect(within(row).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('consent-locked-transcendence')).toBeInTheDocument();
  });

  it('the in-flight row control is disabled and shows a loading state (busyPurpose)', () => {
    render(
      <ConsentView
        loading={false}
        error={null}
        state={stateWith(entry({ decision: 'granted' }))}
        onRetry={noop}
        onRequestChange={jest.fn()}
        busyPurpose="product_analytics"
      />,
    );
    // Query by stable testid — the visible label changes to the loading state.
    const control = screen.getByTestId('consent-action-product_analytics');
    expect(control).toBeDisabled();
    expect(control).toHaveTextContent(/saving/i);
  });

  it('without onRequestChange the surface stays read-only (FEAT-H008 invariant)', () => {
    render(
      <ConsentView
        loading={false}
        error={null}
        state={stateWith(entry({ decision: 'granted' }), TRANSCENDENCE)}
        onRetry={noop}
      />,
    );
    expect(screen.queryByRole('button', { name: /withdraw/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /grant/i })).not.toBeInTheDocument();
  });
});
