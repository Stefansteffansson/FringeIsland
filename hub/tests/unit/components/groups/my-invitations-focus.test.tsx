/**
 * FEAT-H042 (N-E) — STORY-2/STORY-3 component behaviour on `MyInvitations`:
 *   - the WS-4 landing focus: `focus` scrolls the card into view and applies a
 *     transient highlight; without `focus` nothing fires; with nothing pending
 *     it degrades plainly (no crash, no scroll);
 *   - two doors, one truth: a `refreshNavigation` event re-reads the
 *     invitations so a bell answer taken above this page updates the card.
 *
 * Red-first (authored 2026-08-05 pre-implementation): `MyInvitations` has no
 * `focus` prop and no `refreshNavigation` listener at head.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MyInvitations } from '@/components/groups/MyInvitations';
import type { MyInvitation } from '@/lib/groups/invitations';

const fetchMyInvitations = jest.fn();
jest.mock('@/lib/groups/client', () => ({
  fetchMyInvitations: (...args: unknown[]) => fetchMyInvitations(...args),
  acceptInvitation: jest.fn(),
  declineInvitation: jest.fn(),
}));

const INV: MyInvitation[] = [
  {
    group_id: 'g-1',
    group_name: 'Harbor Circle',
    group_description: null,
    is_public: true,
    invited_at: '2026-08-05T00:00:00Z',
    invited_by_display_name: 'Alice Harbor',
  } as MyInvitation,
];

describe('FEAT-H042 — MyInvitations landing focus + refresh listener', () => {
  let scrollSpy: jest.Mock;

  beforeEach(() => {
    fetchMyInvitations.mockReset();
    scrollSpy = jest.fn();
    Element.prototype.scrollIntoView = scrollSpy;
  });

  it('focus scrolls the card into view and applies the transient highlight', async () => {
    fetchMyInvitations.mockResolvedValue(INV);
    render(<MyInvitations focus onAnswered={() => undefined} />);
    const card = await screen.findByTestId('my-invitations');
    await waitFor(() => expect(scrollSpy).toHaveBeenCalled());
    expect(card.className).toMatch(/ring/); // the transient highlight is visible
  });

  it('without focus, nothing scrolls and no highlight applies', async () => {
    fetchMyInvitations.mockResolvedValue(INV);
    render(<MyInvitations onAnswered={() => undefined} />);
    await screen.findByTestId('my-invitations');
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('focus with nothing pending degrades plainly — no section, no scroll, no crash', async () => {
    fetchMyInvitations.mockResolvedValue([]);
    render(<MyInvitations focus onAnswered={() => undefined} />);
    await waitFor(() => expect(fetchMyInvitations).toHaveBeenCalled());
    expect(screen.queryByTestId('my-invitations')).toBeNull();
    expect(scrollSpy).not.toHaveBeenCalled();
  });

  it('a refreshNavigation event re-reads the invitations (the bell answered above this page)', async () => {
    fetchMyInvitations.mockResolvedValue(INV);
    render(<MyInvitations onAnswered={() => undefined} />);
    await screen.findByTestId('my-invitations');
    const before = fetchMyInvitations.mock.calls.length;
    act(() => {
      window.dispatchEvent(new Event('refreshNavigation'));
    });
    await waitFor(() =>
      expect(fetchMyInvitations.mock.calls.length).toBeGreaterThan(before),
    );
  });
});
