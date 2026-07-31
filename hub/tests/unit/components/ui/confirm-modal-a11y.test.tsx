import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * COR-C W5 (Audit III AC3-8) — the focus contract `aria-modal="true"` promises.
 * RED at HEAD: ConfirmModal declares the modal and manages no focus at all —
 * no initial focus, no trap, no restore. Declaring aria-modal without a trap
 * is worse than omitting it: AT is told the page behind is inert while Tab
 * walks straight into it. The mandated confirmation primitive guards every
 * destructive path in the Hub (hub CLAUDE.md), account deletion included.
 */

function Host({ variant }: { variant?: 'danger' | 'warning' | 'info' }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" data-testid="opener" onClick={() => setOpen(true)}>
        Open
      </button>
      <ConfirmModal
        isOpen={open}
        title="Delete this?"
        message="Really?"
        variant={variant}
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

describe('ConfirmModal — the aria-modal focus contract (COR-C W5, AC3-8)', () => {
  it('a danger modal lands initial focus on Cancel — the safe default for a destructive ask', async () => {
    const user = userEvent.setup();
    render(<Host variant="danger" />);
    await user.click(screen.getByTestId('opener'));
    expect(screen.getByTestId('confirm-modal-cancel')).toHaveFocus();
  });

  it('a non-danger modal lands initial focus on Confirm', async () => {
    const user = userEvent.setup();
    render(<Host variant="info" />);
    await user.click(screen.getByTestId('opener'));
    expect(screen.getByTestId('confirm-modal-confirm')).toHaveFocus();
  });

  it('Tab cycles inside the modal — the page behind is unreachable, as aria-modal claims', async () => {
    const user = userEvent.setup();
    render(<Host variant="danger" />);
    await user.click(screen.getByTestId('opener'));

    // cancel (initial) -> confirm -> wraps back to cancel; never the opener.
    await user.tab();
    expect(screen.getByTestId('confirm-modal-confirm')).toHaveFocus();
    await user.tab();
    expect(screen.getByTestId('confirm-modal-cancel')).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByTestId('confirm-modal-confirm')).toHaveFocus();
  });

  it('closing the modal returns focus to the element that opened it', async () => {
    const user = userEvent.setup();
    render(<Host variant="danger" />);
    await user.click(screen.getByTestId('opener'));
    await user.click(screen.getByTestId('confirm-modal-cancel'));
    expect(screen.getByTestId('opener')).toHaveFocus();
  });
});
