import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * FEAT-H004 — the Hub confirmation primitive (the design-system piece the v2 tree
 * was missing). Every destructive / yes-no decision flows through this, never
 * browser confirm()/alert() (Hub CLAUDE.md). Copy-with-correction from the
 * hub-legacy oracle, adapted to house style (named export, data-testid, a `busy`
 * in-flight state for async confirms like the explicit-erase farewell).
 */
const base = {
  title: 'Say goodbye?',
  message: 'This erases your visit immediately.',
  onConfirm: jest.fn(),
  onCancel: jest.fn(),
};

describe('ConfirmModal', () => {
  it('renders nothing when closed', () => {
    render(<ConfirmModal isOpen={false} {...base} />);
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
  });

  it('renders the title, message, and both actions when open', () => {
    render(<ConfirmModal isOpen {...base} confirmText="Erase my visit" cancelText="Stay" />);
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByText('Say goodbye?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Erase my visit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stay' })).toBeInTheDocument();
  });

  it('invokes onConfirm and onCancel from the respective buttons', async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(<ConfirmModal isOpen {...base} onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByTestId('confirm-modal-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables both actions while busy (in-flight async confirm)', () => {
    render(<ConfirmModal isOpen {...base} busy />);
    expect(screen.getByTestId('confirm-modal-confirm')).toBeDisabled();
    expect(screen.getByTestId('confirm-modal-cancel')).toBeDisabled();
  });
});
