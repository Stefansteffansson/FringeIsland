import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RolesFabric } from '@/lib/groups/queries';

/**
 * FEAT-H014 STORY-1/2 (unit) — the roles panel (GRP-6).
 * Fabric legible to everyone the contract admits; management affordances iff
 * the payload's capability flags say so (never client-side permission logic);
 * custom creation keeps form state on a wall refusal; grant toggles and
 * deletion re-read via onMutated; template-derived roles carry no delete
 * affordance (payload-categorical), held-role refusals surface in place.
 * Red-first for TASK-H014-02.
 */

const createGroupRole = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const setGroupRolePermission = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const deleteGroupRole = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock('@/lib/groups/client', () => ({
  createGroupRole: (...a: unknown[]) => createGroupRole(...a),
  setGroupRolePermission: (...a: unknown[]) => setGroupRolePermission(...a),
  deleteGroupRole: (...a: unknown[]) => deleteGroupRole(...a),
  GroupsApiError: class GroupsApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { RolesPanel } from '@/components/groups/RolesPanel';
import { GroupsApiError } from '@/lib/groups/client';

const FABRIC: RolesFabric = {
  group_id: 'grp-1',
  roles: [
    {
      id: 'role-s',
      name: 'Steward Role Template',
      description: null,
      created_from_role_template_id: 'tmpl-s',
      holder_count: 1,
      permissions: ['manage_roles', 'assign_roles'],
    },
    {
      id: 'role-c',
      name: 'Greeter',
      description: 'welcomes newcomers',
      created_from_role_template_id: null,
      holder_count: 0,
      permissions: ['view_member_list'],
    },
  ],
  viewer: { can_manage_roles: true, can_assign_roles: true, can_remove_roles: true },
  available_permissions: [
    { name: 'invite_members', category: 'membership' },
    { name: 'manage_roles', category: 'roles' },
    { name: 'view_member_list', category: 'membership' },
  ],
};

const TEMPLATES = [
  { id: 'tmpl-g', name: 'Guide Role Template', description: null },
  { id: 'tmpl-s', name: 'Steward Role Template', description: null },
];

const flagless: RolesFabric = {
  ...FABRIC,
  viewer: { can_manage_roles: false, can_assign_roles: false, can_remove_roles: false },
};

describe('FEAT-H014 — RolesPanel (STORY-1/2)', () => {
  const onMutated = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    createGroupRole.mockResolvedValue('role-new');
    setGroupRolePermission.mockResolvedValue(FABRIC.roles[1]);
    deleteGroupRole.mockResolvedValue(undefined);
  });

  it('renders every role with name, template-or-custom badge, holder count, and permission chips', () => {
    render(
      <RolesPanel groupId="grp-1" fabric={flagless} templates={TEMPLATES} error={null} onMutated={onMutated} />,
    );
    const cards = screen.getAllByTestId('role-card');
    expect(cards).toHaveLength(2);

    const steward = cards.find((c) => within(c).queryByText('Steward Role Template'))!;
    expect(within(steward).getByTestId('role-badge')).toHaveTextContent(/template/i);
    expect(within(steward).getByText(/1 holder\b/i)).toBeInTheDocument();
    expect(within(steward).getByText('manage_roles')).toBeInTheDocument();

    const greeter = cards.find((c) => within(c).queryByText('Greeter'))!;
    expect(within(greeter).getByTestId('role-badge')).toHaveTextContent(/custom/i);
    expect(within(greeter).getByText(/0 holders/i)).toBeInTheDocument();
    expect(within(greeter).getByText('view_member_list')).toBeInTheDocument();
  });

  it('is purely legible without management flags — no add/edit/delete affordances', () => {
    render(
      <RolesPanel groupId="grp-1" fabric={flagless} templates={TEMPLATES} error={null} onMutated={onMutated} />,
    );
    expect(screen.queryByTestId('add-role-button')).toBeNull();
    expect(screen.queryByTestId('edit-grants-button')).toBeNull();
    expect(screen.queryByTestId('delete-role-button')).toBeNull();
  });

  it('shows a panel-local, non-destructive error when the fabric read failed', () => {
    render(
      <RolesPanel groupId="grp-1" fabric={null} templates={[]} error="Failed to load the roles" onMutated={onMutated} />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(/failed to load the roles/i);
  });

  it('creates a custom role with exactly the ticked permissions and re-reads', async () => {
    const user = userEvent.setup();
    render(
      <RolesPanel groupId="grp-1" fabric={FABRIC} templates={TEMPLATES} error={null} onMutated={onMutated} />,
    );
    await user.click(screen.getByTestId('add-role-button'));
    await user.type(screen.getByTestId('role-name-input'), 'Greeter II');
    await user.click(screen.getByTestId('perm-checkbox-invite_members'));
    await user.click(screen.getByTestId('add-role-submit'));

    await waitFor(() =>
      expect(createGroupRole).toHaveBeenCalledWith(
        'grp-1',
        expect.objectContaining({ name: 'Greeter II', permissions: ['invite_members'] }),
      ),
    );
    expect(onMutated).toHaveBeenCalled();
  });

  it('surfaces the definition-time wall and keeps the form state', async () => {
    const user = userEvent.setup();
    createGroupRole.mockRejectedValue(
      new GroupsApiError('cannot grant a permission you do not hold: manage_roles', 403),
    );
    render(
      <RolesPanel groupId="grp-1" fabric={FABRIC} templates={TEMPLATES} error={null} onMutated={onMutated} />,
    );
    await user.click(screen.getByTestId('add-role-button'));
    await user.type(screen.getByTestId('role-name-input'), 'Overlord');
    await user.click(screen.getByTestId('perm-checkbox-manage_roles'));
    await user.click(screen.getByTestId('add-role-submit'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/cannot grant a permission you do not hold/i),
    );
    // The form keeps its state — nothing reset, nothing re-read.
    expect(screen.getByTestId('role-name-input')).toHaveValue('Overlord');
    expect(screen.getByTestId('perm-checkbox-manage_roles')).toBeChecked();
    expect(onMutated).not.toHaveBeenCalled();
  });

  it('instantiates a template (name prefilled, no explicit permissions) and re-reads', async () => {
    const user = userEvent.setup();
    render(
      <RolesPanel groupId="grp-1" fabric={FABRIC} templates={TEMPLATES} error={null} onMutated={onMutated} />,
    );
    await user.click(screen.getByTestId('add-role-button'));
    await user.selectOptions(screen.getByTestId('add-role-mode'), 'tmpl-g');
    expect(screen.getByTestId('role-name-input')).toHaveValue('Guide');
    await user.click(screen.getByTestId('add-role-submit'));

    await waitFor(() =>
      expect(createGroupRole).toHaveBeenCalledWith(
        'grp-1',
        expect.objectContaining({ name: 'Guide', role_template_id: 'tmpl-g' }),
      ),
    );
    const input = createGroupRole.mock.calls[0][1] as { permissions?: unknown };
    expect(input.permissions ?? null).toBeNull();
    expect(onMutated).toHaveBeenCalled();
  });

  it('flips a grant from the per-role editor and re-reads', async () => {
    const user = userEvent.setup();
    render(
      <RolesPanel groupId="grp-1" fabric={FABRIC} templates={TEMPLATES} error={null} onMutated={onMutated} />,
    );
    const greeter = screen
      .getAllByTestId('role-card')
      .find((c) => within(c).queryByText('Greeter'))!;
    await user.click(within(greeter).getByTestId('edit-grants-button'));
    await user.click(within(greeter).getByTestId('grant-toggle-invite_members'));

    await waitFor(() =>
      expect(setGroupRolePermission).toHaveBeenCalledWith('grp-1', 'role-c', 'invite_members', true),
    );
    expect(onMutated).toHaveBeenCalled();
  });

  it('deletes a custom role through ConfirmModal; template-derived roles carry no delete affordance', async () => {
    const user = userEvent.setup();
    render(
      <RolesPanel groupId="grp-1" fabric={FABRIC} templates={TEMPLATES} error={null} onMutated={onMutated} />,
    );
    const cards = screen.getAllByTestId('role-card');
    const steward = cards.find((c) => within(c).queryByText('Steward Role Template'))!;
    expect(within(steward).queryByTestId('delete-role-button')).toBeNull();

    const greeter = cards.find((c) => within(c).queryByText('Greeter'))!;
    await user.click(within(greeter).getByTestId('delete-role-button'));
    await user.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(deleteGroupRole).toHaveBeenCalledWith('grp-1', 'role-c'));
    expect(onMutated).toHaveBeenCalled();
  });

  it('surfaces the held-role refusal in place — nothing deleted, nothing re-read', async () => {
    const user = userEvent.setup();
    deleteGroupRole.mockRejectedValue(
      new GroupsApiError('role is held by members — remove the role from all holders first', 409),
    );
    render(
      <RolesPanel groupId="grp-1" fabric={FABRIC} templates={TEMPLATES} error={null} onMutated={onMutated} />,
    );
    const greeter = screen
      .getAllByTestId('role-card')
      .find((c) => within(c).queryByText('Greeter'))!;
    await user.click(within(greeter).getByTestId('delete-role-button'));
    await user.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/remove the role from all holders first/i),
    );
    expect(screen.getByText('Greeter')).toBeInTheDocument();
    expect(onMutated).not.toHaveBeenCalled();
  });
});
