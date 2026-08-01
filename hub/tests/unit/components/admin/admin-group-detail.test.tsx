import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminGroupDetail } from '@/components/admin/AdminGroupDetail';

expect.extend(toHaveNoViolations);

/**
 * FEAT-H035 STORY-2/3/4 — admin group detail: state-appropriate actions,
 * the suspend/reactivate ceremonies, the reassign-out-of-caretakership
 * picker. WRITTEN RED-FIRST (2026-08-01): AdminGroupDetail does not exist
 * at head; every case fails on the missing component before implementation.
 *
 * State-honesty note (recorded in the spec's implementation notes): Reassign
 * renders ONLY on caretaker groups — the platform contract refuses
 * non-caretaker groups (P0001), and the surface never offers what the
 * contract will refuse. STORY-2's "active groups show Suspend and Reassign"
 * line reads through that rule.
 */

type Member = { personal_group_id: string; display_name: string; is_steward: boolean };
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
  members: Member[];
  created_at: string;
  updated_at: string;
};

const GROUP_ID = '44444444-4444-4444-8444-444444444444';

const baseDetail: Detail = {
  id: GROUP_ID,
  name: 'Harbour Circle',
  description: null,
  label: null,
  group_type: 'engagement',
  status: 'active',
  is_public: false,
  avatar_url: null,
  member_count: 2,
  non_system_member_count: 2,
  deusex_stewarded: false,
  stewards: [
    { display_name: 'Stella', personal_group_id: 'aaaa1111-1111-4111-8111-111111111111' },
    { display_name: 'Mona', personal_group_id: 'bbbb2222-2222-4222-8222-222222222222' },
  ],
  members: [
    { personal_group_id: 'aaaa1111-1111-4111-8111-111111111111', display_name: 'Stella', is_steward: true },
    { personal_group_id: 'bbbb2222-2222-4222-8222-222222222222', display_name: 'Mona', is_steward: true },
  ],
  created_at: '2026-07-01T10:00:00+00:00',
  updated_at: '2026-07-30T10:00:00+00:00',
};

const caretakerDetail: Detail = {
  ...baseDetail,
  name: 'Driftwood Cohort',
  member_count: 2,
  non_system_member_count: 1,
  deusex_stewarded: true,
  stewards: [],
  members: [
    { personal_group_id: 'cccc3333-3333-4333-8333-333333333333', display_name: 'Hilda', is_steward: false },
  ],
};

const okDetail = (d: Detail) =>
  ({ ok: true, status: 200, json: async () => ({ detail: d }) }) as Response;
