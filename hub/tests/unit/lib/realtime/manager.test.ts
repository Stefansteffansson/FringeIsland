import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H027 STORY-1/7 (unit) — the ADR-U039 channel manager, the shared tenant
 * substrate that generalizes what `session-guard.ts` proved as the doctrine's
 * first tenant. Red-first for TASK-CC-03 (module-absent red).
 *
 * The manager owns the mechanics every tenant repeats by hand today: join a
 * PRIVATE topic on the ONE shared socket after `realtime.setAuth`, exactly one
 * subscription per armed topic (idempotent across remounts), channel status +
 * a rejoin callback surfaced to tenants, full teardown on sign-out / identity
 * change, and the arming rule (FIM + live session). Registration is the
 * extension surface — a new tenant (topic + events + handler) needs no manager
 * edit (the A-NTF readiness proof).
 */

import {
  createRealtimeManager,
  type Tenant,
  type TenantStatus,
} from '@/lib/realtime/manager';
import { getTelemetrySink } from '@/lib/observability/telemetry';

type SubCb = (status: string) => void;
type Broadcast = { payload?: Record<string, unknown> };
type FakeChannel = {
  topic: string;
  config: unknown;
  events: Array<{ event: string; cb: (msg: Broadcast) => void }>;
  subCb: SubCb | null;
  on: jest.Mock;
  subscribe: jest.Mock;
};

function makeSupabase() {
  const channels: FakeChannel[] = [];
  const setAuth = jest.fn();
  const removeChannel = jest.fn();
  const channel = jest.fn((topic: string, opts: unknown) => {
    const ch: FakeChannel = {
      topic,
      config: opts,
      events: [],
      subCb: null,
      on: jest.fn((_type: unknown, filter: unknown, cb: unknown) => {
        ch.events.push({ event: (filter as { event: string }).event, cb: cb as (msg: Broadcast) => void });
        return ch;
      }),
      subscribe: jest.fn((cb: unknown) => {
        ch.subCb = (cb ?? null) as SubCb | null;
        return ch;
      }),
    };
    channels.push(ch);
    return ch;
  });
  const supabase = {
    channel,
    removeChannel,
    realtime: { setAuth },
  } as unknown as SupabaseClient;
  return { supabase, channels, setAuth, removeChannel, channel };
}

const CONV = 'account:uid-1:conversations';
const armed = (supabase: SupabaseClient, userId = 'uid-1', token = 'tok-1') => ({
  supabase,
  accessToken: token,
  userId,
  armed: true,
});

function convTenant(over: Partial<Tenant> = {}): Tenant {
  return {
    topic: CONV,
    events: ['message_created'],
    onHint: jest.fn(),
    ...over,
  };
}

