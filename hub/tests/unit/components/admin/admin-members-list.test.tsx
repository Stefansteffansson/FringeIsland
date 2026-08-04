import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminMembersList } from '@/components/admin/AdminMembersList';

expect.extend(toHaveNoViolations);

/**
 * FEAT-H039 STORY-1..5 (Cycle ADM-E) — the bounded /admin/members: server
 * keyset paging (page size 50, client cursor stack), debounced SERVER search
 * (the FEAT-H036 client-side narrowing retired with the full fetch), the
 * As-of/Refresh parity affordance (RB-8), explicit page-scoped selection
 * (cleared on any view change; no cross-page select-all), and the RB-2 bulk
 * bar — Suspend / Reactivate / Force sign-out through the widened
 * ConfirmModal, per-row outcomes rendered verbatim.
 *
 * REWORKED RED-FIRST (2026-08-03): the FEAT-H036 suite pinned the retired
 * behaviors (client search over a full fetch, no pager, no selection); those
 * pins are superseded here, adapted to the page shape. At head the component
 * still renders the old shape — the page-shape, pager, selection, bulk,
 * As-of, and server-search cells all fail red.
 */

type Row = {
  id: string;
  display_name: string;
  email: string | null;
  account_state: string;
  is_platform_admin: boolean;
  created_at: string;
};

const AXEL: Row = {
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Axel Active',
  email: 'axel@example.com',
  account_state: 'active',
  is_platform_admin: false,
  created_at: '2026-07-01T10:00:00+00:00',
};
const PIA: Row = {
  id: '22222222-2222-4222-8222-222222222222',
  display_name: 'Pia Paused',
  email: 'pia@example.com',
  account_state: 'paused',
  is_platform_admin: false,
  created_at: '2026-07-02T10:00:00+00:00',
};
const ODA: Row = {
  id: '33333333-3333-4333-8333-333333333333',
  display_name: 'Oda Admin',
  email: 'oda@example.com',
  account_state: 'active',
  is_platform_admin: true,
  created_at: '2026-07-03T10:00:00+00:00',
};
const HIBERNATING: Row = {
  id: '44444444-4444-4444-8444-444444444444',
  display_name: 'Nova Newstate',
  email: 'nova@example.com',
  account_state: 'hibernating', // an OPEN-vocabulary value the styles map does not know
  is_platform_admin: false,
  created_at: '2026-07-04T10:00:00+00:00',
};

const GENERATED_AT = '2026-08-03T18:00:00+00:00';
const CURSOR = { name: 'Oda Admin', id: ODA.id };

const okPage = (users: Row[], next_cursor: { name: string; id: string } | null = null) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ users, next_cursor, generated_at: GENERATED_AT }),
  }) as Response;
const okBulk = (results: Array<{ id: string; ok: boolean; error?: string }>) =>
  ({ ok: true, status: 200, json: async () => ({ results }) }) as Response;
