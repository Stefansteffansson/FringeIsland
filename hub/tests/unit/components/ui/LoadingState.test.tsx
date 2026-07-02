import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { render, screen, act } from '@testing-library/react';
import { LoadingState } from '@/components/ui/LoadingState';

/**
 * UX revision 2026-07-02 — the DEFERRED loading indicator. A spinner flashed for
 * a fast (~sub-400 ms) response draws the eye to the wait and makes the surface
 * feel slower than showing nothing (the delayed-spinner pattern: <100 ms feels
 * instant; 100 ms-1 s reads faster without an indicator). So LoadingState shows
 * NOTHING for its first `delay` ms (default 300) and only then presents the
 * spinner, fading in so a near-threshold response reads as a soft blip, not a
 * flash. `delay={0}` opts out for contexts that need instant feedback.
 *
 * Red-first: fails while LoadingState renders the spinner from mount.
 */
describe('LoadingState (deferred indicator)', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing during the deferral window (default 300 ms)', () => {
    jest.useFakeTimers();
    render(<LoadingState label="Loading your profile..." />);
    expect(screen.queryByTestId('loading-state')).toBeNull();
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(screen.queryByTestId('loading-state')).toBeNull();
  });

  it('shows the spinner + label once the wait outlasts the delay', () => {
    jest.useFakeTimers();
    render(<LoadingState label="Loading your profile..." />);
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('loading-state')).not.toBeNull();
    expect(screen.getByText('Loading your profile...')).not.toBeNull();
  });

  it('respects a custom delay', () => {
    jest.useFakeTimers();
    render(<LoadingState label="Loading..." delay={500} />);
    act(() => {
      jest.advanceTimersByTime(400);
    });
    expect(screen.queryByTestId('loading-state')).toBeNull();
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByTestId('loading-state')).not.toBeNull();
  });

  it('delay={0} renders immediately (opt-out for instant-feedback contexts)', () => {
    render(<LoadingState label="Working..." delay={0} />);
    expect(screen.getByTestId('loading-state')).not.toBeNull();
  });
});
