import '@testing-library/jest-dom';
import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * RD-B FEAT-H044 STORY-2 — `hideConfirm`, the third additive widening of the
 * house confirmation primitive (after H039's ReactNode `message` and H041's
 * `confirmDisabled`).
 *
 * The empty-diff ceremony "states there is nothing to apply and offers only
 * Close". A *disabled* Confirm is not "only Close" — it still offers the act
 * and then refuses it, which is the shape this cycle exists to remove. The
 * acknowledge-only dialog is a real state of the primitive, so it belongs to
 * the primitive rather than to a bespoke modal (Hub CLAUDE.md).
 *
 * Red-first for TASK-RDB-03.
 */
describe('ConfirmModal — acknowledge-only (FEAT-H044)', () => {
  it('renders no confirm affordance when hideConfirm is set', () => {
    render(
      <ConfirmModal
        isOpen
        title="Nothing to apply"
        message="This role already matches the template."
        hideConfirm
        cancelText="Close"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    // Absent, not disabled.
    expect(screen.queryByTestId('confirm-modal-confirm')).not.toBeInTheDocument();
    expect(screen.getByTestId('confirm-modal-cancel')).toHaveTextContent('Close');
  });

  it('still renders both buttons by default', () => {
    render(
      <ConfirmModal
        isOpen
        title="Normal"
        message="Proceed?"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByTestId('confirm-modal-confirm')).toBeInTheDocument();
  });

  it('keeps Cancel live and focused when the confirm is hidden', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    render(
      <ConfirmModal
        isOpen
        title="Nothing to apply"
        message="Nothing to apply."
        hideConfirm
        cancelText="Close"
        onConfirm={() => undefined}
        onCancel={onCancel}
      />,
    );
    // The focus trap's default target is the confirm button for a non-danger
    // variant; with no confirm to focus it must fall back to Cancel rather
    // than leaving focus outside the dialog aria-modal promises to hold.
    expect(screen.getByTestId('confirm-modal-cancel')).toHaveFocus();
    await user.click(screen.getByTestId('confirm-modal-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });
});