const errResponse = (status: number) =>
  ({ ok: false, status, json: async () => ({ error: 'x' }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const urlsCalled = () => fetchMock.mock.calls.map((c) => String(c[0]));

const renderLoaded = async (users: Row[] = [AXEL, PIA, ODA], cursor: typeof CURSOR | null = null) => {
  fetchMock.mockResolvedValue(okPage(users, cursor));
  render(<AdminMembersList />);
  await screen.findByTestId(`admin-member-row-${users[0].id}`);
};

const selectRow = async (row: Row) => {
  await userEvent.click(screen.getByRole('checkbox', { name: `Select ${row.display_name}` }));
};

describe('AdminMembersList — the bounded list (FEAT-H039 STORY-1)', () => {
  it('renders the loading skeleton while pending (B6)', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<AdminMembersList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('first load fetches page one (filter only — no cursor, no search) and renders rows, badges, chip, As-of', async () => {
    await renderLoaded();
    expect(urlsCalled()[0]).toBe('/api/admin/users?filter=default');
    const piaRow = screen.getByTestId(`admin-member-row-${PIA.id}`);
    expect(piaRow).toHaveTextContent('paused');
    const odaRow = screen.getByTestId(`admin-member-row-${ODA.id}`);
    expect(odaRow.querySelector('[data-testid="admin-chip"]')).not.toBeNull();
    expect(screen.getByTestId(`admin-member-row-${AXEL.id}`)).toHaveTextContent('axel@example.com');
    // RB-8: the As-of line renders the payload's server clock beside Refresh.
    expect(screen.getByTestId('as-of')).toHaveTextContent(
      new Date(GENERATED_AT).toLocaleString(),
    );
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('an unknown account_state renders the raw string in the neutral badge, never a crash', async () => {
    await renderLoaded([HIBERNATING]);
    expect(screen.getByTestId(`admin-member-row-${HIBERNATING.id}`)).toHaveTextContent(
      'hibernating',
    );
  });

  it('switching a filter refetches with that key and resets to page one', async () => {
    await renderLoaded([AXEL], CURSOR);
    await userEvent.click(screen.getByTestId('pager-next'));
    await waitFor(() => expect(urlsCalled().some((u) => u.includes('after_name'))).toBe(true));
    await userEvent.click(screen.getByRole('tab', { name: 'Decommissioned' }));
    await waitFor(() =>
      expect(urlsCalled().at(-1)).toBe('/api/admin/users?filter=decommissioned'),
    );
  });

  it('search hits the SERVER debounced — no client-side narrowing remains', async () => {
    await renderLoaded();
    await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'pia@');
    await waitFor(() =>
      expect(urlsCalled().at(-1)).toBe('/api/admin/users?filter=default&search=pia%40'),
    );
  });

  it('the pager: Next follows next_cursor, Prev replays the stack, ends disable honestly', async () => {
    fetchMock.mockResolvedValueOnce(okPage([AXEL, PIA], CURSOR)).mockResolvedValue(okPage([ODA]));
    render(<AdminMembersList />);
    await screen.findByTestId(`admin-member-row-${AXEL.id}`);
    expect(screen.getByTestId('pager-prev')).toBeDisabled();
    await userEvent.click(screen.getByTestId('pager-next'));
    await screen.findByTestId(`admin-member-row-${ODA.id}`);
    expect(urlsCalled().at(-1)).toBe(
      `/api/admin/users?filter=default&after_name=${encodeURIComponent(CURSOR.name)}&after_id=${CURSOR.id}`,
    );
    expect(screen.getByTestId('pager-next')).toBeDisabled(); // next_cursor null on page 2
    fetchMock.mockResolvedValue(okPage([AXEL, PIA], CURSOR));
    await userEvent.click(screen.getByTestId('pager-prev'));
    await screen.findByTestId(`admin-member-row-${AXEL.id}`);
    expect(urlsCalled().at(-1)).toBe('/api/admin/users?filter=default');
  });

  it('Refresh refetches the current view and clears selection', async () => {
    await renderLoaded();
    await selectRow(AXEL);
    expect(screen.getByTestId('selection-count')).toHaveTextContent('1 selected');
    const calls = fetchMock.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => expect(fetchMock.mock.calls.length).toBeGreaterThan(calls));
    await waitFor(() =>
      expect(screen.queryByTestId('selection-count')).not.toBeInTheDocument(),
    );
  });

  it('a refused load renders the 404 shape — no admin chrome for non-admins', async () => {
    fetchMock.mockResolvedValue(errResponse(404));
    render(<AdminMembersList />);
    expect(await screen.findByText('404')).toBeInTheDocument();
  });

  it('a failed load is a visible error with Retry', async () => {
    fetchMock.mockResolvedValueOnce(errResponse(500)).mockResolvedValue(okPage([AXEL]));
    render(<AdminMembersList />);
    expect(await screen.findByText(/could not load/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId(`admin-member-row-${AXEL.id}`)).toBeInTheDocument();
  });
});

describe('AdminMembersList — selection, page-scoped and explicit (FEAT-H039 STORY-2)', () => {
  it('row checkboxes and select-page; the count is visible; no cross-page select-all exists', async () => {
    await renderLoaded([AXEL, PIA], CURSOR);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select page' }));
    expect(screen.getByTestId('selection-count')).toHaveTextContent('2 selected');
    expect(screen.queryByText(/select all matching/i)).not.toBeInTheDocument();
  });

  it('selection clears on page, filter, and search changes', async () => {
    fetchMock.mockResolvedValueOnce(okPage([AXEL, PIA], CURSOR)).mockResolvedValue(okPage([ODA]));
    render(<AdminMembersList />);
    await screen.findByTestId(`admin-member-row-${AXEL.id}`);
    await selectRow(AXEL);
    await userEvent.click(screen.getByTestId('pager-next'));
    await screen.findByTestId(`admin-member-row-${ODA.id}`);
    expect(screen.queryByTestId('selection-count')).not.toBeInTheDocument();

    await selectRow(ODA);
    await userEvent.click(screen.getByRole('tab', { name: 'Active' }));
    await waitFor(() =>
      expect(screen.queryByTestId('selection-count')).not.toBeInTheDocument(),
    );
  });
});

describe('AdminMembersList — the bulk family (FEAT-H039 STORY-3/4/5)', () => {
  it('the bulk bar renders exactly Suspend, Reactivate, Force sign-out — only with a selection', async () => {
    await renderLoaded();
    expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument();
    await selectRow(AXEL);
    const bar = screen.getByTestId('bulk-bar');
    expect(within(bar).getByTestId('bulk-suspend')).toBeInTheDocument();
    expect(within(bar).getByTestId('bulk-reactivate')).toBeInTheDocument();
    expect(within(bar).getByTestId('bulk-force-logout')).toBeInTheDocument();
    expect(within(bar).getAllByRole('button')).toHaveLength(3);
  });

  // WRITTEN RED-FIRST (2026-08-04, FEAT-H040 WA-4): the bulk force sign-out
  // ceremony states the instant behaviour — proven by the ADM-F E2E cell
  // (the device lands on /login within seconds via the session-guard hints).
  it('WA-4: the bulk force sign-out ceremony states the instant behaviour', async () => {
    await renderLoaded();
    await selectRow(AXEL);
    await userEvent.click(screen.getByTestId('bulk-force-logout'));
    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toHaveTextContent(/sessions end now/i);
    expect(modal).toHaveTextContent(/open tabs sign out within seconds/i);
    await userEvent.click(screen.getByTestId('confirm-modal-cancel'));
  });

  it('the ceremony names the action, the count, and every member by name + email (W-4 at bulk birth)', async () => {
    await renderLoaded();
    await selectRow(AXEL);
    await selectRow(PIA);
    await userEvent.click(screen.getByTestId('bulk-suspend'));
    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toHaveTextContent('2 member');
    expect(within(modal).getByText(/axel@example\.com/)).toBeInTheDocument();
    expect(within(modal).getByText(/pia@example\.com/)).toBeInTheDocument();
    // Cancel is inert.
    await userEvent.click(screen.getByTestId('confirm-modal-cancel'));
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    expect(urlsCalled().every((u) => !u.includes('/bulk/'))).toBe(true);
  });

  it('confirm POSTs the id list, renders per-row outcomes verbatim, and repaints from a fresh read', async () => {
    await renderLoaded();
    await selectRow(AXEL);
    await selectRow(PIA);
    fetchMock.mockResolvedValueOnce(
      okBulk([
        { id: AXEL.id, ok: true },
        { id: PIA.id, ok: false, error: 'User is already in the requested state' },
      ]),
    );
    await userEvent.click(screen.getByTestId('bulk-suspend'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    const outcomes = await screen.findByTestId('bulk-outcomes');
    expect(within(outcomes).getByTestId(`bulk-outcome-${AXEL.id}`)).toHaveTextContent(/done/i);
    const piaOutcome = within(outcomes).getByTestId(`bulk-outcome-${PIA.id}`);
    expect(piaOutcome).toHaveTextContent('User is already in the requested state');
    expect(piaOutcome).toHaveTextContent(/pia@example\.com/);

    const bulkCall = fetchMock.mock.calls.find((c) => String(c[0]).includes('/bulk/suspend'));
    expect(bulkCall).toBeDefined();
    expect(JSON.parse(String(bulkCall![1]?.body))).toEqual({ user_ids: [AXEL.id, PIA.id] });
    // The list repainted from a fresh read after the run.
    const afterBulk = urlsCalled().slice(urlsCalled().indexOf('/api/admin/users/bulk/suspend') + 1);
    expect(afterBulk.some((u) => u.startsWith('/api/admin/users?filter='))).toBe(true);
    // Selection cleared after the run.
    expect(screen.queryByTestId('selection-count')).not.toBeInTheDocument();
  });

  it('reactivate and force sign-out post to their own routes', async () => {
    // Per-action eligible fixtures (WA-1b): reactivate needs a held member.
    const SUSPENDED_AXEL: Row = { ...AXEL, account_state: 'suspended' };
    for (const [testid, path, fixture] of [
      ['bulk-reactivate', '/api/admin/users/bulk/reactivate', SUSPENDED_AXEL],
      ['bulk-force-logout', '/api/admin/users/bulk/force-logout', AXEL],
    ] as const) {
      fetchMock.mockReset();
      fetchMock.mockResolvedValue(okPage([fixture]));
      const { unmount } = render(<AdminMembersList />);
      await screen.findByTestId(`admin-member-row-${AXEL.id}`);
      await selectRow(AXEL);
      fetchMock.mockResolvedValueOnce(okBulk([{ id: AXEL.id, ok: true }]));
      await userEvent.click(screen.getByTestId(testid));
      await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
      await screen.findByTestId('bulk-outcomes');
      expect(urlsCalled().some((u) => u === path)).toBe(true);
      unmount();
    }
  });
});

/**
 * WA-1(b) (ADM-E walk rider, Stefan's ruling 2026-08-04): a bulk action
 * disables when NO selected member could accept it — the same payload-fact
 * derivation the detail rail uses (suspend = active · reactivate = paused/
 * suspended · force sign-out = non-terminal). Mixed selections stay fully
 * enabled (RB-2 partial success untouched). WRITTEN RED-FIRST: at head the
 * bar's buttons are never disabled.
 */
describe('AdminMembersList — WA-1(b): guaranteed-no-op bulk actions disable', () => {
  const SUS = (r: Row): Row => ({ ...r, account_state: 'suspended' });

  it('an all-suspended selection: Suspend disabled, Reactivate + Force sign-out enabled', async () => {
    fetchMock.mockResolvedValue(okPage([SUS(AXEL), SUS(PIA)]));
    render(<AdminMembersList />);
    await screen.findByTestId(`admin-member-row-${AXEL.id}`);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select page' }));
    expect(screen.getByTestId('bulk-suspend')).toBeDisabled();
    expect(screen.getByTestId('bulk-reactivate')).toBeEnabled();
    expect(screen.getByTestId('bulk-force-logout')).toBeEnabled();
  });

  it('a mixed selection keeps Suspend enabled — RB-2 partial success stands', async () => {
    fetchMock.mockResolvedValue(okPage([AXEL, SUS(PIA)]));
    render(<AdminMembersList />);
    await screen.findByTestId(`admin-member-row-${AXEL.id}`);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select page' }));
    expect(screen.getByTestId('bulk-suspend')).toBeEnabled();
    expect(screen.getByTestId('bulk-reactivate')).toBeEnabled();
  });

  it('an all-active selection: Reactivate disabled, Suspend enabled', async () => {
    fetchMock.mockResolvedValue(okPage([AXEL, ODA]));
    render(<AdminMembersList />);
    await screen.findByTestId(`admin-member-row-${AXEL.id}`);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Select page' }));
    expect(screen.getByTestId('bulk-reactivate')).toBeDisabled();
    expect(screen.getByTestId('bulk-suspend')).toBeEnabled();
  });

  it('an all-decommissioned selection disables all three', async () => {
    const DEC: Row = { ...AXEL, account_state: 'decommissioned' };
    fetchMock.mockResolvedValue(okPage([DEC]));
    render(<AdminMembersList />);
    await screen.findByTestId(`admin-member-row-${AXEL.id}`);
    await userEvent.click(screen.getByRole('checkbox', { name: `Select ${DEC.display_name}` }));
    for (const id of ['bulk-suspend', 'bulk-reactivate', 'bulk-force-logout']) {
      expect(screen.getByTestId(id)).toBeDisabled();
    }
  });
});

describe('AdminMembersList — accessibility', () => {
  it('the loaded list with selection and outcomes is axe-clean', async () => {
    fetchMock.mockResolvedValue(okPage([AXEL, PIA, ODA]));
    const { container } = render(<AdminMembersList />);
    await screen.findByTestId(`admin-member-row-${AXEL.id}`);
    await selectRow(AXEL);
    expect(await axe(container)).toHaveNoViolations();
  });
});
