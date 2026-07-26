import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H033 (unit) — the preference matrix's component behaviour.
 *
 * WHY THIS FILE EXISTS. The integration suite proves the dispatcher; the E2E
 * proves the happy-path round-trip. Neither covers the panel's own logic, and
 * one branch in particular had **no coverage at all** before this file: the
 * **rollback path**. A failed PUT must visibly revert the toggle and say so —
 * that is the difference between an optimistic UI and one that quietly lies
 * about having saved. E2E cannot reach it without forcing a server failure, and
 * that belongs at the unit tier anyway (the pyramid rule).
 *
 * Also covered here, because each is a board decision rather than styling:
 *  - ND-2: a non-suppressible category renders locked-on WITH A REASON and
 *    offers no control to click (not a disabled mystery, not click-then-revert).
 *  - ND-3: a non-delivering channel gets NO toggle, and is named honestly.
 *  - The first-paint budget (ADR-U043 / ADR-U042): exactly ONE read, and no
 *    duplicate fetch across a re-render.
 */

const CELLS = [
  {
    category_key: 'membership',
    category_label: 'Group membership & invitations',
    interruption_grade: 'badge',
    member_suppressible: true,
    channel: 'in_app',
    channel_label: 'In the Hub',
    channel_delivers: true,
    allowed: true,
  },
  {
    category_key: 'membership',
    category_label: 'Group membership & invitations',
    interruption_grade: 'badge',
    member_suppressible: true,
    channel: 'email',
    channel_label: 'Email',
    channel_delivers: false,
    allowed: true,
  },
  {
    category_key: 'account',
    category_label: 'Account & participation state',
    interruption_grade: 'badge',
    member_suppressible: false,
    channel: 'in_app',
    channel_label: 'In the Hub',
    channel_delivers: true,
    allowed: true,
  },
  {
    category_key: 'account',
    category_label: 'Account & participation state',
    interruption_grade: 'badge',
    member_suppressible: false,
    channel: 'email',
    channel_label: 'Email',
    channel_delivers: false,
    allowed: true,
  },
];

import { NotificationPreferencesPanel } from '@/components/notifications/NotificationPreferencesPanel';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

const okRead = () =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ preferences: CELLS }),
  });

describe('NotificationPreferencesPanel (FEAT-H033)', () => {
  it('reads once on first paint and does not duplicate the fetch', async () => {
    fetchMock.mockImplementation(okRead);
    render(<NotificationPreferencesPanel />);

    await waitFor(() =>
      expect(screen.getByTestId('pref-toggle-membership-in_app')).toBeInTheDocument(),
    );

    // ADR-U042: one justified standalone read. The matrix is a rarely-visited
    // settings surface and deliberately NOT in the overview bundle — adding it
    // would tax every page load to serve one.
    const reads = fetchMock.mock.calls.filter(
      (c) => String(c[0]).includes('/api/notifications/preferences') && !c[1],
    );
    expect(reads).toHaveLength(1);
  });

  it('renders a non-suppressible category locked-on with a reason and no control', async () => {
    fetchMock.mockImplementation(okRead);
    render(<NotificationPreferencesPanel />);

    await waitFor(() =>
      expect(screen.getByTestId('pref-locked-account-in_app')).toBeInTheDocument(),
    );
    // No toggle at all — never offered, so never refused.
    expect(screen.queryByTestId('pref-toggle-account-in_app')).not.toBeInTheDocument();
    // Stated, not a disabled mystery.
    expect(screen.getByText(/always on/i)).toBeInTheDocument();
  });

  it('renders no toggle for a channel that does not deliver, and names it honestly', async () => {
    fetchMock.mockImplementation(okRead);
    render(<NotificationPreferencesPanel />);

    await waitFor(() =>
      expect(screen.getByTestId('pref-toggle-membership-in_app')).toBeInTheDocument(),
    );
    expect(screen.queryByTestId('pref-toggle-membership-email')).not.toBeInTheDocument();
    expect(screen.getByText(/not live yet/i)).toBeInTheDocument();
  });

  it('flips optimistically and sends the write', async () => {
    fetchMock.mockImplementation((url: unknown, init?: { method?: string }) =>
      init?.method === 'PUT'
        ? Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
        : okRead(),
    );
    render(<NotificationPreferencesPanel />);

    const toggle = await waitFor(() => screen.getByTestId('pref-toggle-membership-in_app'));
    expect(toggle).toBeChecked();

    await userEvent.click(toggle);

    await waitFor(() => expect(toggle).not.toBeChecked());
    const writes = fetchMock.mock.calls.filter(
      (c) => (c[1] as { method?: string } | undefined)?.method === 'PUT',
    );
    expect(writes).toHaveLength(1);
    expect(JSON.parse(String((writes[0][1] as { body: string }).body))).toEqual({
      category: 'membership',
      channel: 'in_app',
      allowed: false,
    });
  });

  it('ROLLS BACK VISIBLY and states the reason when the write is refused', async () => {
    // The branch no other tier reaches. A silent revert would be worse than an
    // error: the member would believe the change stuck.
    fetchMock.mockImplementation((url: unknown, init?: { method?: string }) =>
      init?.method === 'PUT'
        ? Promise.resolve({
            ok: false,
            status: 409,
            json: () => Promise.resolve({ error: 'This category cannot be switched off' }),
          })
        : okRead(),
    );
    render(<NotificationPreferencesPanel />);

    const toggle = await waitFor(() => screen.getByTestId('pref-toggle-membership-in_app'));
    await userEvent.click(toggle);

    // Reverted to its pre-click state...
    await waitFor(() => expect(toggle).toBeChecked());
    // ...and the member is told why, in the server's own words.
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /cannot be switched off/i,
    );
  });

  it('surfaces a failed read instead of rendering an empty matrix', async () => {
    fetchMock.mockImplementation(() => Promise.resolve({ ok: false, status: 500 }));
    render(<NotificationPreferencesPanel />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i);
    expect(screen.queryByTestId('pref-toggle-membership-in_app')).not.toBeInTheDocument();
  });
});
