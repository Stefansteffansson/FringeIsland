import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdminMemberDetail } from '@/components/admin/AdminMemberDetail';

/**
 * FEAT-H050 STORY-1/2/3/5 (ADR-U054, TASK-EML-02) — the rectification ceremony
 * on the member console.
 *
 * WRITTEN RED-FIRST: at head the address in the detail header is inert — no
 * control renders beside it, so every cell fails at `findByTestId`.
 *
 * The ceremony's job is to make invisible consequences visible BEFORE the
 * click (sessions end, invitations to the old address are deleted, no email is
 * sent to either address) and then to report what actually happened from the
 * contract's own counts.
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
const detail = (over: Partial<Detail> = {}): Detail => ({
  id: MEMBER_ID,
  display_name: 'Rolf Rowan',
  email: 'rolf@example.com',
  account_state: 'active',
  deactivation_origin: null,
  is_platform_admin: false,
  created_at: '2026-07-01T10:00:00+00:00',
  memberships: [],
  ...over,
});

const PAYLOAD = {
  success: true,
  previous_email: 'rolf@example.com',
  new_email: 'rolf.rowan@example.com',
  sessions_revoked: 2,
  invitations_deleted: 1,
};

const okDetail = (d: Detail) =>
  ({ ok: true, status: 200, json: async () => ({ detail: d, viewer_is_self: false }) }) as Response;
const okPayload = (p: unknown = PAYLOAD) =>
  ({ ok: true, status: 200, json: async () => p }) as Response;
const errResponse = (status: number, error: string) =>
  ({ ok: false, status, json: async () => ({ error }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const routeFetch = (d: Detail, post: () => Response = () => okPayload()) => {
  fetchMock.mockImplementation(async (_input, init) =>
    init?.method === 'POST' ? post() : okDetail(d),
  );
};

const openCeremony = async () => {
  await userEvent.click(await screen.findByTestId('rectify-email'));
  return screen.getByTestId('confirm-modal');
};

describe('AdminMemberDetail — email rectification (FEAT-H050)', () => {
  // ── STORY-1 ───────────────────────────────────────────────────────────────
  it('renders the control beside the address for a member who has one', async () => {
    routeFetch(detail());
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    expect(await screen.findByTestId('rectify-email')).toBeInTheDocument();
  });

  it('renders NO control when the member has no address — the contract refuses these', async () => {
    routeFetch(detail({ email: null }));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    await screen.findByText(/joined/i);
    expect(screen.queryByTestId('rectify-email')).not.toBeInTheDocument();
  });

  // ── STORY-2 ───────────────────────────────────────────────────────────────
  it('names the consequences before the click, and says no email is sent', async () => {
    routeFetch(detail());
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    const modal = await openCeremony();
    expect(modal).toHaveTextContent(/sessions will end/i);
    expect(modal).toHaveTextContent(/invitations/i);
    expect(modal).toHaveTextContent(/no email is sent/i);
  });

  it('shows the current address and gates Confirm on both a new address and a reason', async () => {
    routeFetch(detail());
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    const modal = await openCeremony();
    expect(modal).toHaveTextContent('rolf@example.com');

    const confirm = screen.getByTestId('confirm-modal-confirm');
    expect(confirm).toBeDisabled();

    await userEvent.type(within(modal).getByTestId('rectify-email-input'), 'rolf.rowan@example.com');
    expect(confirm).toBeDisabled(); // address alone is not enough

    await userEvent.type(within(modal).getByTestId('ceremony-reason'), 'Lost the mailbox');
    expect(confirm).toBeEnabled();
  });

  it('posts the address and reason to the rectification route', async () => {
    routeFetch(detail());
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    const modal = await openCeremony();
    await userEvent.type(within(modal).getByTestId('rectify-email-input'), 'rolf.rowan@example.com');
    await userEvent.type(within(modal).getByTestId('ceremony-reason'), 'Lost the mailbox');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      expect(post).toBeDefined();
      expect(String(post![0])).toContain(`/api/admin/users/${MEMBER_ID}/email`);
      expect(JSON.parse(String(post![1]!.body))).toEqual({
        email: 'rolf.rowan@example.com',
        reason: 'Lost the mailbox',
      });
    });
  });

  // ── STORY-3 ───────────────────────────────────────────────────────────────
  it('reports both addresses and both real counts from the payload', async () => {
    routeFetch(detail());
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    const modal = await openCeremony();
    await userEvent.type(within(modal).getByTestId('rectify-email-input'), 'rolf.rowan@example.com');
    await userEvent.type(within(modal).getByTestId('ceremony-reason'), 'Lost the mailbox');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    const success = await screen.findByTestId('action-success');
    expect(success).toHaveTextContent('rolf@example.com');
    expect(success).toHaveTextContent('rolf.rowan@example.com');
    expect(success).toHaveTextContent('2');
    expect(success).toHaveTextContent('1');
  });

  it('reports zero counts honestly rather than hiding them', async () => {
    routeFetch(detail(), () =>
      okPayload({ ...PAYLOAD, sessions_revoked: 0, invitations_deleted: 0 }),
    );
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    const modal = await openCeremony();
    await userEvent.type(within(modal).getByTestId('rectify-email-input'), 'rolf.rowan@example.com');
    await userEvent.type(within(modal).getByTestId('ceremony-reason'), 'Typo at signup');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    const success = await screen.findByTestId('action-success');
    expect(success).toHaveTextContent(/no sessions/i);
    expect(success).toHaveTextContent(/no pending invitations/i);
  });

  // ── STORY-5 ───────────────────────────────────────────────────────────────
  it('holds the ceremony open on a 409 collision, with the input intact', async () => {
    routeFetch(detail(), () => errResponse(409, 'That email address is already in use'));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    const modal = await openCeremony();
    await userEvent.type(within(modal).getByTestId('rectify-email-input'), 'taken@example.com');
    await userEvent.type(within(modal).getByTestId('ceremony-reason'), 'Lost the mailbox');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('ceremony-error')).toHaveTextContent(
        'That email address is already in use',
      );
    });
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(screen.getByTestId('rectify-email-input')).toHaveValue('taken@example.com');
  });

  it('holds the ceremony open on a 400 malformed-address refusal', async () => {
    routeFetch(detail(), () => errResponse(400, 'A valid email address is required'));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    const modal = await openCeremony();
    await userEvent.type(within(modal).getByTestId('rectify-email-input'), 'nope');
    await userEvent.type(within(modal).getByTestId('ceremony-reason'), 'Lost the mailbox');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => {
      expect(screen.getByTestId('ceremony-error')).toHaveTextContent(
        'A valid email address is required',
      );
    });
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
  });
});
