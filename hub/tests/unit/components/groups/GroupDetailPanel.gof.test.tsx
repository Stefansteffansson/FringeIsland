import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * FEAT-H018 STORY-4/5 (unit) — honest member kinds on the detail panel.
 * Badges from the additive `member_group_type` (raw open-set: engagement →
 * "Group", system → "FringeIsland", personal → none, unknown → the raw value);
 * count copy + the Close affordance key on `non_system_member_count` (the
 * Gracy case: the last human alone with the caretaker sees Close); the
 * nominate pick-list offers persons only (ADR-U041 §4 — the substrate refuses
 * anyway; the surface never renders the door). Red-first for TASK-H018-02.
 */

// FEAT-H025 adaptation (labelled): the panel now carries the roster DM entry
// (useRouter + openDm); mocked so these suites keep testing their own scope.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/lib/messages/client', () => ({
  openDm: jest.fn(),
}));
jest.mock('@/lib/groups/client', () => ({
  activateMember: jest.fn(),
  assignMemberRole: jest.fn(),
  closeGroup: jest.fn(),
  deleteGroup: jest.fn(),
  handGroupToDeusEx: jest.fn(),
  leaveGroup: jest.fn(),
  nominateSteward: jest.fn(),
  pauseMember: jest.fn(),
  removeGroupMember: jest.fn(),
  removeMemberRole: jest.fn(),
  updateGroupSettings: jest.fn(),
}));

import { GroupDetailPanel } from '@/components/groups/GroupDetailPanel';
import type { GroupDetail } from '@/lib/groups/queries';

const member = (
  id: string,
  name: string,
  type: string | undefined,
  roles: string[] = [],
): NonNullable<GroupDetail['members']>[number] => ({
  display_name: name,
  joined_at: '2026-07-01T00:00:00Z',
  member_group_id: id,
  roles,
  membership_status: 'active',
  member_group_type: type,
});

const baseGroup = (over: Partial<GroupDetail>): GroupDetail => ({
  id: 'g1',
  name: 'Nya gruppen',
  description: null,
  label: null,
  status: 'active',
  is_public: false,
  show_member_list: true,
  created_at: '2026-07-01T00:00:00Z',
  member_count: 3,
  viewer: { is_member: true, joined_at: '2026-07-01T00:00:00Z', can_manage_settings: false },
  ...over,
});

describe('FEAT-H018 — GroupDetailPanel member kinds (STORY-4/5)', () => {
  const onRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('badges group and system members; persons carry no kind badge; unknown kinds render raw', () => {
    render(
      <GroupDetailPanel
        group={baseGroup({
          non_system_member_count: 3,
          member_count: 4,
          members: [
            member('p1', 'Gracy', 'personal'),
            member('a1', 'Familjen', 'engagement'),
            member('dx', 'DeusEx', 'system', ['Steward Role Template']),
            member('u1', 'Mystiska', 'covenant'),
          ],
        })}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.getByTestId('kind-badge-a1')).toHaveTextContent('Group');
    expect(screen.getByTestId('kind-badge-dx')).toHaveTextContent('FringeIsland');
    expect(screen.queryByTestId('kind-badge-p1')).not.toBeInTheDocument();
    // Open set: an unknown group_type renders its raw value, never crashes.
    expect(screen.getByTestId('kind-badge-u1')).toHaveTextContent('covenant');
  });

  it('count copy reflects the non-system count', () => {
    render(
      <GroupDetailPanel
        group={baseGroup({
          member_count: 2,
          non_system_member_count: 1,
          members: [member('p1', 'Gracy', 'personal'), member('dx', 'DeusEx', 'system')],
        })}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.getByText(/1 member\b/)).toBeInTheDocument();
  });

  // Gate walk 2026-07-30. The count is RIGHT and stays right — ADR-U041 §5
  // keys it (and the Close affordance) on the non-system count, because the
  // caretaker is never load-bearing; counting FringeIsland as a member would
  // mean a platform-held group never reaches "last member" and Close breaks.
  //
  // What was wrong is that the SCREEN contradicted itself: the header read
  // "1 member" above a list showing two rows, with nothing to reconcile them.
  // The fix explains the extra row rather than inflating the count.
  it('names the caretaker when the list shows a row the count deliberately excludes', () => {
    render(
      <GroupDetailPanel
        group={baseGroup({
          member_count: 2,
          non_system_member_count: 1,
          members: [member('p1', 'Gracy', 'personal'), member('dx', 'DeusEx', 'system')],
        })}
        onRefresh={onRefresh}
      />,
    );
    const line = screen.getByTestId('member-count-line');
    // The people count is unchanged — this is not a recount.
    expect(line).toHaveTextContent(/1 member\b/);
    // ...and the second visible row is now accounted for.
    expect(line.textContent ?? '').toMatch(/FringeIsland/i);
  });

  it('says nothing extra when every visible row is a person — no caretaker, no clause', () => {
    render(
      <GroupDetailPanel
        group={baseGroup({
          member_count: 2,
          non_system_member_count: 2,
          members: [member('p1', 'Gracy', 'personal'), member('p2', 'Bruno', 'personal')],
        })}
        onRefresh={onRefresh}
      />,
    );
    const line = screen.getByTestId('member-count-line');
    expect(line).toHaveTextContent(/2 members\b/);
    expect(line.textContent ?? '').not.toMatch(/caretaker|FringeIsland/i);
  });

  it('the Gracy case: the last human alone with the caretaker sees Close', () => {
    render(
      <GroupDetailPanel
        group={baseGroup({
          member_count: 2,
          non_system_member_count: 1,
          members: [member('p1', 'Gracy', 'personal'), member('dx', 'DeusEx', 'system')],
        })}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.getByTestId('close-group')).toBeInTheDocument();
  });

  it('without the additive count the old member_count semantics stand (tolerant reader)', () => {
    render(
      <GroupDetailPanel
        group={baseGroup({ member_count: 1, members: [member('p1', 'Gracy', 'personal')] })}
        onRefresh={onRefresh}
      />,
    );
    expect(screen.getByTestId('close-group')).toBeInTheDocument();
  });

  it('the nominate pick-list offers persons only (ADR-U041 §4)', async () => {
    const user = userEvent.setup();
    render(
      <GroupDetailPanel
        group={baseGroup({
          member_count: 4,
          non_system_member_count: 3,
          members: [
            member('viewer', 'Stefan', 'personal'),
            member('p2', 'Gracy', 'personal'),
            member('a1', 'Familjen', 'engagement'),
            member('dx', 'DeusEx', 'system'),
          ],
        })}
        permissions={['assign_roles']}
        viewerMemberGroupId="viewer"
        onRefresh={onRefresh}
      />,
    );
    await user.click(screen.getByTestId('hand-over-leadership'));
    expect(screen.getByTestId('nominate-candidate-p2')).toBeInTheDocument();
    expect(screen.queryByTestId('nominate-candidate-a1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('nominate-candidate-dx')).not.toBeInTheDocument();
  });
});
