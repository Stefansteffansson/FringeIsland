import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render } from '@testing-library/react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H027 STORY-2/5/7 (unit) — the app-wide conversations tenant + the
 * `useRealtimeTenants` hook that wires it into AuthContext beside the session
 * guard. Red-first for TASK-CC-04.
 *
 * The hook drives the shared manager's connection from auth state (the arming
 * rule: FIM + live session) and registers ONE tenant on
 * `account:<uid>:conversations`. Verify-on-signal: a hint does NOTHING but
 * invalidate the messages cache and dispatch `conversationsChanged` carrying
 * the hinted id — no payload content is ever rendered anywhere.
 */

type Tenant = {
  topic: string;
  events: string[];
  onHint: (hint: { event: string; payload: Record<string, unknown> }) => void;
};

const registerTenant = jest.fn<(t: Tenant) => () => void>();
const updateConnection = jest.fn();
const unregister = jest.fn();
jest.mock('@/lib/realtime/manager', () => ({
  realtimeManager: {
    registerTenant: (t: Tenant) => registerTenant(t),
    updateConnection: (c: unknown) => updateConnection(c),
  },
}));

const invalidateMessagesCache = jest.fn();
jest.mock('@/lib/messages/client', () => ({
  invalidateMessagesCache: () => invalidateMessagesCache(),
}));

import {
  useRealtimeTenants,
  CONVERSATIONS_CHANGED_EVENT,
} from '@/lib/realtime/conversations-tenant';

const supabase = {} as SupabaseClient;
const makeSession = (uid = 'uid-1'): Session =>
  ({ access_token: 'tok-1', user: { id: uid } }) as unknown as Session;

function Harness({
  session,
  identity,
}: {
  session: Session | null;
  identity: 'sessionless' | 'mist' | 'fim';
}) {
  useRealtimeTenants(supabase, session, identity);
  return null;
}

describe('FEAT-H027 — conversations tenant (useRealtimeTenants)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    registerTenant.mockReturnValue(unregister);
  });

  it('arms the manager and registers the per-member conversations tenant for a FIM (STORY-2)', () => {
    render(<Harness session={makeSession('uid-1')} identity="fim" />);

    expect(updateConnection).toHaveBeenCalledWith({
      supabase,
      accessToken: 'tok-1',
      userId: 'uid-1',
      armed: true,
    });
    // ADAPTED at A-NTF N-C (FEAT-H032): `useRealtimeTenants` now registers TWO
    // tenants on the one socket — conversations (C-C) and notifications (N-C).
    // Strengthened rather than relaxed: the count is still exact, and both
    // topics are pinned by name, so a third tenant appearing silently still
    // fails this test.
    expect(registerTenant).toHaveBeenCalledTimes(2);
    const topics = registerTenant.mock.calls.map((c) => c[0].topic);
    expect(topics).toEqual(['account:uid-1:conversations', 'account:uid-1:notifications']);

    const tenant = registerTenant.mock.calls[0][0];
    expect(tenant.topic).toBe('account:uid-1:conversations');
    expect(tenant.events).toContain('message_created');

    const notifTenant = registerTenant.mock.calls[1][0];
    expect(notifTenant.events).toContain('notification');
  });

  it('registers no tenant for a Mist or a sessionless visitor (STORY-2)', () => {
    const { rerender } = render(<Harness session={null} identity="sessionless" />);
    rerender(<Harness session={makeSession('mist-1')} identity="mist" />);
    expect(registerTenant).not.toHaveBeenCalled();
    // The manager is still told the connection is disarmed.
    expect(updateConnection).toHaveBeenCalledWith(
      expect.objectContaining({ armed: false }),
    );
  });

  it('verify-on-signal: a hint invalidates the cache and dispatches conversationsChanged with the id, and does nothing else (STORY-5)', () => {
    const listener = jest.fn();
    window.addEventListener(CONVERSATIONS_CHANGED_EVENT, listener as EventListener);
    render(<Harness session={makeSession('uid-1')} identity="fim" />);

    const tenant = registerTenant.mock.calls[0][0];
    tenant.onHint({ event: 'message_created', payload: { conversation_id: 'c-42' } });

    expect(invalidateMessagesCache).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    const detail = (listener.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ conversationId: 'c-42' });
    window.removeEventListener(CONVERSATIONS_CHANGED_EVENT, listener as EventListener);
  });

  it('a payload without a usable id still fires a bare re-read nudge (no throw, no rendered content)', () => {
    const listener = jest.fn();
    window.addEventListener(CONVERSATIONS_CHANGED_EVENT, listener as EventListener);
    render(<Harness session={makeSession('uid-1')} identity="fim" />);

    const tenant = registerTenant.mock.calls[0][0];
    tenant.onHint({ event: 'message_created', payload: {} });

    expect(invalidateMessagesCache).toHaveBeenCalledTimes(1);
    const detail = (listener.mock.calls[0][0] as CustomEvent).detail;
    expect(detail).toEqual({ conversationId: null });
    window.removeEventListener(CONVERSATIONS_CHANGED_EVENT, listener as EventListener);
  });

  it('unregisters the tenant on sign-out / unmount (STORY-7)', () => {
    const { unmount } = render(<Harness session={makeSession('uid-1')} identity="fim" />);
    unmount();
    // ADAPTED at N-C: both tenants tear down on sign-out, so both teardowns
    // run. STORY-7's guarantee is unchanged — nothing survives the identity
    // change — and asserting the exact count keeps a leaked subscription visible.
    expect(unregister).toHaveBeenCalledTimes(2);
  });
});
