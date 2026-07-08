import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

/**
 * FEAT-H022 STORY-2 (unit) — the traveller-side sharing toggle (JRN-17). It boots
 * from the payload's progress_sharing (no extra read), states EXACTLY what it
 * exposes (step completion marks only — never times, never anything written) with
 * the revocation fact, and flips optimistically (B5): the paint is immediate, the
 * write rides the background, a failure rolls back and offers retry, and every
 * flip emits telemetry. Red-first for TASK-JD-04.
 */

const setProgressSharing =
  jest.fn<(e: string, s: boolean) => Promise<{ enrollment_id: string; sharing: boolean }>>();
const emitTelemetry = jest.fn();

jest.mock('@/lib/journeys/player', () => ({
  setProgressSharing: (e: string, s: boolean) => setProgressSharing(e, s),
}));
jest.mock('@/lib/observability/telemetry', () => ({
  emitTelemetry: (...a: unknown[]) => (emitTelemetry as (...x: unknown[]) => unknown)(...a),
}));

import { SharingToggle } from '@/components/journeys/SharingToggle';

beforeEach(() => {
  jest.clearAllMocks();
  setProgressSharing.mockResolvedValue({ enrollment_id: 'e1', sharing: true });
});

describe('SharingToggle — boot state + honest copy', () => {
  it('boots unchecked from initialSharing:false and names exactly what it shares + revocation', () => {
    render(<SharingToggle enrollmentId="e1" initialSharing={false} />);
    expect((screen.getByTestId('sharing-checkbox') as HTMLInputElement).checked).toBe(false);
    const text = screen.getByTestId('sharing-toggle').textContent ?? '';
    expect(text).toMatch(/completion marks/i);
    expect(text).toMatch(/times/i); // "never your times"
    expect(text).not.toMatch(/journal|what you write.*shared|share.*journal/i);
    expect(text).toMatch(/turn this off|at any time/i);
  });

  it('boots checked when already sharing', () => {
    render(<SharingToggle enrollmentId="e1" initialSharing />);
    expect((screen.getByTestId('sharing-checkbox') as HTMLInputElement).checked).toBe(true);
  });
});

describe('SharingToggle — optimistic flip + telemetry', () => {
  it('paints the flip immediately (B5), writes through with (enrollmentId, next), emits telemetry', () => {
    setProgressSharing.mockReturnValue(new Promise(() => {})); // pending -> pre-response paint
    render(<SharingToggle enrollmentId="e1" initialSharing={false} />);
    fireEvent.click(screen.getByTestId('sharing-checkbox'));
    expect((screen.getByTestId('sharing-checkbox') as HTMLInputElement).checked).toBe(true);
    expect(setProgressSharing).toHaveBeenCalledWith('e1', true);
    expect(emitTelemetry).toHaveBeenCalled();
  });

  it('rolls back and offers retry on failure; retry succeeds and clears the error', async () => {
    setProgressSharing
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))
      .mockResolvedValueOnce({ enrollment_id: 'e1', sharing: true });
    render(<SharingToggle enrollmentId="e1" initialSharing={false} />);
    fireEvent.click(screen.getByTestId('sharing-checkbox'));
    await waitFor(() => expect(screen.getByTestId('sharing-error')).toBeTruthy());
    expect((screen.getByTestId('sharing-checkbox') as HTMLInputElement).checked).toBe(false); // rolled back
    fireEvent.click(screen.getByTestId('sharing-retry'));
    await waitFor(() => expect(screen.queryByTestId('sharing-error')).toBeNull());
    expect((screen.getByTestId('sharing-checkbox') as HTMLInputElement).checked).toBe(true);
  });
});
