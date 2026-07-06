import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type { GroupSummary } from '@/lib/groups/queries';

/**
 * Perf revision 2026-07-06 (unit) — the /groups first-load waterfall.
 * The measured cold load fired GET /api/groups THREE times (the auth listener
 * hands out a new `user` reference per event — getSession resolve,
 * INITIAL_SESSION, TOKEN_REFRESHED — and the page effect was keyed on the
 * object), and the spinner gated on the LAST response. The page now keys its
 * effect on the stable user id, reads through the session-cached
 * `fetchMyGroups`, and paints instantly from `peekMyGroups` while
 * revalidating in the background.
 *
 * Red-first: fails until the page reads through the groups client cache.
 */

type AuthShape = {
  user: { id: string } | null;
  loading: boolean;
};

let authState: AuthShape;
const replace = jest.fn();
// Stable router ref — mirrors Next's real useRouter (a new object each render
// would retrigger the effect and double-fetch).
const router = { replace, push: jest.fn() };
const fetchMyGroups = jest.fn<() => Promise<GroupSummary[]>>();
const peekMyGroups = jest.fn<() => GroupSummary[] | null>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/lib/groups/client', () => ({
  fetchMyGroups: () => fetchMyGroups(),
  peekMyGroups: () => peekMyGroups(),
}));

// Isolate the page from the shell + panels (those have their own unit tests).
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="shell">{children}</div>
  ),
}));
jest.mock('@/components/groups/CreateGroupPanel', () => ({
  CreateGroupPanel: () => <div data-testid="create-group-panel" />,
}));
jest.mock('@/components/groups/MyInvitations', () => ({
  MyInvitations: () => null,
}));
jest.mock('@/components/groups/PendingNominations', () => ({
  PendingNominations: () => null,
}));

import GroupsPage from '@/app/groups/page';

const GROUPS: GroupSummary[] = [
  { id: 'g1', name: 'Dev Test Cohort', description: null, is_public: false, member_count: 1 },
];
const REFRESHED: GroupSummary[] = [
  ...GROUPS,
  { id: 'g2', name: 'Nya gruppen', description: null, is_public: true, member_count: 2 },
];

beforeEach(() => {
  replace.mockReset();
  fetchMyGroups.mockReset().mockResolvedValue(GROUPS);
  peekMyGroups.mockReset().mockReturnValue(null);
  authState = { user: { id: 'u1' }, loading: false };
});

describe('/groups first load (perf revision 2026-07-06)', () => {
  it('reads through the session-cached client exactly once and renders the list', async () => {
    render(<GroupsPage />);
    await waitFor(() => expect(screen.getByTestId('groups-list')).toBeInTheDocument());
    expect(screen.getByText('Dev Test Cohort')).toBeInTheDocument();
    expect(fetchMyGroups).toHaveBeenCalledTimes(1);
  });

  it('does not refetch when the auth user REFERENCE churns with an unchanged id (the 3x regression)', async () => {
    const { rerender } = render(<GroupsPage />);
    await waitFor(() => expect(screen.getByTestId('groups-list')).toBeInTheDocument());

    // Simulate the auth listener's hydration sequence: INITIAL_SESSION then
    // TOKEN_REFRESHED each hand out a NEW user object for the SAME member.
    authState = { user: { id: 'u1' }, loading: false };
    rerender(<GroupsPage />);
    authState = { user: { id: 'u1' }, loading: false };
    rerender(<GroupsPage />);

    expect(fetchMyGroups).toHaveBeenCalledTimes(1);
  });

  it('paints instantly from the session cache while revalidating (no spinner)', async () => {
    peekMyGroups.mockReturnValue(GROUPS);
    let resolve!: (g: GroupSummary[]) => void;
    fetchMyGroups.mockReturnValue(new Promise<GroupSummary[]>((r) => (resolve = r)));

    render(<GroupsPage />);

    // Cached list is on screen at once — the revalidation is still in flight.
    expect(screen.getByTestId('groups-list')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();

    // The background revalidation lands and the list updates in place.
    resolve(REFRESHED);
    await waitFor(() => expect(screen.getByText('Nya gruppen')).toBeInTheDocument());
  });

  it('shows the empty state when the member has no groups', async () => {
    fetchMyGroups.mockResolvedValue([]);
    render(<GroupsPage />);
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument());
  });

  it('surfaces an error when the read fails and nothing is cached', async () => {
    fetchMyGroups.mockRejectedValue(new Error('boom'));
    render(<GroupsPage />);
    expect(await screen.findByTestId('inline-error')).toBeInTheDocument();
  });

  it('redirects a signed-out visitor to sign-in (no fetch)', async () => {
    authState = { user: null, loading: false };
    render(<GroupsPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?redirect=/groups'));
    expect(fetchMyGroups).not.toHaveBeenCalled();
  });
});