describe('FEAT-H027 — realtime channel manager (ADR-U039 substrate)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('joins a private topic exactly once for an armed FIM, after setAuth (STORY-1)', () => {
    const mgr = createRealtimeManager();
    const { supabase, channel, setAuth } = makeSupabase();

    mgr.registerTenant(convTenant());
    mgr.updateConnection(armed(supabase));

    expect(channel).toHaveBeenCalledTimes(1);
    expect(channel).toHaveBeenCalledWith(CONV, { config: { private: true } });
    // setAuth carries the caller JWT to the socket BEFORE the join.
    expect(setAuth).toHaveBeenCalledWith('tok-1');
    expect(setAuth.mock.invocationCallOrder[0]).toBeLessThan(
      channel.mock.invocationCallOrder[0],
    );

    // Re-arming with the same identity does not create a second subscription.
    mgr.updateConnection(armed(supabase));
    expect(channel).toHaveBeenCalledTimes(1);
  });

  it('creates no subscription for a Mist or a sessionless visitor (STORY-1)', () => {
    const mgr = createRealtimeManager();
    const { supabase, channel } = makeSupabase();

    mgr.registerTenant(convTenant());
    mgr.updateConnection({ supabase, accessToken: null, userId: null, armed: false });
    expect(channel).not.toHaveBeenCalled();
  });

  it('is idempotent across remounts — two tenants on one topic share one channel (STORY-1)', () => {
    const mgr = createRealtimeManager();
    const { supabase, channel, removeChannel } = makeSupabase();
    mgr.updateConnection(armed(supabase));

    const un1 = mgr.registerTenant(convTenant());
    const un2 = mgr.registerTenant(convTenant());
    expect(channel).toHaveBeenCalledTimes(1); // one socket, not one-per-mount

    un1(); // first "unmount" — the topic still has a live tenant
    expect(removeChannel).not.toHaveBeenCalled();
    un2(); // last tenant leaves — now the channel is torn down
    expect(removeChannel).toHaveBeenCalledTimes(1);
  });

  it('tears down every subscription on sign-out / disarm (STORY-7)', () => {
    const mgr = createRealtimeManager();
    const { supabase, removeChannel } = makeSupabase();
    mgr.registerTenant(convTenant());
    mgr.updateConnection(armed(supabase));

    mgr.updateConnection({ supabase, accessToken: null, userId: null, armed: false });
    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(mgr.getStatus(CONV)).toBeNull();
  });

  it('re-arms fresh on an identity change — old channel gone, new one joined (STORY-7)', () => {
    const mgr = createRealtimeManager();
    const { supabase, channel, removeChannel } = makeSupabase();
    mgr.registerTenant(convTenant());
    mgr.updateConnection(armed(supabase, 'uid-1'));
    expect(channel).toHaveBeenCalledTimes(1);

    // Same tenant registration, different member (uid) -> teardown + rejoin.
    mgr.updateConnection(armed(supabase, 'uid-2', 'tok-2'));
    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(channel).toHaveBeenCalledTimes(2);
  });

  it('surfaces channel status and a rejoin callback to tenants (STORY-6 substrate)', () => {
    const mgr = createRealtimeManager();
    const { supabase, channels, removeChannel, channel } = makeSupabase();
    const onStatus = jest.fn<(s: TenantStatus, rejoin: () => void) => void>();
    mgr.registerTenant(convTenant({ onStatus }));
    mgr.updateConnection(armed(supabase));

    // Joining, before the socket confirms.
    expect(mgr.getStatus(CONV)).toBe('reconnecting');

    channels[0].subCb!('SUBSCRIBED');
    expect(mgr.getStatus(CONV)).toBe('subscribed');
    expect(onStatus).toHaveBeenCalledWith('subscribed', expect.any(Function));

    channels[0].subCb!('CHANNEL_ERROR');
    expect(mgr.getStatus(CONV)).toBe('reconnecting');

    // The rejoin callback tenants receive drops the dead channel and re-joins.
    const rejoin = onStatus.mock.calls[onStatus.mock.calls.length - 1][1];
    rejoin();
    expect(removeChannel).toHaveBeenCalledTimes(1);
    expect(channel).toHaveBeenCalledTimes(2);
  });

  it('lets a non-tenant surface subscribe to a topic status and unsubscribe (STORY-6)', () => {
    const mgr = createRealtimeManager();
    const { supabase, channels } = makeSupabase();
    mgr.registerTenant(convTenant());
    mgr.updateConnection(armed(supabase));

    const listener = jest.fn<(s: TenantStatus | null) => void>();
    const unsub = mgr.subscribeStatus(CONV, listener);

    channels[0].subCb!('SUBSCRIBED');
    expect(listener).toHaveBeenCalledWith('subscribed');
    channels[0].subCb!('CHANNEL_ERROR');
    expect(listener).toHaveBeenCalledWith('reconnecting');

    unsub();
    channels[0].subCb!('SUBSCRIBED');
    expect(listener).toHaveBeenCalledTimes(2); // silent after unsubscribe
  });

  it('notifies status subscribers with null when the channel is torn down (STORY-6)', () => {
    const mgr = createRealtimeManager();
    const { supabase } = makeSupabase();
    mgr.registerTenant(convTenant());
    mgr.updateConnection(armed(supabase));

    const listener = jest.fn<(s: TenantStatus | null) => void>();
    mgr.subscribeStatus(CONV, listener);
    mgr.updateConnection({ supabase, accessToken: null, userId: null, armed: false });
    expect(listener).toHaveBeenCalledWith(null);
  });

  it('dispatches a broadcast hint to the matching tenant (event + payload only)', () => {
    const mgr = createRealtimeManager();
    const { supabase, channels } = makeSupabase();
    const onHint = jest.fn();
    mgr.registerTenant(convTenant({ onHint }));
    mgr.updateConnection(armed(supabase));

    const evt = channels[0].events.find((e) => e.event === 'message_created')!;
    evt.cb({ payload: { conversation_id: 'c-9' } });

    expect(onHint).toHaveBeenCalledWith({
      event: 'message_created',
      payload: { conversation_id: 'c-9' },
    });
  });

  it('accepts a new tenant (topic + events + handler) with no manager edit — the A-NTF readiness proof (STORY-1)', () => {
    const mgr = createRealtimeManager();
    const { supabase, channel, channels } = makeSupabase();
    mgr.updateConnection(armed(supabase));

    // A synthetic third tenant on its own topic, shaped exactly like the bell.
    const bellTopic = 'account:uid-1:notifications';
    const onHint = jest.fn();
    mgr.registerTenant({ topic: bellTopic, events: ['notification_created'], onHint });

    expect(channel).toHaveBeenCalledWith(bellTopic, { config: { private: true } });
    const bellChannel = channels[channels.length - 1];
    bellChannel.events.find((e) => e.event === 'notification_created')!.cb({
      payload: { notification_id: 'n-1' },
    });
    expect(onHint).toHaveBeenCalledWith({
      event: 'notification_created',
      payload: { notification_id: 'n-1' },
    });
  });

  it('emits content-free lifecycle telemetry (no ids in props)', () => {
    const mgr = createRealtimeManager();
    const { supabase, channels } = makeSupabase();
    mgr.registerTenant(convTenant());
    mgr.updateConnection(armed(supabase));
    channels[0].subCb!('SUBSCRIBED');

    const joined = getTelemetrySink().filter((e) => e.name === 'realtime.joined');
    expect(joined.length).toBeGreaterThan(0);
    const props = joined[joined.length - 1].props ?? {};
    // Content-free: a topic KIND, never the uid-bearing topic string or any id.
    expect(props).toEqual({ scope: 'conversations' });
  });
});
