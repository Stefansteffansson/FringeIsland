import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from '@testing-library/react';

/**
 * FEAT-H027 STORY-4 (unit) — the page-scoped forum tenant hook. Red-first for
 * TASK-CC-05.
 *
 * `GroupForumSection` registers `group:<G>:forum` while mounted and tears it
 * down on unmount; navigating between groups SWAPS the subscription (never
 * both, never neither). A page without the section registers nothing.
 */

type Tenant = {
  topic: string;
  events: string[];
  onHint: (hint: { event: string; payload: Record<string, unknown> }) => void;
};

const registerTenant = jest.fn<(t: Tenant) => () => void>();
const unregister = jest.fn();
jest.mock('@/lib/realtime/manager', () => ({
  realtimeManager: { registerTenant: (t: Tenant) => registerTenant(t) },
}));

import { useForumTenant } from '@/lib/realtime/forum-tenant';

function Harness({ groupId, onHint }: { groupId: string | null; onHint: () => void }) {
  useForumTenant(groupId, onHint);
  return null;
}

beforeEach(() => {
  jest.clearAllMocks();
  registerTenant.mockReturnValue(unregister);
});

describe('FEAT-H027 — forum tenant (useForumTenant)', () => {
  it('registers group:<G>:forum for all three forum events while mounted (STORY-4; RIDER-3 adds forum_post_edited)', () => {
    // RIDER-3 (A-COM live walk, 2026-07-22), red-first: the tenant predated the
    // C-D edit window and never subscribed to edits — an edited post stayed
    // stale on other members' open pages until reload.
    render(<Harness groupId="g1" onHint={jest.fn()} />);
    expect(registerTenant).toHaveBeenCalledTimes(1);
    const tenant = registerTenant.mock.calls[0][0];
    expect(tenant.topic).toBe('group:g1:forum');
    expect(tenant.events).toEqual(
      expect.arrayContaining(['forum_post_created', 'forum_post_moderated', 'forum_post_edited']),
    );
  });

  it('tears the subscription down on unmount (STORY-4)', () => {
    const { unmount } = render(<Harness groupId="g1" onHint={jest.fn()} />);
    unmount();
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('swaps subscriptions when navigating between groups — never both (STORY-4)', () => {
    const { rerender } = render(<Harness groupId="g1" onHint={jest.fn()} />);
    expect(registerTenant.mock.calls[0][0].topic).toBe('group:g1:forum');

    rerender(<Harness groupId="g2" onHint={jest.fn()} />);
    expect(unregister).toHaveBeenCalledTimes(1); // g1 dropped
    expect(registerTenant).toHaveBeenCalledTimes(2);
    expect(registerTenant.mock.calls[1][0].topic).toBe('group:g2:forum');
  });

  it('registers nothing without a group (no section, no subscription) (STORY-4)', () => {
    render(<Harness groupId={null} onHint={jest.fn()} />);
    expect(registerTenant).not.toHaveBeenCalled();
  });

  it('routes a hint to the current section callback without re-subscribing on callback identity change', () => {
    const first = jest.fn();
    const second = jest.fn();
    const { rerender } = render(<Harness groupId="g1" onHint={first} />);
    // A new callback each render must NOT churn the subscription.
    rerender(<Harness groupId="g1" onHint={second} />);
    expect(registerTenant).toHaveBeenCalledTimes(1);

    // The hint routes to the LATEST callback.
    registerTenant.mock.calls[0][0].onHint({ event: 'forum_post_created', payload: { post_id: 'p9' } });
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
  });
});
