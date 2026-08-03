import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * FEAT-H039 (Cycle ADM-E) — the `message` prop widens additively from string
 * to ReactNode so the bulk ceremony can list selected members inside the house
 * confirmation primitive (never a bespoke modal — hub CLAUDE.md).
 *
 * LABELLED DESIGNED-GREEN at the unit tier: ts-jest transpiles without a full
 * type check (the house rule: `next build` is the type gate), so a ReactNode
 * message renders under the OLD string-typed prop too. These cells pin the
 * runtime behavior; the type widening itself is gated by `next build`, which
 * fails red at head on this file's ReactNode usage.
 */

describe('ConfirmModal — ReactNode message (FEAT-H039)', () => {
  it('renders a rich message node', () => {
    render(
      <ConfirmModal
        isOpen
        title="Bulk suspend"
        message={
          <span>
            Suspend 2 members?
            <ul data-testid="bulk-roster">
              <li>Rolf Rowan (rolf@example.com)</li>
              <li>Pia Petal (pia@example.com)</li>
            </ul>
          </span>
        }
        onConfirm={() => undefined}
        onCancel={() => undefined}
        variant="danger"
      />,
    );
    expect(screen.getByTestId('bulk-roster')).toBeInTheDocument();
    expect(screen.getByText(/rolf@example\.com/)).toBeInTheDocument();
  });

  it('a plain string message still renders unchanged', () => {
    render(
      <ConfirmModal
        isOpen
        title="Plain"
        message="Really?"
        onConfirm={() => undefined}
        onCancel={() => undefined}
      />,
    );
    expect(screen.getByText('Really?')).toBeInTheDocument();
  });
});
