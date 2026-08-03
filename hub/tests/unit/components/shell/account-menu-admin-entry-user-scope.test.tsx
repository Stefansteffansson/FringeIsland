import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type { Profile } from '@/lib/profile/queries';

/**
 * FEAT-H038 STORY-1 (W-9, unit) — the admin-entry cache learns whose it is.
 * WRITTEN RED-FIRST against the photographed leak: `hub.adminEntry` cached in
 * sessionStorage keyed by nothing, never invalidated on auth change — one
 * member's verdict rendered for the next (bidirectionally).
 *
 * The fix shape pinned here: the cache key carries the user id
 * (`hub.adminEntry:<user.id>`), the legacy unkeyed key is never read, and the
 * module registers a cache-registry invalidator so sign-out drops every
 * admin-entry verdict.
 */

type AuthShape = {
  user: { id: string; email?: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  signOut: () => Promise<void>;
};

let authState: AuthShape;
const signOut = jest.fn<() => Promise<void>>();
const router = { push: jest.fn(), replace: jest.fn() };
const fetchProfile = jest.fn<() => Promise<Profile>>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
jest.mock('@/lib/profile/client', () => ({
  fetchProfile: () => fetchProfile(),
  displayLabel: () => 'Ada',
}));

import { AccountMenu } from '@/components/shell/AccountMenu';
import { invalidateAllCaches } from '@/lib/auth/cache-registry';
import userEvent from '@testing-library/user-event';

const profile = {
  full_name: 'Ada Lovelace',
  nickname: 'Ada',
  display_preference: 'nickname',
  show_real_name: false,
  bio: null,
  avatar_url: null,
} as Profile;

let fetchMock: jest.Mock<(input: RequestInfo | URL) => Promise<Response>>;

beforeEach(() => {
  window.sessionStorage.clear();
  signOut.mockReset().mockResolvedValue();
  fetchProfile.mockReset().mockResolvedValue(profile);
  authState = { user: { id: 'u-stefan', email: 'stefan@x.test' }, identity: 'fim', signOut };
  fetchMock = jest.fn<(input: RequestInfo | URL) => Promise<Response>>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const probeResponse = (ok: boolean) =>
  ({ ok, status: ok ? 200 : 404, json: async () => ({}) }) as Response;

describe('FEAT-H038 STORY-1 — the admin-entry probe verdict is user-scoped', () => {
  it("never reads the legacy unkeyed verdict — another member's cached yes cannot render my entry", async () => {
    // The photographed frame: Stefan's tab cached an unkeyed 'yes'; Gracy
    // signs in in that tab. Her probe refuses — her menu must not carry the
    // admin entry.
    window.sessionStorage.setItem('hub.adminEntry', 'yes');
    authState = { user: { id: 'u-gracy', email: 'gracy@x.test' }, identity: 'fim', signOut };
    fetchMock.mockResolvedValue(probeResponse(false));

    render(<AccountMenu />);
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('menuitem', { name: /platform admin/i })).not.toBeInTheDocument();
  });

  it('serves a cached verdict only from the caller-keyed entry (no probe when own key present)', async () => {
    window.sessionStorage.setItem('hub.adminEntry:u-stefan', 'yes');

    render(<AccountMenu />);
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: /platform admin/i })).toBeInTheDocument(),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('writes the probe verdict under the caller-keyed entry', async () => {
    fetchMock.mockResolvedValue(probeResponse(true));

    render(<AccountMenu />);
    await waitFor(() =>
      expect(window.sessionStorage.getItem('hub.adminEntry:u-stefan')).toBe('yes'),
    );
    expect(window.sessionStorage.getItem('hub.adminEntry')).toBeNull();
  });

  it('registers a cache-registry invalidator: sign-out drops every admin-entry verdict', async () => {
    fetchMock.mockResolvedValue(probeResponse(true));
    render(<AccountMenu />);
    await waitFor(() =>
      expect(window.sessionStorage.getItem('hub.adminEntry:u-stefan')).toBe('yes'),
    );

    // The auth flip calls only the registry (COR-A W9 inversion).
    invalidateAllCaches();
    expect(window.sessionStorage.getItem('hub.adminEntry:u-stefan')).toBeNull();
  });

  it("a departed admin's no never hides the next member's real entry (probe answers per user)", async () => {
    // Gracy's session cached her non-admin verdict under HER key; Stefan (a
    // real admin) signs in — his probe answers 200 and the entry renders.
    window.sessionStorage.setItem('hub.adminEntry:u-gracy', 'no');
    fetchMock.mockResolvedValue(probeResponse(true));

    render(<AccountMenu />);
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: /platform admin/i })).toBeInTheDocument(),
    );
  });
});
