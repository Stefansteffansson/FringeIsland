import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type { GroupSummary } from '@/lib/groups/queries';

/**
 * FEAT-H028 STORY-3 (unit) — the FIM landing mount for the Platform
 * Announcements section. A signed-in FIM lands on /groups (the entry page's
 * "Continue to your groups" affordance, hub/app/page.tsx). The section mounts
 * there for FIMs only — never for a Mist (CB-1). This pins the mount gate; the
 * section's own behaviour is covered by its component test.
 *
 * Red-first: fails until /groups mounts PlatformAnnouncementsSection under a
 * FIM-only gate.
 */

type AuthShape = { user: { id: string } | null; identity: string; loading: boolean };
let authState: AuthShape;
const router = { replace: jest.fn(), push: jest.fn() };
const fetchMyGroups = jest.fn<() => Promise<GroupSummary[]>>();
const peekMyGroups = jest.fn<() => GroupSummary[] | null>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
// FEAT-H042 (N-E): useSearchParams joined the page (the WS-4 focus reader) —
// mock extended, no-param default (labelled sibling adaptation).
jest.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/lib/groups/client', () => ({
  fetchMyGroups: () => fetchMyGroups(),
  peekMyGroups: () => peekMyGroups(),
}));
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div data-testid="shell">{children}</div>,
}));
jest.mock('@/components/groups/CreateGroupPanel', () => ({ CreateGroupPanel: () => null }));
jest.mock('@/components/groups/MyInvitations', () => ({ MyInvitations: () => null }));
jest.mock('@/components/announcements/PlatformAnnouncementsSection', () => ({
  PlatformAnnouncementsSection: () => <div data-testid="platform-announcements-mounted" />,
}));

import GroupsPage from '@/app/groups/page';

const GROUPS: GroupSummary[] = [
  { id: 'g1', name: 'Cohort', description: null, label: null, is_public: false, created_at: '2026-07-01T10:00:00+00:00', member_count: 1, status: 'active' },
];

beforeEach(() => {
  router.replace.mockReset();
  fetchMyGroups.mockReset().mockResolvedValue(GROUPS);
  peekMyGroups.mockReset().mockReturnValue(null);
  authState = { user: { id: 'u1' }, identity: 'fim', loading: false };
});

describe('/groups platform announcements mount', () => {
  it('mounts the platform announcements section for a FIM', async () => {
    render(<GroupsPage />);
    expect(await screen.findByTestId('platform-announcements-mounted')).toBeInTheDocument();
  });

  it('does not mount it for a Mist', async () => {
    authState = { user: { id: 'anon' }, identity: 'mist', loading: false };
    render(<GroupsPage />);
    await waitFor(() => expect(screen.getByTestId('shell')).toBeInTheDocument());
    expect(screen.queryByTestId('platform-announcements-mounted')).not.toBeInTheDocument();
  });
});
