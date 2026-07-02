import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { Profile } from '@/lib/profile/queries';

/**
 * FEAT-H005 STORY-1 (unit) — the /profile surface.
 * Reads the caller's own profile via the FEAT-PC003 read contract (API-first),
 * shows a loading state while in flight, gates on FIM identity (a Mist has no
 * durable profile; a sessionless visitor is sent to sign-in), and renders the
 * editor against the fetched data.
 */

type AuthShape = {
  user: { id: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  loading: boolean;
};

let authState: AuthShape;
const replace = jest.fn();
// Stable router ref — mirrors Next's real useRouter (a new object each render
// would retrigger the effect and double-fetch).
const router = { replace, push: jest.fn() };
const fetchProfile = jest.fn<() => Promise<Profile>>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/lib/profile/client', () => ({
  fetchProfile: () => fetchProfile(),
  displayLabel: (p: Profile) => (p.display_preference === 'real_name' ? p.full_name : p.nickname),
}));

// Isolate the page from the shell + editor (those have their own unit tests).
jest.mock('@/components/shell/AppShell', () => ({
  AppShell: ({ children, title }: { children: React.ReactNode; title?: string }) => (
    <div data-testid="shell" data-title={title}>
      {children}
    </div>
  ),
}));
jest.mock('@/components/profile/ProfileEditForm', () => ({
  __esModule: true,
  default: ({ initial }: { initial: Profile }) => (
    <div data-testid="edit-form" data-fullname={initial.full_name} />
  ),
}));

import ProfilePage from '@/app/profile/page';

const profile: Profile = {
  full_name: 'Ada Lovelace',
  nickname: 'Ada',
  display_preference: 'nickname',
  show_real_name: false,
  bio: null,
  avatar_url: null,
};

beforeEach(() => {
  replace.mockReset();
  fetchProfile.mockReset().mockResolvedValue(profile);
  authState = { user: { id: 'u-fim' }, identity: 'fim', loading: false };
});

describe('FEAT-H005 STORY-1 (unit) — /profile for a FIM', () => {
  it('shows a loading state once the wait outlasts the deferral window (UX revision 2026-07-02)', async () => {
    jest.useFakeTimers();
    let resolve!: (p: Profile) => void;
    fetchProfile.mockReturnValue(new Promise<Profile>((r) => (resolve = r)));
    render(<ProfilePage />);
    // Deferred indicator: nothing during the first ~300 ms (a fast response
    // must complete spinner-free); the spinner is for a genuine wait only.
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    jest.useRealTimers();
    resolve(profile);
    await waitFor(() => expect(screen.getByTestId('edit-form')).toBeInTheDocument());
  });

  it('fetches via the contract and renders the editor with the data', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByTestId('edit-form')).toBeInTheDocument());
    expect(fetchProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('edit-form')).toHaveAttribute('data-fullname', 'Ada Lovelace');
  });

  it('renders the avatar when avatar_url is set', async () => {
    fetchProfile.mockResolvedValue({ ...profile, avatar_url: 'https://cdn.test/a.png' });
    render(<ProfilePage />);
    const img = await screen.findByRole('img', { name: /avatar/i });
    expect(img).toHaveAttribute('src', 'https://cdn.test/a.png');
  });

  it('surfaces an error when the fetch fails', async () => {
    fetchProfile.mockRejectedValue(new Error('boom'));
    render(<ProfilePage />);
    expect(await screen.findByTestId('inline-error')).toBeInTheDocument();
  });
});

describe('FEAT-H005 STORY-1 (unit) — gating', () => {
  it('redirects a sessionless visitor to sign-in (no fetch)', async () => {
    authState = { user: null, identity: 'sessionless', loading: false };
    render(<ProfilePage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?redirect=/profile'));
    expect(fetchProfile).not.toHaveBeenCalled();
  });

  it('redirects a Mist away — no durable profile (no fetch)', async () => {
    authState = { user: { id: 'm1' }, identity: 'mist', loading: false };
    render(<ProfilePage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/'));
    expect(fetchProfile).not.toHaveBeenCalled();
  });
});
