import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminMembersList } from '@/components/admin/AdminMembersList';

/**
 * FEAT-H049 (DB-4) — the BULK suspend/reactivate ceremony carries ONE
 * member-facing reason for the batch ("Shown to each member"), because the
 * FEAT-PC030 contract refuses admin_update_user_status without one. A
 * decomposition gap found at build: FEAT-H049 names the six single ceremonies
 * and not the H039 bulk bar, which composes the same contract. Force sign-out
 * carries no reason (its contract is unchanged).
 * WRITTEN RED-FIRST (2026-09-03): the bulk modal has no reason field at head
 * and the POST body is `{ user_ids }` alone.
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
const SUSPENDED_AXEL: Row = { ...AXEL, account_state: 'suspended' };

const okPage = (users: Row[]) =>
  ({
    ok: true,
    status: 200,
    json: async () => ({ users, next_cursor: null, generated_at: '2026-09-03T10:00:00+00:00' }),
  }) as Response;
const okBulk = (results: Array<{ id: string; ok: boolean; error?: string }>) =>
  ({ ok: true, status: 200, json: async () => ({ results }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const renderWith = async (row: Row) => {
  fetchMock.mockImplementation(async (input, init) =>
    init?.method === 'POST' || String(input).includes('/bulk/') ? okBulk([{ id: row.id, ok: true }]) : okPage([row]),
  );
  render(<AdminMembersList />);
  await screen.findByTestId(`admin-member-row-${row.id}`);
  await userEvent.click(screen.getByRole('checkbox', { name: `Select ${row.display_name}` }));
};

describe('AdminMembersList — the bulk hold ceremony carries one reason (FEAT-H049, bulk gap)', () => {
  it.each([
    ['bulk-suspend', 'suspend', AXEL],
    ['bulk-reactivate', 'reactivate', SUSPENDED_AXEL],
  ] as const)('%s: reason field "Shown to each member", Confirm gated, POST { user_ids, reason }', async (button, action, row) => {
    await renderWith(row);
    await userEvent.click(screen.getByTestId(button));
    const modal = screen.getByTestId('confirm-modal');
    const field = within(modal).getByTestId('ceremony-reason');
    expect(field).toHaveAccessibleName('Shown to each member');
    expect(screen.getByTestId('confirm-modal-confirm')).toBeDisabled();
    await userEvent.type(field, 'Batch hold');
    expect(screen.getByTestId('confirm-modal-confirm')).toBeEnabled();
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await screen.findByTestId('bulk-outcomes');
    await waitFor(() => {
      const bulkCall = fetchMock.mock.calls.find((c) => String(c[0]).endsWith(`/api/admin/users/bulk/${action}`));
      expect(bulkCall).toBeDefined();
      expect(JSON.parse(String(bulkCall![1]?.body))).toEqual({ user_ids: [row.id], reason: 'Batch hold' });
    });
  });

  it('bulk force sign-out carries no reason field and confirms as before (labelled pin)', async () => {
    await renderWith(AXEL);
    await userEvent.click(screen.getByTestId('bulk-force-logout'));
    expect(screen.queryByTestId('ceremony-reason')).not.toBeInTheDocument();
    expect(screen.getByTestId('confirm-modal-confirm')).toBeEnabled();
  });
});
