import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminGroupDetail } from '@/components/admin/AdminGroupDetail';

/**
 * FEAT-H049 STORY-1 (DB-4, ADM-3 amended) — the four admin group hold
 * ceremonies (Rest / Wake / Suspend / Reactivate) require a member-facing
 * reason: the ConfirmModal renders the H041 `ceremony-reason` field labelled
 * "Shown to the group's members", Confirm is disabled until it is non-blank,
 * the route receives `{ reason }`, and a 400 (the contract's 22023) renders
 * in place with the modal still open.
 * WRITTEN RED-FIRST (2026-09-03): no ceremony renders a reason field at head;
 * Confirm is enabled immediately and the POST carries no body.
 */
type Detail = {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  group_type: string;
  status: string;
  is_public: boolean;
  avatar_url: string | null;
  member_count: number;
  non_system_member_count: number;
  deusex_stewarded: boolean;
  stewards: { display_name: string; personal_group_id: string }[];
  members: {
    personal_group_id: string;
    display_name: string;
    email: string | null;
    user_id: string | null;
    is_steward: boolean;
  }[];
  created_at: string;
  updated_at: string;
};

const GROUP_ID = '44444444-4444-4444-8444-444444444444';
const detail = (status: string): Detail => ({
  id: GROUP_ID,
  name: 'Harbour Circle',
  description: null,
  label: null,
  group_type: 'engagement',
  status,
  is_public: false,
  avatar_url: null,
  member_count: 1,
  non_system_member_count: 1,
  deusex_stewarded: false,
  stewards: [{ display_name: 'Stella', personal_group_id: 'aaaa1111-1111-4111-8111-111111111111' }],
  members: [
    {
      personal_group_id: 'aaaa1111-1111-4111-8111-111111111111',
      display_name: 'Stella',
      email: 'stella@example.test',
      user_id: 'ee111111-1111-4111-8111-111111111111',
      is_steward: true,
    },
  ],
  created_at: '2026-07-01T10:00:00+00:00',
  updated_at: '2026-07-30T10:00:00+00:00',
});

const okDetail = (d: Detail) => ({ ok: true, status: 200, json: async () => ({ detail: d }) }) as Response;
const okEmpty = () => ({ ok: true, status: 200, json: async () => ({}) }) as Response;
const errResponse = (status: number, error: string) =>
  ({ ok: false, status, json: async () => ({ error }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

/** Detail reads answer with `d`; the POST answers with `post`. Mocks are
 *  wing-aware (a suspended detail mounts the H041 wing, which reads too). */
const routeFetch = (d: Detail, post: () => Response = okEmpty) => {
  fetchMock.mockImplementation(async (input, init) => {
    if (init?.method === 'POST') return post();
    const url = String(input);
    if (url === `/api/admin/groups/${GROUP_ID}`) return okDetail(d);
    return ({ ok: true, status: 200, json: async () => ({ members: [], posts: [], announcements: [], conversations: [], threads: [] }) }) as Response;
  });
};

const CEREMONIES = [
  ['rest', 'active', 'rest-group'],
  ['suspend', 'active', 'suspend-group'],
  ['wake', 'resting', 'wake-group'],
  ['reactivate', 'suspended', 'reactivate-group'],
] as const;

describe('AdminGroupDetail — the hold ceremonies require the reason (FEAT-H049 STORY-1)', () => {
  it.each(CEREMONIES)(
    '%s: the modal renders the member-facing reason field, Confirm disabled until non-blank, and POSTs { reason }',
    async (path, status, button) => {
      routeFetch(detail(status));
      render(<AdminGroupDetail groupId={GROUP_ID} />);
      await userEvent.click(await screen.findByTestId(button));
      const modal = screen.getByTestId('confirm-modal');
      const field = within(modal).getByTestId('ceremony-reason');
      expect(field).toHaveAccessibleName("Shown to the group's members");
      expect(screen.getByTestId('confirm-modal-confirm')).toBeDisabled();
      await userEvent.type(field, '   ');
      expect(screen.getByTestId('confirm-modal-confirm')).toBeDisabled();
      await userEvent.type(field, 'Repeated harassment reports');
      expect(screen.getByTestId('confirm-modal-confirm')).toBeEnabled();
      await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
      await waitFor(() => {
        const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
        expect(postCall?.[0]).toBe(`/api/admin/groups/${GROUP_ID}/${path}`);
        expect(JSON.parse(postCall?.[1]?.body as string)).toEqual({ reason: '   Repeated harassment reports' });
      });
    },
  );

  it('a 400 from the route (the contract\'s 22023) renders in place and the modal stays open', async () => {
    routeFetch(detail('active'), () => errResponse(400, 'Reason required'));
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    await userEvent.click(await screen.findByTestId('suspend-group'));
    await userEvent.type(screen.getByTestId('ceremony-reason'), 'x');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(screen.getByTestId('ceremony-error')).toHaveTextContent('Reason required'));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByTestId('ceremony-reason')).toHaveValue('x');
  });

  it('any other refusal keeps the H035 shape: the modal closes and the page-level error renders (labelled pin)', async () => {
    routeFetch(detail('active'), () => errResponse(409, 'cannot suspend a group that is not active or resting'));
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    await userEvent.click(await screen.findByTestId('suspend-group'));
    await userEvent.type(screen.getByTestId('ceremony-reason'), 'x');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(await screen.findByTestId('action-error')).toHaveTextContent(/not active or resting/);
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
  });
});
