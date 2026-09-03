import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminMemberDetail } from '@/components/admin/AdminMemberDetail';

/**
 * FEAT-H049 STORY-1 (DB-4, ADM-9 amended) — the member Suspend / Reactivate
 * ceremonies require a member-facing reason: the `ceremony-reason` field
 * labelled "Shown to the member", Confirm disabled until non-blank, the route
 * receives `{ reason }`, and a 400 (the contract's 22023) renders in place
 * with the modal still open.
 * WRITTEN RED-FIRST (2026-09-03): neither ceremony renders a reason field at
 * head; Confirm is enabled immediately and the POST carries no body.
 */
type Detail = {
  id: string;
  display_name: string;
  email: string | null;
  account_state: string;
  deactivation_origin: string | null;
  is_platform_admin: boolean;
  created_at: string;
  memberships: { group_id: string; group_name: string; status: string; removal_scenario: string }[];
};

const MEMBER_ID = '55555555-5555-4555-8555-555555555555';
const detail = (account_state: string): Detail => ({
  id: MEMBER_ID,
  display_name: 'Rolf Rowan',
  email: 'rolf@example.com',
  account_state,
  deactivation_origin: account_state === 'active' ? null : 'admin',
  is_platform_admin: false,
  created_at: '2026-07-01T10:00:00+00:00',
  memberships: [],
});

const okDetail = (d: Detail) =>
  ({ ok: true, status: 200, json: async () => ({ detail: d, viewer_is_self: false }) }) as Response;
const okEmpty = () => ({ ok: true, status: 200, json: async () => ({}) }) as Response;
const errResponse = (status: number, error: string) =>
  ({ ok: false, status, json: async () => ({ error }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const routeFetch = (d: Detail, post: () => Response = okEmpty) => {
  fetchMock.mockImplementation(async (_input, init) => (init?.method === 'POST' ? post() : okDetail(d)));
};

describe('AdminMemberDetail — Suspend / Reactivate require the reason (FEAT-H049 STORY-1)', () => {
  it.each([
    ['suspend', 'active', 'suspend-member'],
    ['reactivate', 'suspended', 'reactivate-member'],
  ] as const)('%s: reason field "Shown to the member", Confirm gated, POST { reason }', async (path, state, button) => {
    routeFetch(detail(state));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    await userEvent.click(await screen.findByTestId(button));
    const modal = screen.getByTestId('confirm-modal');
    const field = within(modal).getByTestId('ceremony-reason');
    expect(field).toHaveAccessibleName('Shown to the member');
    expect(screen.getByTestId('confirm-modal-confirm')).toBeDisabled();
    await userEvent.type(field, 'Terms breach');
    expect(screen.getByTestId('confirm-modal-confirm')).toBeEnabled();
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      expect(postCall?.[0]).toBe(`/api/admin/users/${MEMBER_ID}/${path}`);
      expect(JSON.parse(postCall?.[1]?.body as string)).toEqual({ reason: 'Terms breach' });
    });
  });

  it("a 400 (the contract's 22023) renders in place and the modal stays open", async () => {
    routeFetch(detail('active'), () => errResponse(400, 'Reason required'));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    await userEvent.click(await screen.findByTestId('suspend-member'));
    await userEvent.type(screen.getByTestId('ceremony-reason'), 'x');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(screen.getByTestId('ceremony-error')).toHaveTextContent('Reason required'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
  });

  it('the other ceremonies (decommission, force sign-out) carry no reason field — untouched (labelled pin)', async () => {
    routeFetch(detail('active'));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    await userEvent.click(await screen.findByTestId('decommission-member'));
    expect(screen.queryByTestId('ceremony-reason')).not.toBeInTheDocument();
    expect(screen.getByTestId('confirm-modal-confirm')).toBeEnabled();
  });
});
