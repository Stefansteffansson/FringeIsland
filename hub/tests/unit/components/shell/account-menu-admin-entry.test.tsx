import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import type { Profile } from '@/lib/profile/queries';

/**
 * FEAT-H034 STORY-1 (unit) — the gated admin entry in the account menu.
 * WRITTEN RED-FIRST (the entry does not exist yet).
 *
 * Gate shape: a lazy probe of the admin BFF read, cached per browser session —
 * permission-derived (the platform's own refusal decides), never a role
 * string. Present for an admin, absent for everyone else.
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
  authState = { user: { id: 'u-fim', email: 'ada@x.test' }, identity: 'fim', signOut };
  fetchMock = jest.fn<(input: RequestInfo | URL) => Promise<Response>>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const probeResponse = (ok: boolean) =>
  ({ ok, status: ok ? 200 : 404, json: async () => ({}) }) as Response;

describe('FEAT-H034 — the gated Platform admin menu entry', () => {
  it('renders the entry for a platform admin (probe 200)', async () => {
    fetchMock.mockResolvedValue(probeResponse(true));
    render(<AccountMenu />);
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: /platform admin/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('menuitem', { name: /platform admin/i })).toHaveAttribute(
      'href',
      '/admin',
    );
  });

  it('renders no entry for a non-admin (probe refused) — absence, not disabled', async () => {
    fetchMock.mockResolvedValue(probeResponse(false));
    render(<AccountMenu />);
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(screen.queryByRole('menuitem', { name: /platform admin/i })).not.toBeInTheDocument();
  });

  it('caches the probe per browser session — one probe, not one per mount', async () => {
    fetchMock.mockResolvedValue(probeResponse(true));
    const first = render(<AccountMenu />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    first.unmount();
    render(<AccountMenu />);
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }));
    await waitFor(() =>
      expect(screen.getByRole('menuitem', { name: /platform admin/i })).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1); // sessionStorage answered the second mount
  });
});
