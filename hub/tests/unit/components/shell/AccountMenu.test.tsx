import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Profile } from '@/lib/profile/queries';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H005 STORY-1/4/5 (unit) — the FIM-only account menu + sign-out tail.
 * The menu is a FIM affordance (a Mist has no durable profile and leaves via the
 * FEAT-H004 farewell). Sign-out wires the existing AuthContext.signOut() and
 * returns to the sessionless entry; it emits a V4 session-ended event. The label
 * is sourced from the FEAT-PC003 read contract and refreshes on refreshNavigation.
 */

type AuthShape = {
  user: { id: string; email?: string } | null;
  identity: 'sessionless' | 'mist' | 'fim';
  signOut: () => Promise<void>;
};

let authState: AuthShape;
const signOut = jest.fn<() => Promise<void>>();
const push = jest.fn();
const router = { push, replace: jest.fn() };
const fetchProfile = jest.fn<() => Promise<Profile>>();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));
jest.mock('@/lib/profile/client', () => ({
  fetchProfile: () => fetchProfile(),
  displayLabel: (p: Profile) => (p.display_preference === 'real_name' ? p.full_name : p.nickname),
}));

import { AccountMenu } from '@/components/shell/AccountMenu';

const profile: Profile = {
  full_name: 'Ada Lovelace',
  nickname: 'Ada',
  display_preference: 'nickname',
  show_real_name: false,
  bio: null,
  avatar_url: null,
};

beforeEach(() => {
  signOut.mockReset().mockResolvedValue();
  push.mockReset();
  fetchProfile.mockReset().mockResolvedValue(profile);
  authState = { user: { id: 'u-fim', email: 'ada@x.test' }, identity: 'fim', signOut };
});

describe('FEAT-H005 STORY-1 (unit) — the menu is a FIM affordance', () => {
  it('renders nothing for a Mist', () => {
    authState = { user: { id: 'm1' }, identity: 'mist', signOut };
    const { container } = render(<AccountMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for a sessionless visitor', () => {
    authState = { user: null, identity: 'sessionless', signOut };
    const { container } = render(<AccountMenu />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the account menu for a FIM and shows the display label', async () => {
    render(<AccountMenu />);
    const trigger = screen.getByRole('button', { name: /account menu/i });
    await waitFor(() => expect(trigger).toHaveTextContent('Ada'));
  });
});

describe('FEAT-H005 STORY-1/4 (unit) — menu contents', () => {
  it('opens to My groups + Profile + Privacy & consent + Download my data + Sign out', async () => {
    render(<AccountMenu />);
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }));
    // The primary destination — sign-in lands there, and the menu must lead
    // back (found missing during G-D manual testing: no path to /groups).
    expect(screen.getByRole('link', { name: /my groups/i })).toHaveAttribute('href', '/groups');
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/profile');
    // FEAT-H008: the FIM-only entry point to the consent surface.
    expect(screen.getByRole('link', { name: /privacy & consent/i })).toHaveAttribute('href', '/consent');
    // FEAT-H010: the FIM-only entry point to the data-export surface.
    expect(screen.getByRole('link', { name: /download my data/i })).toHaveAttribute('href', '/export');
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });
});

describe('FEAT-H005 STORY-4/5 (unit) — sign out', () => {
  it('calls signOut, emits session.ended, and returns to the entry', async () => {
    render(<AccountMenu />);
    await userEvent.click(screen.getByRole('button', { name: /account menu/i }));
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => expect(signOut).toHaveBeenCalledTimes(1));
    expect(push).toHaveBeenCalledWith('/');
    expect(
      getTelemetrySink().some((e) => e.name === 'session.ended' && e.props?.actor === 'u-fim'),
    ).toBe(true);
  });
});

describe('FEAT-H005 STORY-2 coupling (unit) — label refreshes on refreshNavigation', () => {
  it('re-fetches the label when refreshNavigation fires', async () => {
    render(<AccountMenu />);
    await waitFor(() => expect(fetchProfile).toHaveBeenCalledTimes(1));
    fetchProfile.mockResolvedValue({ ...profile, nickname: 'Ada B' });
    act(() => {
      window.dispatchEvent(new CustomEvent('refreshNavigation'));
    });
    await waitFor(() => expect(fetchProfile).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /account menu/i })).toHaveTextContent('Ada B'),
    );
  });
});
