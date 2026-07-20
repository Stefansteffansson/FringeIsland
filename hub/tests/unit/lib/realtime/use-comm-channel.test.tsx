import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import type { TenantStatus } from '@/lib/realtime/manager';

/**
 * FEAT-H027 STORY-6 (unit) — the shared comm-channel reconciliation hook.
 * Red-first for TASK-CC-06.
 *
 * A mounted comm surface watches its channel status: it shows a reconnecting
 * affordance only once a channel that WAS subscribed leaves that state (never
 * during the first connect), reconciles (invalidate + re-fetch) on recovery and
 * on tab-visibility regain, and — while degraded AND visible — runs a slow poll
 * (COMM_POLL_MS) that stops the moment the socket returns or the tab hides.
 */

let statusListener: ((s: TenantStatus | null) => void) | null = null;
const subscribeStatus = jest.fn<(topic: string, l: (s: TenantStatus | null) => void) => () => void>();
const getStatus = jest.fn<(topic: string) => TenantStatus | null>();
const unsub = jest.fn();
jest.mock('@/lib/realtime/manager', () => ({
  realtimeManager: {
    subscribeStatus: (t: string, l: (s: TenantStatus | null) => void) => subscribeStatus(t, l),
    getStatus: (t: string) => getStatus(t),
  },
}));

import { useCommChannel, COMM_POLL_MS } from '@/lib/realtime/use-comm-channel';

function Harness({ topic, onReconcile }: { topic: string | null; onReconcile: () => void }) {
  const { reconnecting } = useCommChannel(topic, onReconcile);
  return <div data-testid="rc">{reconnecting ? 'yes' : 'no'}</div>;
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}
function fireVisibility(state: 'visible' | 'hidden') {
  setVisibility(state);
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}
const push = (s: TenantStatus | null) =>
  act(() => {
    statusListener!(s);
  });

beforeEach(() => {
  jest.clearAllMocks();
  statusListener = null;
  getStatus.mockReturnValue(null);
  subscribeStatus.mockImplementation((_t, l) => {
    statusListener = l;
    return unsub;
  });
  setVisibility('visible');
});

describe('FEAT-H027 — useCommChannel (STORY-6 reconciliation)', () => {
  it('shows no affordance while first connecting, one once a subscribed channel degrades, none on recovery', () => {
    render(<Harness topic="t" onReconcile={jest.fn()} />);
    expect(screen.getByTestId('rc')).toHaveTextContent('no');

    push('reconnecting'); // initial connect — not "left subscribed" yet
    expect(screen.getByTestId('rc')).toHaveTextContent('no');

    push('subscribed');
    expect(screen.getByTestId('rc')).toHaveTextContent('no');

    push('reconnecting'); // NOW it has left the subscribed state
    expect(screen.getByTestId('rc')).toHaveTextContent('yes');

    push('subscribed');
    expect(screen.getByTestId('rc')).toHaveTextContent('no');
  });

  it('reconciles on recovery only — never on the first subscribe (STORY-6)', () => {
    const onReconcile = jest.fn();
    render(<Harness topic="t" onReconcile={onReconcile} />);

    push('subscribed');
    expect(onReconcile).not.toHaveBeenCalled(); // first connect is not a recovery

    push('reconnecting');
    push('subscribed');
    expect(onReconcile).toHaveBeenCalledTimes(1);
  });

  it('reconciles when the tab regains visibility (STORY-6)', () => {
    const onReconcile = jest.fn();
    render(<Harness topic="t" onReconcile={onReconcile} />);
    push('subscribed');

    fireVisibility('visible');
    expect(onReconcile).toHaveBeenCalledTimes(1);
  });

  it('runs a slow poll while degraded and visible, and stops it on re-subscribe (STORY-6)', () => {
    jest.useFakeTimers();
    try {
      const onReconcile = jest.fn();
      render(<Harness topic="t" onReconcile={onReconcile} />);
      push('subscribed');
      push('reconnecting'); // degraded + visible → poll arms

      act(() => jest.advanceTimersByTime(COMM_POLL_MS));
      expect(onReconcile).toHaveBeenCalledTimes(1); // one poll tick

      push('subscribed'); // recovery → poll stops (+ one recovery reconcile)
      const afterRecovery = onReconcile.mock.calls.length;
      act(() => jest.advanceTimersByTime(COMM_POLL_MS * 2));
      expect(onReconcile).toHaveBeenCalledTimes(afterRecovery); // no further polling
    } finally {
      jest.useRealTimers();
    }
  });

  it('never polls while the tab is hidden (STORY-6)', () => {
    jest.useFakeTimers();
    try {
      const onReconcile = jest.fn();
      render(<Harness topic="t" onReconcile={onReconcile} />);
      push('subscribed');
      setVisibility('hidden');
      push('reconnecting'); // degraded but hidden → no poll

      act(() => jest.advanceTimersByTime(COMM_POLL_MS * 3));
      expect(onReconcile).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('subscribes to nothing and never reconnects without a topic', () => {
    render(<Harness topic={null} onReconcile={jest.fn()} />);
    expect(subscribeStatus).not.toHaveBeenCalled();
    expect(screen.getByTestId('rc')).toHaveTextContent('no');
  });
});

afterEach(() => {
  setVisibility('visible');
});
