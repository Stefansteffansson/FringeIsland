import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { RoleEntry, RoleTemplateOption } from '@/lib/groups/queries';

/**
 * RD-B FEAT-H044 STORY-1/2 (unit) — the available-roles section and the
 * diff-on-copy ceremony.
 *
 * The section renders three states from ONE read that has already happened
 * (the scoped catalogue rides the roles payload), so expanding it costs no
 * request — the ADR-U043 placement the spec's performance budget is drawn
 * against. The ceremony reads the diff on open, never per listed entry.
 *
 * Red-first for TASK-RDB-03.
 */
const createGroupRole = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const fetchRoleCopyDiff = jest.fn<(...a: unknown[]) => Promise<unknown>>();
const applyRoleTemplateUpdate = jest.fn<(...a: unknown[]) => Promise<unknown>>();

jest.mock('@/lib/groups/client', () => ({
  createGroupRole: (...a: unknown[]) => createGroupRole(...a),
  fetchRoleCopyDiff: (...a: unknown[]) => fetchRoleCopyDiff(...a),
  applyRoleTemplateUpdate: (...a: unknown[]) => applyRoleTemplateUpdate(...a),
  GroupsApiError: class GroupsApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { AvailableRolesSection } from '@/components/groups/AvailableRolesSection';
import { GroupsApiError } from '@/lib/groups/client';

const TEMPLATES: RoleTemplateOption[] = [
  {
    id: 'tmpl-new',
    name: 'Greeter Role Template',
    description: 'welcomes newcomers',
    adopted_group_role_id: null,
    adopted_version_number: null,
    current_version_number: 2,
  },
  {
    id: 'tmpl-cur',
    name: 'Guide Role Template',
    description: null,
    adopted_group_role_id: 'role-guide',
    adopted_version_number: 4,
    current_version_number: 4,
  },
  {
    id: 'tmpl-old',
    name: 'Steward Role Template',
    description: null,
    adopted_group_role_id: 'role-steward',
    adopted_version_number: 1,
    current_version_number: 3,
  },
  {
    // RD-10: provenance the backfill could not resolve.
    id: 'tmpl-unk',
    name: 'Observer Role Template',
    description: null,
    adopted_group_role_id: 'role-observer',
    adopted_version_number: null,
    current_version_number: 5,
  },
];

const ROLES: RoleEntry[] = [
  {
    id: 'role-steward',
    name: 'Steward',
    description: null,
    created_from_role_template_id: 'tmpl-old',
    created_from_version_number: 1,
    created_at: '2026-03-12T09:00:00+00:00',
    holder_count: 3,
    permissions: ['assign_roles'],
  },
  {
    id: 'role-observer',
    name: 'Observer',
    description: null,
    created_from_role_template_id: 'tmpl-unk',
    created_from_version_number: null,
    created_at: '2026-03-12T09:00:00+00:00',
    holder_count: 0,
    permissions: [],
  },
];

const onMutated = jest.fn();

const renderSection = (over: Partial<Parameters<typeof AvailableRolesSection>[0]> = {}) =>
  render(
    <AvailableRolesSection
      groupId="grp-1"
      templates={TEMPLATES}
      roles={ROLES}
      canManage
      readOnly={false}
      onMutated={onMutated}
      {...over}
    />,
  );

const expand = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.click(screen.getByTestId('available-roles-toggle'));
};

beforeEach(() => {
  jest.clearAllMocks();
  createGroupRole.mockResolvedValue('role-new');
  applyRoleTemplateUpdate.mockResolvedValue({ id: 'role-steward', from_version: 1, to_version: 3 });
  fetchRoleCopyDiff.mockResolvedValue({
    added: ['manage_roles', 'view_member_list'],
    removed: ['assign_roles'],
    unchanged: [],
    from_version: 1,
    to_version: 3,
  });
});

describe('FEAT-H044 STORY-1 — the available-roles section', () => {
  it('is not rendered at all for a member without manage_roles', () => {
    renderSection({ canManage: false });
    // Not "rendered but disabled" — it offers acts they cannot perform, so it
    // is absent, toggle included.
    expect(screen.queryByTestId('available-roles-section')).not.toBeInTheDocument();
    expect(screen.queryByTestId('available-roles-toggle')).not.toBeInTheDocument();
  });

  it('sits behind an affordance and costs no request to open', async () => {
    const user = userEvent.setup();
    renderSection();
    // Collapsed: the entries are not in the tree at first paint.
    expect(screen.queryByTestId('available-role-entry')).not.toBeInTheDocument();

    await expand(user);
    expect(screen.getAllByTestId('available-role-entry')).toHaveLength(4);
    // The ADR-U043 placement: the scoped catalogue already rode the roles
    // payload, so expanding fetches nothing. No new request at first paint,
    // and none on open either.
    expect(fetchRoleCopyDiff).not.toHaveBeenCalled();
    expect(createGroupRole).not.toHaveBeenCalled();
    expect(applyRoleTemplateUpdate).not.toHaveBeenCalled();
  });

  it('renders the three states: Copy, current, Review update', async () => {
    const user = userEvent.setup();
    renderSection();
    await expand(user);

    const entries = screen.getAllByTestId('available-role-entry');
    const notAdopted = entries.find((e) => within(e).queryByText('Greeter Role Template'))!;
    const current = entries.find((e) => within(e).queryByText('Guide Role Template'))!;
    const behind = entries.find((e) => within(e).queryByText('Steward Role Template'))!;

    expect(within(notAdopted).getByRole('button', { name: /^Copy$/ })).toBeInTheDocument();

    expect(within(current).getByText(/up to date/i)).toBeInTheDocument();
    expect(within(current).queryByRole('button')).not.toBeInTheDocument();

    expect(within(behind).getByRole('button', { name: /^Review update$/ })).toBeInTheDocument();
    expect(within(behind).getByText('v1 → v3')).toBeInTheDocument();
  });

  it('offers Review update on a copy whose version is unknown (RD-10)', async () => {
    const user = userEvent.setup();
    renderSection();
    await expand(user);

    const unknown = screen
      .getAllByTestId('available-role-entry')
      .find((e) => within(e).queryByText('Observer Role Template'))!;
    expect(within(unknown).getByRole('button', { name: /^Review update$/ })).toBeInTheDocument();
    expect(within(unknown).getByText('version unknown → v5')).toBeInTheDocument();
  });

  it('states an empty offer in words rather than rendering an empty box', async () => {
    const user = userEvent.setup();
    renderSection({ templates: [] });
    await expand(user);

    expect(screen.getByTestId('available-roles-empty')).toHaveTextContent(
      /nothing (new )?is offered to this group/i,
    );
  });

  it('renders read-only under the availability guard, with the reason stated', async () => {
    const user = userEvent.setup();
    renderSection({ readOnly: true });
    await expand(user);

    // The entries and their states still read — only the acts are withdrawn.
    expect(screen.getAllByTestId('available-role-entry')).toHaveLength(4);
    expect(screen.queryByRole('button', { name: /^Copy$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Review update$/ })).not.toBeInTheDocument();
    expect(screen.getByTestId('available-roles-readonly')).toBeInTheDocument();
  });

  it('copies an unadopted template through the existing create door', async () => {
    const user = userEvent.setup();
    renderSection();
    await expand(user);

    const notAdopted = screen
      .getAllByTestId('available-role-entry')
      .find((e) => within(e).queryByText('Greeter Role Template'))!;
    await user.click(within(notAdopted).getByRole('button', { name: /^Copy$/ }));

    await waitFor(() => expect(createGroupRole).toHaveBeenCalledTimes(1));
    expect(createGroupRole).toHaveBeenCalledWith('grp-1', {
      name: 'Greeter',
      description: null,
      role_template_id: 'tmpl-new',
    });
    expect(onMutated).toHaveBeenCalled();
  });

  it('surfaces a refused copy verbatim without claiming success', async () => {
    const user = userEvent.setup();
    createGroupRole.mockRejectedValue(
      new GroupsApiError('A role with that name already exists in this group', 409),
    );
    renderSection();
    await expand(user);

    const notAdopted = screen
      .getAllByTestId('available-role-entry')
      .find((e) => within(e).queryByText('Greeter Role Template'))!;
    await user.click(within(notAdopted).getByRole('button', { name: /^Copy$/ }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'A role with that name already exists in this group',
    );
    expect(onMutated).not.toHaveBeenCalled();
  });
});

describe('FEAT-H044 STORY-2 — the diff-on-copy ceremony', () => {
  const openCeremony = async (user: ReturnType<typeof userEvent.setup>) => {
    await expand(user);
    const behind = screen
      .getAllByTestId('available-role-entry')
      .find((e) => within(e).queryByText('Steward Role Template'))!;
    await user.click(within(behind).getByRole('button', { name: /^Review update$/ }));
    return screen.findByTestId('confirm-modal');
  };

  it('shows two labelled lists using permission display names, not internal keys', async () => {
    const user = userEvent.setup();
    renderSection();
    const modal = await openCeremony(user);

    await waitFor(() => expect(fetchRoleCopyDiff).toHaveBeenCalledWith('grp-1', 'role-steward'));

    const added = await within(modal).findByTestId('diff-added');
    const removed = within(modal).getByTestId('diff-removed');

    expect(added).toHaveTextContent(/will be added/i);
    expect(within(added).getByText('Manage roles')).toBeInTheDocument();
    expect(within(added).getByText('View member list')).toBeInTheDocument();
    expect(within(added).queryByText('manage_roles')).not.toBeInTheDocument();

    expect(removed).toHaveTextContent(/will be removed/i);
    expect(within(removed).getByText('Assign roles')).toBeInTheDocument();

    // The version movement is named in the ceremony, not only in the list.
    expect(modal).toHaveTextContent('v1 → v3');
  });

  it('renders the RD-3 restore sentence verbatim when permissions come back', async () => {
    const user = userEvent.setup();
    renderSection();
    const modal = await openCeremony(user);

    // The whole point of RD-3 — the moment a silent merge would have
    // escalated permissions invisibly, made visible and refusable. Pinned by
    // its own copy-check cell (the N-E rider: the payload walk traces keys and
    // cannot see rendered copy).
    expect(await within(modal).findByText('This will restore permissions you removed from this role.'))
      .toBeInTheDocument();
  });

  it('states that a locally-added permission will be taken away', async () => {
    const user = userEvent.setup();
    renderSection();
    const modal = await openCeremony(user);
    expect(await within(modal).findByTestId('diff-removed-statement')).toHaveTextContent(
      /will be taken away/i,
    );
  });

  it('names the holder count and states holders keep the role', async () => {
    const user = userEvent.setup();
    renderSection();
    const modal = await openCeremony(user);

    const holders = await within(modal).findByTestId('diff-holders');
    // Consequence before the click, not discovered after.
    expect(holders).toHaveTextContent(/3 members/i);
    expect(holders).toHaveTextContent(/keep the role/i);
  });

  it('omits the restore sentence when nothing is being added', async () => {
    const user = userEvent.setup();
    fetchRoleCopyDiff.mockResolvedValue({
      added: [],
      removed: ['assign_roles'],
      unchanged: [],
      from_version: 1,
      to_version: 3,
    });
    renderSection();
    const modal = await openCeremony(user);

    await within(modal).findByTestId('diff-removed');
    expect(
      within(modal).queryByText('This will restore permissions you removed from this role.'),
    ).not.toBeInTheDocument();
  });

  it('states there is nothing to apply on an empty diff and offers only Close', async () => {
    const user = userEvent.setup();
    fetchRoleCopyDiff.mockResolvedValue({
      added: [],
      removed: [],
      unchanged: ['assign_roles'],
      from_version: 3,
      to_version: 3,
    });
    renderSection();
    const modal = await openCeremony(user);

    expect(await within(modal).findByTestId('diff-empty')).toHaveTextContent(
      /nothing to apply/i,
    );
    // Only Close — no confirm affordance at all, not a disabled one.
    expect(within(modal).queryByTestId('confirm-modal-confirm')).not.toBeInTheDocument();
    expect(within(modal).getByTestId('confirm-modal-cancel')).toHaveTextContent('Close');
  });

  it('makes no contract call when the Steward cancels', async () => {
    const user = userEvent.setup();
    renderSection();
    const modal = await openCeremony(user);
    await within(modal).findByTestId('diff-added');

    await user.click(within(modal).getByTestId('confirm-modal-cancel'));

    await waitFor(() => expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument());
    expect(applyRoleTemplateUpdate).not.toHaveBeenCalled();
    expect(onMutated).not.toHaveBeenCalled();
  });

  it('applies on confirm and refreshes the panel', async () => {
    const user = userEvent.setup();
    renderSection();
    const modal = await openCeremony(user);
    await within(modal).findByTestId('diff-added');

    await user.click(within(modal).getByTestId('confirm-modal-confirm'));

    await waitFor(() =>
      expect(applyRoleTemplateUpdate).toHaveBeenCalledWith('grp-1', 'role-steward'),
    );
    await waitFor(() => expect(onMutated).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument());
  });

  it('surfaces a refusal verbatim, keeps the ceremony open, and changes nothing', async () => {
    const user = userEvent.setup();
    applyRoleTemplateUpdate.mockRejectedValue(
      new GroupsApiError(
        'applying this update would leave the group with no role granting "manage_roles"',
        409,
      ),
    );
    renderSection();
    const modal = await openCeremony(user);
    await within(modal).findByTestId('diff-added');

    await user.click(within(modal).getByTestId('confirm-modal-confirm'));

    expect(await within(modal).findByRole('alert')).toHaveTextContent(
      'applying this update would leave the group with no role granting "manage_roles"',
    );
    // The ceremony stays open and the panel is untouched.
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    expect(onMutated).not.toHaveBeenCalled();
  });

  it('surfaces a failed diff read inside the ceremony and offers no act over it', async () => {
    const user = userEvent.setup();
    fetchRoleCopyDiff.mockRejectedValue(new GroupsApiError('Not permitted', 403));
    renderSection();
    await openCeremony(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('Not permitted');
    // No confirm affordance offered over a diff we could not read.
    expect(screen.queryByTestId('confirm-modal-confirm')).not.toBeInTheDocument();
  });
});
