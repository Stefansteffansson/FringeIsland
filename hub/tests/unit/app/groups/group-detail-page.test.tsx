import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type { GroupDetail } from '@/lib/groups/queries';

/**
 * FEAT-H013 STORY-2 (unit) — the /groups/[id] page gate + honesty states.
 * FIM-only per the house pattern (journal precedent): sessionless → sign-in
 * with destination preserved; Mist → entry; FIM → fetch + panel; a 404 from
 * the BFF renders the house not-found (indistinguishable private/absent).
 * Red-first for TASK-H013-02.
 */

type AuthShape = {
  user: { id: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  loading: boolean;
};

let authState: AuthShape;
const replace = jest.fn();
const router = { replace, push: jest.fn() };

const fetchGroupDetail = jest.fn<(id: string) => Promise<GroupDetail>>();
const fetchGroupRoles = jest.fn<(id: string) => Promise<unknown>>();
const fetchMyPermissions = jest.fn<(id: string) => Promise<string[]>>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({
  useRouter: () => router,
  useParams: () => ({ id: 'grp-1' }),
}));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));
jest.mock('@/lib/groups/client', () => ({
  fetchGroupDetail: (id: string) => fetchGroupDetail(id),
  fetchGroupRoles: (id: string) => fetchGroupRoles(id),
  fetchMyPermissions: (id: string) => fetchMyPermissions(id),
  GroupsApiError: class GroupsApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));
jest.mock('@/components/groups/GroupDetailPanel', () => ({
  GroupDetailPanel: ({ group, onRefresh }: { group: GroupDetail; onRefresh: () => void }) => (
    <div data-testid="detail-panel" data-name={group.name}>
      <button data-testid="stub-mutate" onClick={onRefresh} />
    </div>
  ),
}));
jest.mock('@/components/groups/RolesPanel', () => ({
  RolesPanel: () => <div data-testid="roles-panel-stub" />,
}));
jest.mock('@/components/groups/MyPermissionsPanel', () => ({
  MyPermissionsPanel: () => <div data-testid="my-permissions-stub" />,
}));

import GroupDetailPage from '@/app/groups/[id]/page';
import { GroupsApiError } from '@/lib/groups/client';

const DETAIL = {
  id: 'grp-1',
  name: 'Book Circle',
  description: null,
  label: null,
  status: 'active',
  is_public: false,
  show_member_list: true,
  created_at: '2026-07-01T10:00:00+00:00',
  member_count: 1,
  viewer: { is_member: true, joined_at: null, can_manage_settings: false },
} as GroupDetail;

describe('FEAT-H013 — /groups/[id] page gate (STORY-2)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchGroupDetail.mockResolvedValue(DETAIL);
    fetchGroupRoles.mockResolvedValue({ fabric: null, templates: [] });
    fetchMyPermissions.mockResolvedValue([]);
  });

  it('redirects a sessionless visitor to sign-in, preserving the destination', async () => {
    authState = { user: null, identity: 'sessionless', loading: false };
    render(<GroupDetailPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?redirect=/groups/grp-1'));
    expect(fetchGroupDetail).not.toHaveBeenCalled();
  });

  it('redirects a Mist to the entry — groups are FIM life', async () => {
    authState = { user: { id: 'u-mist' }, identity: 'mist', loading: false };
    render(<GroupDetailPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(fetchGroupDetail).not.toHaveBeenCalled();
  });

  it('fetches and mounts the panel for a FIM', async () => {
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    render(<GroupDetailPage />);
    await waitFor(() => expect(screen.getByTestId('detail-panel')).toBeInTheDocument());
    expect(screen.getByTestId('detail-panel')).toHaveAttribute('data-name', 'Book Circle');
  });

  it('renders the house not-found for a 404 — private and absent look identical', async () => {
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    fetchGroupDetail.mockRejectedValue(new GroupsApiError('Group not found', 404));
    render(<GroupDetailPage />);
    await waitFor(() => expect(screen.getByText(/group not found/i)).toBeInTheDocument());
    expect(screen.queryByTestId('detail-panel')).toBeNull();
  });

  // FEAT-H014 STORY-4 — the page composes all three reads and one refresh path.
  it('mounts the roles + permissions panels for a FIM and re-reads all three on a mutation (FEAT-H014)', async () => {
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    render(<GroupDetailPage />);
    await waitFor(() => expect(screen.getByTestId('detail-panel')).toBeInTheDocument());
    expect(screen.getByTestId('roles-panel-stub')).toBeInTheDocument();
    expect(screen.getByTestId('my-permissions-stub')).toBeInTheDocument();
    expect(fetchGroupRoles).toHaveBeenCalledWith('grp-1');
    expect(fetchMyPermissions).toHaveBeenCalledWith('grp-1');

    const before = {
      detail: fetchGroupDetail.mock.calls.length,
      roles: fetchGroupRoles.mock.calls.length,
      perms: fetchMyPermissions.mock.calls.length,
    };
    screen.getByTestId('stub-mutate').click();
    await waitFor(() => {
      expect(fetchGroupDetail.mock.calls.length).toBe(before.detail + 1);
      expect(fetchGroupRoles.mock.calls.length).toBe(before.roles + 1);
      expect(fetchMyPermissions.mock.calls.length).toBe(before.perms + 1);
    });
  });
});
