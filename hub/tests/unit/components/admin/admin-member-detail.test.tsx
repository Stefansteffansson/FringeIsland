import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminMemberDetail } from '@/components/admin/AdminMemberDetail';

expect.extend(toHaveNoViolations);

/**
 * FEAT-H036 STORY-2/3/4/5/6 — /admin/members/[id]: detail with the
 * state-honest action rail, nine mutation ceremonies, and the memberships
 * panel with per-row Remove. WRITTEN RED-FIRST (2026-08-01): AdminMemberDetail
 * does not exist at head; every case fails on the missing component.
 *
 * State honesty: the rail derives from PAYLOAD FACTS ONLY (account_state,
 * is_platform_admin, deactivation_origin, memberships[].removal_scenario) —
 * no client-side lifecycle recomputation; the surface never offers what the
 * contract will refuse. Every mutation repaints from a fresh read; refusals
 * surface the platform's message verbatim (409 body passes through).
 */

type Membership = {
  group_id: string;
  group_name: string;
  status: string;
  removal_scenario: string;
};
type Detail = {
  id: string;
  display_name: string;
  email: string | null;
  account_state: string;
  deactivation_origin: string | null;
  is_platform_admin: boolean;
  created_at: string;
  memberships: Membership[];
};

const MEMBER_ID = '55555555-5555-4555-8555-555555555555';
const G_LEAVE = 'aaaa1111-1111-4111-8111-111111111111';
const G_HANDOVER = 'bbbb2222-2222-4222-8222-222222222222';
const G_CLOSURE = 'cccc3333-3333-4333-8333-333333333333';

const MEMBERSHIPS: Membership[] = [
  { group_id: G_LEAVE, group_name: 'Harbour Circle', status: 'active', removal_scenario: 'regular_leave' },
  { group_id: G_HANDOVER, group_name: 'Driftwood Cohort', status: 'active', removal_scenario: 'steward_handover' },
  { group_id: G_CLOSURE, group_name: 'Solo Reeds', status: 'active', removal_scenario: 'group_closure' },
];

const activeDetail: Detail = {
  id: MEMBER_ID,
  display_name: 'Rolf Rowan',
  email: 'rolf@example.com',
  account_state: 'active',
  deactivation_origin: null,
  is_platform_admin: false,
  created_at: '2026-07-01T10:00:00+00:00',
  memberships: MEMBERSHIPS,
};
const pausedDetail: Detail = { ...activeDetail, account_state: 'paused', deactivation_origin: 'member' };
const suspendedDetail: Detail = { ...activeDetail, account_state: 'suspended', deactivation_origin: 'admin' };
const decommissionedDetail: Detail = {
  ...activeDetail,
  account_state: 'decommissioned',
  deactivation_origin: 'admin',
  memberships: [],
};
const adminDetail: Detail = { ...activeDetail, display_name: 'Gerd Granted', is_platform_admin: true };

const okDetail = (d: Detail, viewerIsSelf = false) =>
  ({ ok: true, status: 200, json: async () => ({ detail: d, viewer_is_self: viewerIsSelf }) }) as Response;
