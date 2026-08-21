import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { GroupDetail } from '@/lib/groups/queries';

/**
 * FEAT-H046 STORY-1/4 (unit, RED-FIRST) — the page's acting slice.
 *
 * STORY-1/2 passthrough: with a hat selected (standing here), the page hands
 * GroupForumSection the acting context {groupId, name, permissions} built
 * from the substitution read; "Myself" hands nothing (byte-identical today).
 *
 * STORY-4 (the RULED narrow mechanism, 2026-08-16): the page re-reads the
 * acting slice when the bell's coalesced hint event fires
 * (NOTIFICATIONS_CHANGED_EVENT) — NOT via a hint-fired refreshNavigation,
 * which would make every notification a platform-wide full-page re-read. A
 * selected hat that lost standing falls back to "Myself" with honest copy
 * naming the dropped hat; the existing refreshNavigation full-re-read path is
 * untouched and inherits the same revalidation.
 */

type AuthShape = {
  user: { id: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  loading: boolean;
};

let authState: AuthShape;
const router = { replace: jest.fn(), push: jest.fn() };

const fetchGroupDetail = jest.fn<(id: string) => Promise<GroupDetail>>();
const fetchGroupRoles = jest.fn<(id: string) => Promise<unknown>>();
const fetchMyPermissions = jest.fn<
  (id: string) => Promise<{ permissions: string[]; member_group_id: string }>
>();
const fetchActingContexts = jest.fn<(id?: string) => Promise<unknown[]>>();
const fetchMyPermissionsActingAs = jest.fn<(id: string, acting: string) => Promise<string[]>>();
const fetchMembershipsOf = jest.fn<(id: string) => Promise<unknown[]>>();
const fetchGroupInvitations = jest.fn();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({
  useRouter: () => router,
  useParams: () => ({ id: 'grp-1' }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('@/lib/groups/client', () => ({
  fetchGroupDetailEnvelope: async (id: string) => ({
    group: await fetchGroupDetail(id),
    enrollments: { data: { count: 0, enrollments: [] } },
  }),
  fetchGroupRoles: (id: string) => fetchGroupRoles(id),
  fetchMyPermissions: (id: string) => fetchMyPermissions(id),
  fetchActingContexts: (id?: string) => fetchActingContexts(id),
  fetchMyPermissionsActingAs: (id: string, acting: string) =>
    fetchMyPermissionsActingAs(id, acting),
  fetchMembershipsOf: (id: string) => fetchMembershipsOf(id),
  fetchGroupInvitations: (id: string) => fetchGroupInvitations(id),
  isGroupDetailShell: (payload: GroupDetail) => !('viewer' in payload),
  GroupsApiError: class GroupsApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

// The bell's coalesced hint event — mocked to its literal so this suite never
// imports the realtime machinery.
jest.mock('@/lib/realtime/notifications-tenant', () => ({
  NOTIFICATIONS_CHANGED_EVENT: 'notificationsChanged',
}));

// Heavy sections stubbed; the forum stub surfaces the acting prop it received.
jest.mock('@/components/groups/GroupDetailPanel', () => ({
  GroupDetailPanel: () => <div data-testid="detail-panel" />,
}));
jest.mock('@/components/groups/RolesPanel', () => ({
  RolesPanel: () => <div />,
}));
jest.mock('@/components/groups/InvitationsPanel', () => ({
  InvitationsPanel: () => <div />,
}));
jest.mock('@/components/groups/InviteGroupPanel', () => ({
  InviteGroupPanel: () => <div />,
}));
jest.mock('@/components/groups/GroupJourneysSection', () => ({
  GroupJourneysSection: () => <div />,
}));
jest.mock('@/components/groups/GroupJourneyProgressSection', () => ({
  GroupJourneyProgressSection: () => <div />,
}));
jest.mock('@/components/groups/GroupConversationsSection', () => ({
  GroupConversationsSection: () => <div />,
}));
// FEAT-H048: the third consumer of the page's one acting context — the stub
// surfaces the prop it received, exactly as the forum stub does.
jest.mock('@/components/groups/GroupAnnouncementsSection', () => ({
  GroupAnnouncementsSection: ({
    acting,
  }: {
    acting?: { groupId: string; name: string; permissions: string[] } | null;
  }) => (
    <div
      data-testid="announcements-stub"
      data-acting={acting ? acting.groupId : 'none'}
      data-acting-perms={acting ? acting.permissions.join(',') : ''}
    />
  ),
}));
jest.mock('@/components/groups/GroupMembershipsPanel', () => ({
  GroupMembershipsPanel: () => <div />,
}));
jest.mock('@/components/groups/SuspendedGroupShell', () => ({
  SuspendedGroupShell: () => <div />,
}));
jest.mock('@/components/groups/GroupForumSection', () => ({
  GroupForumSection: ({
    acting,
  }: {
    acting?: { groupId: string; name: string; permissions: string[] } | null;
  }) => (
    <div
      data-testid="forum-stub"
      data-acting={acting ? acting.groupId : 'none'}
      data-acting-perms={acting ? acting.permissions.join(',') : ''}
    />
  ),
}));
jest.mock('@/components/groups/MyPermissionsPanel', () => ({
  MyPermissionsPanel: ({
    actingAs,
    onActAsChange,
  }: {
    actingAs?: string;
    onActAsChange?: (v: string) => void;
  }) => (
    <div data-testid="perm-panel-stub" data-acting-as={actingAs}>
      <button data-testid="stub-select-hat" onClick={() => onActAsChange?.('ga')} />
    </div>
  ),
}));

import GroupDetailPage from '@/app/groups/[id]/page';

const DETAIL = {
  id: 'grp-1',
  name: 'Harbour',
  description: null,
  label: null,
  status: 'active',
  is_public: false,
  show_member_list: true,
  created_at: '2026-07-01T10:00:00+00:00',
  member_count: 2,
  viewer: { is_member: true, joined_at: null, can_manage_settings: false },
} as GroupDetail;

const HAT = { group_id: 'ga', name: 'Alpha', is_member_of_context: true };

describe('FEAT-H046 — the group page acting slice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
    fetchGroupDetail.mockResolvedValue(DETAIL);
    fetchGroupRoles.mockResolvedValue({ fabric: null, templates: [] });
    fetchMyPermissions.mockResolvedValue({ permissions: [], member_group_id: 'pg-me' });
    fetchActingContexts.mockResolvedValue([HAT]);
    fetchMyPermissionsActingAs.mockResolvedValue(['view_forum', 'post_forum_messages']);
    fetchMembershipsOf.mockResolvedValue([]);
  });

  it('hands the forum the acting context when a hat with standing is selected; Myself hands nothing', async () => {
    const user = userEvent.setup();
    render(<GroupDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('forum-stub')).toHaveAttribute('data-acting', 'none'),
    );

    await user.click(screen.getByTestId('stub-select-hat'));
    await waitFor(() =>
      expect(screen.getByTestId('forum-stub')).toHaveAttribute('data-acting', 'ga'),
    );
    expect(screen.getByTestId('forum-stub')).toHaveAttribute(
      'data-acting-perms',
      'view_forum,post_forum_messages',
    );
  });

  it('FEAT-H048: hands the announcements board the same acting context; Myself hands nothing', async () => {
    const user = userEvent.setup();
    render(<GroupDetailPage />);
    await waitFor(() =>
      expect(screen.getByTestId('announcements-stub')).toHaveAttribute('data-acting', 'none'),
    );

    await user.click(screen.getByTestId('stub-select-hat'));
    await waitFor(() =>
      expect(screen.getByTestId('announcements-stub')).toHaveAttribute('data-acting', 'ga'),
    );
    expect(screen.getByTestId('announcements-stub')).toHaveAttribute(
      'data-acting-perms',
      'view_forum,post_forum_messages',
    );
  });

  it('STORY-4: a bell hint re-reads the acting slice; a hat that lost standing falls back to Myself with honest copy', async () => {
    const user = userEvent.setup();
    render(<GroupDetailPage />);
    await waitFor(() => expect(screen.getByTestId('forum-stub')).toBeInTheDocument());
    await user.click(screen.getByTestId('stub-select-hat'));
    await waitFor(() =>
      expect(screen.getByTestId('forum-stub')).toHaveAttribute('data-acting', 'ga'),
    );

    // The host pauses A's membership; PD020 delivers; the bell coalesces a hint.
    fetchActingContexts.mockResolvedValue([]);
    const callsBefore = fetchActingContexts.mock.calls.length;
    act(() => {
      window.dispatchEvent(new Event('notificationsChanged'));
    });

    await waitFor(() =>
      expect(fetchActingContexts.mock.calls.length).toBeGreaterThan(callsBefore),
    );
    await waitFor(() =>
      expect(screen.getByTestId('forum-stub')).toHaveAttribute('data-acting', 'none'),
    );
    expect(screen.getByTestId('hat-dropped-notice')).toHaveTextContent('Alpha');
  });

  it('STORY-4 guard: the existing refreshNavigation path still re-reads the acting slice', async () => {
    render(<GroupDetailPage />);
    await waitFor(() => expect(screen.getByTestId('forum-stub')).toBeInTheDocument());
    const callsBefore = fetchActingContexts.mock.calls.length;
    act(() => {
      window.dispatchEvent(new Event('refreshNavigation'));
    });
    await waitFor(() =>
      expect(fetchActingContexts.mock.calls.length).toBeGreaterThan(callsBefore),
    );
  });
});