const okEmpty = () => ({ ok: true, status: 200, json: async () => ({}) }) as Response;
const errResponse = (status: number, error = 'x') =>
  ({ ok: false, status, json: async () => ({ error }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('AdminGroupDetail (FEAT-H035 STORY-2/3/4)', () => {
  it('renders the loading skeleton while pending (B6)', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('an active human-stewarded group: name, no status badge, both steward names, Suspend rendered, Reactivate and Reassign NOT rendered', async () => {
    fetchMock.mockResolvedValue(okDetail(baseDetail));
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    expect(await screen.findByRole('heading', { name: 'Harbour Circle' })).toBeInTheDocument();
    expect(screen.queryByTestId('status-badge')).not.toBeInTheDocument();
    expect(screen.getByText('Stella')).toBeInTheDocument();
    expect(screen.getByText('Mona')).toBeInTheDocument();
    expect(screen.getByTestId('suspend-group')).toBeInTheDocument();
    expect(screen.queryByTestId('reactivate-group')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reassign-stewardship')).not.toBeInTheDocument();
    expect(screen.queryByTestId('caretaker-banner')).not.toBeInTheDocument();
  });

  it('a caretaker group: banner reframing Reassign as handing back, Reassign rendered, empty steward list carried by the banner', async () => {
    fetchMock.mockResolvedValue(okDetail(caretakerDetail));
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    expect(await screen.findByTestId('caretaker-banner')).toHaveTextContent(/hand .* back to a member/i);
    expect(screen.getByTestId('reassign-stewardship')).toBeInTheDocument();
    expect(screen.getByTestId('suspend-group')).toBeInTheDocument();
  });

  it('a suspended group: badge shows, Reactivate rendered, Suspend NOT rendered', async () => {
    fetchMock.mockResolvedValue(okDetail({ ...baseDetail, status: 'suspended' }));
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    expect(await screen.findByTestId('status-badge')).toHaveTextContent('suspended');
    expect(screen.getByTestId('reactivate-group')).toBeInTheDocument();
    expect(screen.queryByTestId('suspend-group')).not.toBeInTheDocument();
  });

  it('a closed group renders no lifecycle actions (state honesty — the platform refuses anyway)', async () => {
    fetchMock.mockResolvedValue(okDetail({ ...baseDetail, status: 'closed' }));
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    expect(await screen.findByTestId('status-badge')).toHaveTextContent('closed');
    expect(screen.queryByTestId('suspend-group')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reactivate-group')).not.toBeInTheDocument();
    expect(screen.queryByTestId('reassign-stewardship')).not.toBeInTheDocument();
  });

  it('the suspend ceremony: ConfirmModal names the group and the consequence; confirm POSTs then repaints from a fresh read', async () => {
    fetchMock
      .mockResolvedValueOnce(okDetail(baseDetail)) // mount read
      .mockResolvedValueOnce(okEmpty()) // POST suspend
      .mockResolvedValueOnce(okDetail({ ...baseDetail, status: 'suspended' })); // fresh read
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    await userEvent.click(await screen.findByTestId('suspend-group'));
    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toHaveTextContent('Harbour Circle');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][0]).toBe(`/api/admin/groups/${GROUP_ID}/suspend`);
    expect(fetchMock.mock.calls[1][1]?.method).toBe('POST');
    expect(await screen.findByTestId('status-badge')).toHaveTextContent('suspended');
  });

  it('a refused mutation surfaces the typed reason visibly and repaints honestly (never optimistic-only)', async () => {
    fetchMock
      .mockResolvedValueOnce(okDetail(baseDetail))
      .mockResolvedValueOnce(errResponse(409, 'cannot suspend a group that is not active'))
      .mockResolvedValueOnce(okDetail(baseDetail));
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    await userEvent.click(await screen.findByTestId('suspend-group'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    expect(await screen.findByTestId('action-error')).toHaveTextContent(
      'cannot suspend a group that is not active',
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3)); // the honest repaint read
  });

  it('the reassign picker offers exactly the active human non-steward members; confirm POSTs the chosen member and repaints', async () => {
    fetchMock
      .mockResolvedValueOnce(okDetail(caretakerDetail))
      .mockResolvedValueOnce(okEmpty()) // POST reassign
      .mockResolvedValueOnce(
        okDetail({
          ...caretakerDetail,
          deusex_stewarded: false,
          stewards: [{ display_name: 'Hilda', personal_group_id: 'cccc3333-3333-4333-8333-333333333333' }],
          members: [
            { personal_group_id: 'cccc3333-3333-4333-8333-333333333333', display_name: 'Hilda', is_steward: true },
          ],
        }),
      );
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    await userEvent.click(await screen.findByTestId('reassign-stewardship'));
    const picker = screen.getByTestId('reassign-picker');
    await userEvent.selectOptions(picker, 'cccc3333-3333-4333-8333-333333333333');
    await userEvent.click(screen.getByTestId('reassign-confirm'));
    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toHaveTextContent('Hilda');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(fetchMock.mock.calls[1][0]).toBe(`/api/admin/groups/${GROUP_ID}/reassign`);
    expect(JSON.parse(fetchMock.mock.calls[1][1]?.body as string)).toEqual({
      newStewardGroupId: 'cccc3333-3333-4333-8333-333333333333',
    });
    await waitFor(() =>
      expect(screen.queryByTestId('caretaker-banner')).not.toBeInTheDocument(),
    );
  });

  it('a caretaker group with no eligible members states that honestly instead of an empty dropdown', async () => {
    fetchMock.mockResolvedValue(okDetail({ ...caretakerDetail, members: [] }));
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    await userEvent.click(await screen.findByTestId('reassign-stewardship'));
    expect(screen.getByTestId('reassign-no-candidates')).toBeInTheDocument();
    expect(screen.queryByTestId('reassign-picker')).not.toBeInTheDocument();
  });

  it('renders the 404 shape when the platform refuses', async () => {
    fetchMock.mockResolvedValue(errResponse(404));
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    expect(await screen.findByText(/could not be found/i)).toBeInTheDocument();
  });

  it('renders a visible error with Retry on a failed load', async () => {
    fetchMock.mockResolvedValueOnce(errResponse(500)).mockResolvedValueOnce(okDetail(baseDetail));
    render(<AdminGroupDetail groupId={GROUP_ID} />);
    await userEvent.click(await screen.findByRole('button', { name: /retry/i }));
    expect(await screen.findByRole('heading', { name: 'Harbour Circle' })).toBeInTheDocument();
  });

  it('loaded detail state is axe-clean', async () => {
    fetchMock.mockResolvedValue(okDetail(caretakerDetail));
    const { container } = render(<AdminGroupDetail groupId={GROUP_ID} />);
    await screen.findByRole('heading', { name: 'Driftwood Cohort' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