const okBody = (body: Record<string, unknown> = {}) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;
const errResponse = (status: number, error = 'x') =>
  ({ ok: false, status, json: async () => ({ error }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const renderLoaded = async (detail: Detail, viewerIsSelf = false) => {
  fetchMock.mockResolvedValue(okDetail(detail, viewerIsSelf));
  render(<AdminMemberDetail userId={MEMBER_ID} />);
  await screen.findByRole('heading', { name: detail.display_name });
};

describe('AdminMemberDetail (FEAT-H036 STORY-2..6)', () => {
  it('renders the loading skeleton while pending (B6)', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('STORY-2 active member: Suspend, Decommission, Force sign-out, Platform exit, Hard delete, Grant — Reactivate and Revoke absent', async () => {
    await renderLoaded(activeDetail);
    expect(screen.getByTestId('suspend-member')).toBeInTheDocument();
    expect(screen.getByTestId('decommission-member')).toBeInTheDocument();
    expect(screen.getByTestId('force-logout-member')).toBeInTheDocument();
    expect(screen.getByTestId('platform-exit-member')).toBeInTheDocument();
    expect(screen.getByTestId('hard-delete-member')).toBeInTheDocument();
    expect(screen.getByTestId('grant-admin')).toBeInTheDocument();
    expect(screen.queryByTestId('reactivate-member')).not.toBeInTheDocument();
    expect(screen.queryByTestId('revoke-admin')).not.toBeInTheDocument();
    // Identity header carries email; no badge on an active member.
    expect(screen.getByText(/rolf@example\.com/)).toBeInTheDocument();
    expect(screen.queryByTestId('state-badge')).not.toBeInTheDocument();
  });

  it('STORY-2 paused member: Reactivate renders and its ceremony copy names the self-pause (origin member)', async () => {
    await renderLoaded(pausedDetail);
    expect(screen.getByTestId('state-badge')).toHaveTextContent('paused');
    expect(screen.queryByTestId('suspend-member')).not.toBeInTheDocument();
    await userEvent.click(screen.getByTestId('reactivate-member'));
    expect(await screen.findByText(/pause the member set themselves/i)).toBeInTheDocument();
  });

  it('STORY-2 suspended member: the Reactivate ceremony copy names the admin hold (origin admin)', async () => {
    await renderLoaded(suspendedDetail);
    await userEvent.click(screen.getByTestId('reactivate-member'));
    expect(await screen.findByText(/admin hold/i)).toBeInTheDocument();
  });

  it('STORY-2 decommissioned member: only Hard delete remains', async () => {
    await renderLoaded(decommissionedDetail);
    expect(screen.getByTestId('hard-delete-member')).toBeInTheDocument();
    for (const id of [
      'suspend-member',
      'reactivate-member',
      'decommission-member',
      'force-logout-member',
      'platform-exit-member',
      'grant-admin',
      'revoke-admin',
    ]) {
      expect(screen.queryByTestId(id)).not.toBeInTheDocument();
    }
  });

  it('STORY-2 platform admin target: Revoke renders instead of Grant', async () => {
    await renderLoaded(adminDetail);
    expect(screen.getByTestId('revoke-admin')).toBeInTheDocument();
    expect(screen.queryByTestId('grant-admin')).not.toBeInTheDocument();
  });

  it('STORY-2 memberships panel: each group with status badge and Remove', async () => {
    await renderLoaded(activeDetail);
    for (const m of MEMBERSHIPS) {
      const row = screen.getByTestId(`membership-row-${m.group_id}`);
      expect(row).toHaveTextContent(m.group_name);
      expect(row.querySelector(`[data-testid="remove-from-group-${m.group_id}"]`)).not.toBeNull();
    }
  });

  it('STORY-3 suspend confirmed: POSTs, then repaints from the fresh read (badge flips)', async () => {
    fetchMock
      .mockResolvedValueOnce(okDetail(activeDetail))
      .mockResolvedValueOnce(okBody({}))
      .mockResolvedValue(okDetail(suspendedDetail));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    await screen.findByRole('heading', { name: 'Rolf Rowan' });
    await userEvent.click(screen.getByTestId('suspend-member'));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/admin/users/${MEMBER_ID}/suspend`,
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(await screen.findByTestId('state-badge')).toHaveTextContent('suspended');
  });

  it('STORY-3 a refusal surfaces the platform message verbatim and the view repaints', async () => {
    fetchMock
      .mockResolvedValueOnce(okDetail(activeDetail))
      .mockResolvedValueOnce(errResponse(409, 'User is already in the requested state'))
      .mockResolvedValue(okDetail(activeDetail));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    await screen.findByRole('heading', { name: 'Rolf Rowan' });
    await userEvent.click(screen.getByTestId('suspend-member'));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Suspend' }));
    expect(await screen.findByTestId('action-error')).toHaveTextContent(
      'User is already in the requested state',
    );
  });

  it('STORY-3 the Decommission ceremony names its irreversibility', async () => {
    await renderLoaded(activeDetail);
    await userEvent.click(screen.getByTestId('decommission-member'));
    expect(await screen.findByText(/cannot be undone|irreversible/i)).toBeInTheDocument();
  });

  it('STORY-4 Force sign-out: ceremony carries the refresh-layer honesty; success reports the platform count', async () => {
    fetchMock
      .mockResolvedValueOnce(okDetail(activeDetail))
      .mockResolvedValueOnce(okBody({ count: 1 }))
      .mockResolvedValue(okDetail(activeDetail));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    await screen.findByRole('heading', { name: 'Rolf Rowan' });
    await userEvent.click(screen.getByTestId('force-logout-member'));
    expect(await screen.findByText(/current token|may stay signed in for a few minutes/i)).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Force sign-out' }));
    expect(await screen.findByTestId('action-success')).toHaveTextContent(/1 session/);
  });

  it('STORY-4 Hard delete: type-to-confirm arms only on the display name and the sentinel consequence is named', async () => {
    fetchMock
      .mockResolvedValueOnce(okDetail(activeDetail))
      .mockResolvedValueOnce(okBody({}))
      .mockResolvedValue(errResponse(404, 'Not found'));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    await screen.findByRole('heading', { name: 'Rolf Rowan' });
    await userEvent.click(screen.getByTestId('hard-delete-member'));
    const panel = await screen.findByTestId('hard-delete-panel');
    expect(panel).toHaveTextContent(/\[Deleted User\]/);
    const confirm = screen.getByTestId('hard-delete-confirm');
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByTestId('hard-delete-input'), 'Rolf Rowan');
    expect(confirm).toBeEnabled();
    await userEvent.click(confirm);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/admin/users/${MEMBER_ID}/hard-delete`,
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    // The repaint after deletion finds nothing — the 404 shape.
    expect(await screen.findByText('404')).toBeInTheDocument();
  });

  it('STORY-5 Remove names the row scenario consequence; success repaints without the group', async () => {
    const afterRemoval: Detail = {
      ...activeDetail,
      memberships: MEMBERSHIPS.filter((m) => m.group_id !== G_CLOSURE),
    };
    fetchMock
      .mockResolvedValueOnce(okDetail(activeDetail))
      .mockResolvedValueOnce(okBody({ scenario: 'group_closure' }))
      .mockResolvedValue(okDetail(afterRemoval));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    await screen.findByRole('heading', { name: 'Rolf Rowan' });
    await userEvent.click(screen.getByTestId(`remove-from-group-${G_CLOSURE}`));
    expect(await screen.findByText(/closes the group/i)).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/admin/users/${MEMBER_ID}/remove-from-group`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ groupId: G_CLOSURE }),
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByTestId(`membership-row-${G_CLOSURE}`)).not.toBeInTheDocument(),
    );
  });

  it('STORY-5 the handover Remove names the caretaker consequence', async () => {
    await renderLoaded(activeDetail);
    await userEvent.click(screen.getByTestId(`remove-from-group-${G_HANDOVER}`));
    expect(await screen.findByText(/stewardship hands to FringeIsland/i)).toBeInTheDocument();
  });

  it('STORY-5 Platform exit: the ceremony aggregates the scenarios and states the no-erasure boundary', async () => {
    await renderLoaded(activeDetail);
    await userEvent.click(screen.getByTestId('platform-exit-member'));
    const modal = await screen.findByText(/exits 3 groups/i);
    expect(modal).toBeInTheDocument();
    expect(screen.getByText(/1 will close/i)).toBeInTheDocument();
    expect(screen.getByText(/1 hands? stewardship to FringeIsland/i)).toBeInTheDocument();
    expect(screen.getByText(/profile remains|not erased/i)).toBeInTheDocument();
  });

  it('STORY-6 Grant confirmed: POSTs and the chip appears on repaint', async () => {
    fetchMock
      .mockResolvedValueOnce(okDetail(activeDetail))
      .mockResolvedValueOnce(okBody({}))
      .mockResolvedValue(okDetail({ ...activeDetail, is_platform_admin: true }));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    await screen.findByRole('heading', { name: 'Rolf Rowan' });
    await userEvent.click(screen.getByTestId('grant-admin'));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Grant' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/admin/users/${MEMBER_ID}/grant-admin`,
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    expect(await screen.findByTestId('admin-chip')).toBeInTheDocument();
  });

  it('STORY-6 the last-admin floor refusal renders verbatim', async () => {
    fetchMock
      .mockResolvedValueOnce(okDetail(adminDetail))
      .mockResolvedValueOnce(
        errResponse(409, 'Cannot remove the last DeusEx member. Assign another DeusEx member first.'),
      )
      .mockResolvedValue(okDetail(adminDetail));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    await screen.findByRole('heading', { name: 'Gerd Granted' });
    await userEvent.click(screen.getByTestId('revoke-admin'));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Revoke' }));
    expect(await screen.findByTestId('action-error')).toHaveTextContent(
      'Cannot remove the last DeusEx member. Assign another DeusEx member first.',
    );
  });

  it('STORY-6 self-revoke: the ceremony names the self-demotion', async () => {
    await renderLoaded(adminDetail, true);
    await userEvent.click(screen.getByTestId('revoke-admin'));
    expect(await screen.findByText(/you will lose these pages immediately/i)).toBeInTheDocument();
  });

  it('a refused detail renders the 404 shape; a failed one retries', async () => {
    fetchMock.mockResolvedValue(errResponse(404));
    const { unmount } = render(<AdminMemberDetail userId={MEMBER_ID} />);
    expect(await screen.findByText('404')).toBeInTheDocument();
    unmount();
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(errResponse(500)).mockResolvedValue(okDetail(activeDetail));
    render(<AdminMemberDetail userId={MEMBER_ID} />);
    expect(await screen.findByText(/could not load/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Rolf Rowan' })).toBeInTheDocument();
  });

  it('the loaded detail is axe-clean', async () => {
    fetchMock.mockResolvedValue(okDetail(activeDetail));
    const { container } = render(<AdminMemberDetail userId={MEMBER_ID} />);
    await screen.findByRole('heading', { name: 'Rolf Rowan' });
    expect(await axe(container)).toHaveNoViolations();
  });
});
