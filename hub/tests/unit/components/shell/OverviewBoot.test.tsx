import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from '@testing-library/react';

/**
 * ADR-U042 (unit) — the OverviewBoot trigger (guardrail 6).
 *
 * Mounted FIRST inside AuthProvider (React runs same-commit effects in
 * traversal order, so this effect wins the race against AccountMenu /
 * AccountStateProvider fetches). Fires `prefetchOverview()` when the session
 * is a FIM landing on a boot path ('/', '/login', '/groups...') — the
 * measured post-login flow. A Mist or a deep-link elsewhere keeps today's
 * per-resource reads (privacy: the bundle never over-fetches for a surface
 * that doesn't render it).
 *
 * Red-first: fails until `components/shell/OverviewBoot.tsx` lands.
 */

type AuthShape = { identity: 'sessionless' | 'mist' | 'fim'; loading: boolean };

let authState: AuthShape;
let pathname: string;
const prefetchOverview = jest.fn();

jest.mock('@/lib/auth/AuthContext', () => ({ useAuth: () => authState }));
jest.mock('next/navigation', () => ({ usePathname: () => pathname }));
jest.mock('@/lib/me/overview-client', () => ({
  prefetchOverview: () => prefetchOverview(),
}));

import { OverviewBoot } from '@/components/shell/OverviewBoot';

beforeEach(() => {
  prefetchOverview.mockReset();
  authState = { identity: 'fim', loading: false };
  pathname = '/groups';
});

describe('ADR-U042 (unit) — OverviewBoot', () => {
  it('fires for a FIM on /groups', () => {
    render(<OverviewBoot />);
    expect(prefetchOverview).toHaveBeenCalledTimes(1);
  });

  it('fires for a FIM on /login (the post-login flow arms before the redirect)', () => {
    pathname = '/login';
    render(<OverviewBoot />);
    expect(prefetchOverview).toHaveBeenCalledTimes(1);
  });

  it('fires for a FIM on the landing page', () => {
    pathname = '/';
    render(<OverviewBoot />);
    expect(prefetchOverview).toHaveBeenCalledTimes(1);
  });

  it('does not fire while auth is resolving, then fires once at ready', () => {
    authState = { identity: 'sessionless', loading: true };
    const { rerender } = render(<OverviewBoot />);
    expect(prefetchOverview).not.toHaveBeenCalled();
    authState = { identity: 'fim', loading: false };
    rerender(<OverviewBoot />);
    expect(prefetchOverview).toHaveBeenCalledTimes(1);
  });

  it('does not fire for a Mist', () => {
    authState = { identity: 'mist', loading: false };
    render(<OverviewBoot />);
    expect(prefetchOverview).not.toHaveBeenCalled();
  });

  it('does not fire on a deep-link outside the boot paths (no over-fetch)', () => {
    pathname = '/profile';
    render(<OverviewBoot />);
    expect(prefetchOverview).not.toHaveBeenCalled();
  });

  it('renders nothing', () => {
    const { container } = render(<OverviewBoot />);
    expect(container).toBeEmptyDOMElement();
  });
});
