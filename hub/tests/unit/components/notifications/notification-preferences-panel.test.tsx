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

/** A fetch stand-in: the panel reads only `ok`, `status` and `json()` off a
 *  response, so the stub carries just those (never a full `Response`). */
type FetchStub = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number; json?: () => Promise<unknown> }>;
const fetchMock = jest.fn<FetchStub>();

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

  // Gate walk 2026-07-30 — W-08's sibling, and the same bug exactly.
  //
  // The locked-on explanation read "Always on — these tell you about your own
  // account and access." That sentence was written for the ONE non-suppressible
  // category that existed when it was written (`account`). GB-3 then made `asks`
  // the second, and it silently inherited the copy — so "Questions waiting for
  // your answer" told the member it was about their account and access, which it
  // is not.
  //
  // The fix does NOT add a category -> sentence map: this file's own law is that
  // it renders entirely from the payload and holds no category list. The line is
  // instead true of every non-suppressible category. The category-specific WHY
  // belongs in the registry beside `member_suppressible`, server-authored — a
  // contract change, recorded rather than smuggled in here.
  it('the locked-on explanation is true of any non-suppressible category, not just account', async () => {
    fetchMock.mockImplementation(okRead);
    render(<NotificationPreferencesPanel />);

    await waitFor(() =>
      expect(screen.getByTestId('pref-toggle-membership-in_app')).toBeInTheDocument(),
    );

    const locked = screen.getAllByText(/always on/i);
    expect(locked.length).toBeGreaterThan(0);
    for (const el of locked) {
      const text = el.textContent ?? '';
      // The claim that broke: not every locked category is about account access.
      expect(text).not.toMatch(/your own account and access/i);
      // Still explains itself rather than being a bare disabled control.
      // Curly apostrophe is intentional in the copy — match either form.
      expect(text).toMatch(/can(no|['’])?t be (switched|turned) off/i);
    }
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

  // W-08 (gate walk 2026-07-27) — the sentence refuted itself inside one clause:
  // there is "nothing to switch", and then "your choice" is promised forward.
  // The member has made no email choice, so the referent was empty and read as
  // pointing at an email setting they could not find. The referent that IS real
  // is the category switches above, which will govern email when it ships.
  it('the non-delivering-channel line names WHICH choice carries forward — the category switches, not a setting the member never made', async () => {
    fetchMock.mockImplementation(okRead);
    render(<NotificationPreferencesPanel />);

    const line = await screen.findByTestId('undelivered-channel-note');

    // The empty referent is gone.
    expect(line.textContent ?? '').not.toMatch(/your choice/i);
    // What carries forward is named: the switches on this page.
    expect(line.textContent ?? '').toMatch(/choices?\s+(above|on this page)|these switches/i);
    // The honest facts the line already got right are kept.
    expect(line.textContent ?? '').toMatch(/email/i);
    expect(line.textContent ?? '').toMatch(/not live yet|isn't live yet|is not live yet/i);
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

  // Gate walk 2026-07-30. The rollback above was already right; this is about
  // what it SAYS when there is no server sentence to quote. Going offline and
  // flipping a switch put the raw browser string "Failed to fetch" in the
  // banner — an internal, where an explanation belongs.
  it('a request that never reached the server rolls back and explains itself in words, not "Failed to fetch"', async () => {
    fetchMock.mockImplementation((url: unknown, init?: { method?: string }) =>
      init?.method === 'PUT'
        ? Promise.reject(new TypeError('Failed to fetch'))
        : okRead(),
    );
    render(<NotificationPreferencesPanel />);

    const toggle = await waitFor(() => screen.getByTestId('pref-toggle-membership-in_app'));
    await userEvent.click(toggle);

    await waitFor(() => expect(toggle).toBeChecked());
    const alert = await screen.findByRole('alert');
    expect(alert.textContent ?? '').not.toMatch(/failed to fetch/i);
    expect(alert).toHaveTextContent(/could not reach the server/i);
    expect(alert).toHaveTextContent(/put back/i);
  });

  it('surfaces a failed read instead of rendering an empty matrix', async () => {
    fetchMock.mockImplementation(() => Promise.resolve({ ok: false, status: 500 }));
    render(<NotificationPreferencesPanel />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i);
    expect(screen.queryByTestId('pref-toggle-membership-in_app')).not.toBeInTheDocument();
  });
});
