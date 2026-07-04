import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GroupDetail, RolesFabric } from '@/lib/groups/queries';

/**
 * FEAT-H013 STORY-2/3/4 (unit) — the group detail panel.
 * Fields + vocabulary-tolerant status badge (GRP-5), member list exactly as
 * the payload provides (honest "hidden" copy when omitted), edit affordance
 * gated by the viewer capability flag (never client-side permission logic),
 * settings editor sends only changed fields and re-reads via onRefresh;
 * failures are non-destructive. Red-first for TASK-H013-02.
 */

const updateGroupSettings = jest.fn<(id: string, input: Record<string, unknown>) => Promise<unknown>>();
const assignMemberRole = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const removeMemberRole = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock('@/lib/groups/client', () => ({
  updateGroupSettings: (id: string, input: Record<string, unknown>) =>
    updateGroupSettings(id, input),
  assignMemberRole: (...a: unknown[]) => assignMemberRole(...a),
  removeMemberRole: (...a: unknown[]) => removeMemberRole(...a),
  GroupsApiError: class GroupsApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { GroupDetailPanel } from '@/components/groups/GroupDetailPanel';
import { GroupsApiError } from '@/lib/groups/client';

const BASE: GroupDetail = {
  id: 'grp-1',
  name: 'Book Circle',
  description: 'We read.',
  label: 'circle',
  status: 'active',
  is_public: false,
  show_member_list: true,
  created_at: '2026-07-01T10:00:00+00:00',
  member_count: 2,
  viewer: { is_member: true, joined_at: '2026-07-01T10:00:00+00:00', can_manage_settings: true },
  // FEAT-PC011 additive keys — the payload always carries them now.
  members: [
    {
      display_name: 'Stefan',
      joined_at: '2026-07-01T10:00:00+00:00',
      member_group_id: 'pg-stefan',
      roles: ['Steward Role Template'],
    },
    {
      display_name: 'Ada',
      joined_at: '2026-07-02T10:00:00+00:00',
      member_group_id: 'pg-ada',
      roles: [],
    },
  ],
};

/** FEAT-H014 — the fabric the member list needs for chips + assignment. */
const ROLES_FABRIC: RolesFabric = {
  group_id: 'grp-1',
  roles: [
    {
      id: 'role-s',
      name: 'Steward Role Template',
      description: null,
      created_from_role_template_id: 'tmpl-s',
      holder_count: 1,
      permissions: ['manage_roles', 'assign_roles', 'remove_roles'],
    },
    {
      id: 'role-g',
      name: 'Greeter',
      description: null,
      created_from_role_template_id: null,
      holder_count: 0,
      permissions: ['invite_members'],
    },
  ],
  viewer: { can_manage_roles: false, can_assign_roles: true, can_remove_roles: true },
  available_permissions: [{ name: 'invite_members', category: 'membership' }],
};

describe('FEAT-H013 — GroupDetailPanel (STORY-2/3/4)', () => {
  const onRefresh = jest.fn();

  beforeEach(() => {
    updateGroupSettings.mockReset().mockResolvedValue(BASE);
    onRefresh.mockReset();
  });

  it('renders the group fields, the member count, and the member list as provided', () => {
    render(<GroupDetailPanel group={BASE} onRefresh={onRefresh} />);
    expect(screen.getByRole('heading', { name: 'Book Circle' })).toBeInTheDocument();
    expect(screen.getByText('We read.')).toBeInTheDocument();
    const list = screen.getByTestId('member-list');
    expect(within(list).getByText('Stefan')).toBeInTheDocument();
    expect(within(list).getByText('Ada')).toBeInTheDocument();
  });

  it('renders honest copy when the contract omits the member list — no client-side inference', () => {
    const hidden: GroupDetail = { ...BASE };
    delete hidden.members;
    render(<GroupDetailPanel group={hidden} onRefresh={onRefresh} />);
    expect(screen.queryByTestId('member-list')).toBeNull();
    expect(screen.getByText(/member list hidden/i)).toBeInTheDocument();
    expect(screen.getByText(/2 members/i)).toBeInTheDocument();
  });

  it('badges non-active lifecycle states distinctly and tolerates unknown vocabulary (GRP-5)', () => {
    const { rerender } = render(
      <GroupDetailPanel group={{ ...BASE, status: 'closed' }} onRefresh={onRefresh} />,
    );
    const badge = screen.getByTestId('status-badge');
    expect(badge).toHaveTextContent(/closed/i);
    rerender(<GroupDetailPanel group={{ ...BASE, status: 'hibernating' }} onRefresh={onRefresh} />);
    expect(screen.getByTestId('status-badge')).toHaveTextContent(/hibernating/i);
  });

  it('does not badge an active group and offers no edit affordance without the capability flag', () => {
    render(
      <GroupDetailPanel
        group={{ ...BASE, viewer: { ...BASE.viewer, can_manage_settings: false } }}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.queryByTestId('status-badge')).toBeNull();
    expect(screen.queryByRole('button', { name: /edit settings/i })).toBeNull();
  });

  it('opens the settings editor from the capability-gated affordance and sends only the changed fields', async () => {
    render(<GroupDetailPanel group={BASE} onRefresh={onRefresh} />);
    await userEvent.click(screen.getByRole('button', { name: /edit settings/i }));
    const name = screen.getByLabelText(/group name/i);
    await userEvent.clear(name);
    await userEvent.type(name, 'Bigger Book Circle');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(updateGroupSettings).toHaveBeenCalledWith('grp-1', { name: 'Bigger Book Circle' });
  });

  it('moves each visibility toggle independently (GRP-3) — one changed toggle, one field sent', async () => {
    render(<GroupDetailPanel group={BASE} onRefresh={onRefresh} />);
    await userEvent.click(screen.getByRole('button', { name: /edit settings/i }));
    await userEvent.click(screen.getByLabelText(/group visibility/i));
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(onRefresh).toHaveBeenCalled());
    expect(updateGroupSettings).toHaveBeenCalledWith('grp-1', { is_public: true });
  });

  it('keeps the form state and surfaces the error when a save fails — never destructive', async () => {
    updateGroupSettings.mockRejectedValue(new Error('Not permitted'));
    render(<GroupDetailPanel group={BASE} onRefresh={onRefresh} />);
    await userEvent.click(screen.getByRole('button', { name: /edit settings/i }));
    const name = screen.getByLabelText(/group name/i);
    await userEvent.clear(name);
    await userEvent.type(name, 'Hijack Attempt');
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
    await waitFor(() => expect(screen.getByText(/not permitted/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/group name/i)).toHaveValue('Hijack Attempt');
    expect(onRefresh).not.toHaveBeenCalled();
  });
});

/**
 * FEAT-H014 STORY-3 (unit) — role chips + assign/remove on the member list
 * (GRP-7). Chips from the extended payload; affordances iff the FABRIC
 * viewer flags say so; removal through ConfirmModal; the last-Steward
 * refusal surfaces in place and the chip stays. Red-first for TASK-H014-02.
 */
describe('FEAT-H014 — member-list role chips + assignment (STORY-3)', () => {
  const onRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    assignMemberRole.mockResolvedValue(undefined);
    removeMemberRole.mockResolvedValue(undefined);
  });

  it('renders each member\'s roles as chips', () => {
    render(<GroupDetailPanel group={BASE} fabric={ROLES_FABRIC} onRefresh={onRefresh} />);
    // Scoped to the chips container — the assign picker's options also carry
    // role names, so the row as a whole is not the right query root.
    const stefanChips = screen.getByTestId('member-chips-pg-stefan');
    expect(within(stefanChips).getByText('Steward Role Template')).toBeInTheDocument();
    const adaChips = screen.getByTestId('member-chips-pg-ada');
    expect(within(adaChips).queryByText('Steward Role Template')).toBeNull();
  });

  it('is read-only without the fabric (or without the flags) — chips render, no affordances', () => {
    const { rerender } = render(<GroupDetailPanel group={BASE} onRefresh={onRefresh} />);
    expect(screen.getByTestId('member-list')).toBeInTheDocument();
    expect(screen.queryByTestId('assign-select-pg-ada')).toBeNull();
    expect(screen.queryByRole('button', { name: /remove .* from/i })).toBeNull();

    const flagless: RolesFabric = {
      ...ROLES_FABRIC,
      viewer: { can_manage_roles: false, can_assign_roles: false, can_remove_roles: false },
    };
    rerender(<GroupDetailPanel group={BASE} fabric={flagless} onRefresh={onRefresh} />);
    expect(screen.queryByTestId('assign-select-pg-ada')).toBeNull();
    expect(screen.queryByRole('button', { name: /remove .* from/i })).toBeNull();
  });

  it('assigns a picked role to a member and re-reads (one refresh path)', async () => {
    const user = userEvent.setup();
    render(<GroupDetailPanel group={BASE} fabric={ROLES_FABRIC} onRefresh={onRefresh} />);
    await user.selectOptions(screen.getByTestId('assign-select-pg-ada'), 'role-g');
    await waitFor(() => expect(assignMemberRole).toHaveBeenCalledWith('grp-1', 'pg-ada', 'role-g'));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('surfaces the assignment-time wall in place — nothing changes visually', async () => {
    const user = userEvent.setup();
    assignMemberRole.mockRejectedValue(
      new GroupsApiError('cannot assign a role granting permissions you do not hold', 403),
    );
    render(<GroupDetailPanel group={BASE} fabric={ROLES_FABRIC} onRefresh={onRefresh} />);
    await user.selectOptions(screen.getByTestId('assign-select-pg-ada'), 'role-s');
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/cannot assign a role granting/i),
    );
    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('removes a chip through ConfirmModal and re-reads', async () => {
    const user = userEvent.setup();
    render(<GroupDetailPanel group={BASE} fabric={ROLES_FABRIC} onRefresh={onRefresh} />);
    await user.click(
      screen.getByRole('button', { name: /remove steward role template from stefan/i }),
    );
    await user.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() =>
      expect(removeMemberRole).toHaveBeenCalledWith('grp-1', 'pg-stefan', 'role-s'),
    );
    expect(onRefresh).toHaveBeenCalled();
  });

  it('surfaces the last-Steward refusal in place — the chip stays, never pre-empted', async () => {
    const user = userEvent.setup();
    removeMemberRole.mockRejectedValue(
      new GroupsApiError(
        'Cannot remove the last Steward from the group. Assign another Steward first.',
        409,
      ),
    );
    render(<GroupDetailPanel group={BASE} fabric={ROLES_FABRIC} onRefresh={onRefresh} />);
    await user.click(
      screen.getByRole('button', { name: /remove steward role template from stefan/i }),
    );
    await user.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/last steward/i),
    );
    const stefan = screen.getByTestId('member-row-pg-stefan');
    expect(within(stefan).getByText('Steward Role Template')).toBeInTheDocument();
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
