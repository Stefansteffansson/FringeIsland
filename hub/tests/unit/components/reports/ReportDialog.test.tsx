import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H028 STORY-5 (unit) — the shared ReportDialog (COM-13). A small dialog
 * on content that isn't mine: required reason, optional details, submit via the
 * courier, a confirmation on the confirmed write. An idempotent resubmit reads
 * as "already reported" — no duplicate, no error tone. A failure is surfaced
 * honestly and the entered reason is preserved.
 *
 * Red-first: the component does not exist yet — import fails.
 */

type ReportsClient = typeof import('@/lib/reports/client');
const mockSubmit = jest.fn<ReportsClient['submitReport']>();
jest.mock('@/lib/reports/client', () => ({
  __esModule: true,
  submitReport: (...a: Parameters<ReportsClient['submitReport']>) => mockSubmit(...a),
  hasReported: () => false,
}));

import { ReportDialog } from '@/components/reports/ReportDialog';

beforeEach(() => {
  jest.clearAllMocks();
  mockSubmit.mockResolvedValue({
    report: { id: 'r1', status: 'open', created_at: 'x' },
    alreadyReported: false,
  });
});

describe('ReportDialog', () => {
  it('opens from its trigger and collects a required reason + optional details', async () => {
    render(<ReportDialog targetKind="forum_post" targetId="t1" />);
    await userEvent.click(screen.getByTestId('report-open-t1'));
    expect(screen.getByTestId('report-reason')).toBeInTheDocument();
    expect(screen.getByTestId('report-details')).toBeInTheDocument();
    expect(screen.getByTestId('report-submit')).toBeDisabled();
  });

  it('submits and shows a confirmation on the confirmed write', async () => {
    render(<ReportDialog targetKind="forum_post" targetId="t1" />);
    await userEvent.click(screen.getByTestId('report-open-t1'));
    await userEvent.type(screen.getByTestId('report-reason'), 'spam');
    await userEvent.click(screen.getByTestId('report-submit'));
    expect(await screen.findByTestId('report-confirmation')).toBeInTheDocument();
    expect(mockSubmit).toHaveBeenCalledWith('forum_post', 't1', 'spam', undefined);
  });

  it('reads an idempotent resubmit as already reported, not an error', async () => {
    mockSubmit.mockResolvedValue({
      report: { id: 'r1', status: 'open', created_at: 'x' },
      alreadyReported: true,
    });
    render(<ReportDialog targetKind="forum_post" targetId="t1" />);
    await userEvent.click(screen.getByTestId('report-open-t1'));
    await userEvent.type(screen.getByTestId('report-reason'), 'spam');
    await userEvent.click(screen.getByTestId('report-submit'));
    const confirmation = await screen.findByTestId('report-confirmation');
    expect(confirmation).toHaveTextContent(/already reported/i);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('surfaces a failure honestly and preserves the entered reason', async () => {
    mockSubmit.mockRejectedValue(new Error('Request failed'));
    render(<ReportDialog targetKind="forum_post" targetId="t1" />);
    await userEvent.click(screen.getByTestId('report-open-t1'));
    await userEvent.type(screen.getByTestId('report-reason'), 'harassment');
    await userEvent.click(screen.getByTestId('report-submit'));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByTestId('report-reason')).toHaveValue('harassment');
  });

  it('passes optional details through when provided', async () => {
    render(<ReportDialog targetKind="direct_message" targetId="m1" />);
    await userEvent.click(screen.getByTestId('report-open-m1'));
    await userEvent.type(screen.getByTestId('report-reason'), 'abuse');
    await userEvent.type(screen.getByTestId('report-details'), 'more context');
    await userEvent.click(screen.getByTestId('report-submit'));
    await waitFor(() =>
      expect(mockSubmit).toHaveBeenCalledWith('direct_message', 'm1', 'abuse', 'more context'),
    );
  });
});
