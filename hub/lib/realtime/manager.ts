import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H027 (TASK-CC-03) — the ADR-U039 channel manager: the Hub's first
 * realtime abstraction, generalizing what `session-guard.ts` proved as the
 * doctrine's first tenant (session-guard is NOT migrated onto it — No-go).
 *
 * One module owning the mechanics every tenant would otherwise repeat by hand:
 *  - join a PRIVATE topic on the ONE shared socket (the AuthContext browser
 *    client — never a second client), after `realtime.setAuth(access_token)`;
 *  - exactly one subscription per armed topic, idempotent across remounts —
 *    tenants register declaratively (topic + events + handler) and a topic's
 *    single channel is shared by all its tenants;
 *  - channel status (subscribed / reconnecting / closed) surfaced to tenants
 *    with a rejoin callback, so a comm surface can reconcile (STORY-6);
 *  - full teardown on sign-out / identity change (STORY-7);
 *  - the arming rule — a live connection only exists for a FIM with a session
 *    (the caller enforces `identity === 'fim' && session !== null`; the manager
 *    joins nothing until `updateConnection` hands it an armed connection).
 *
 * Registration is the extension surface: the notification bell joins at A-NTF
 * by calling `registerTenant`, with no manager edit (STORY-1). Verify-on-signal
 * is the tenants' job — the manager only delivers the content-free hint; every
 * pixel that changes comes from a tenant's authorized fetch, never the payload.
 *
 * Telemetry is content-free: a topic KIND ('conversations' / 'forum' / …),
 * never the uid-bearing topic string or any payload id (the H012 discipline).
 */

export type TenantStatus = 'subscribed' | 'reconnecting' | 'closed';

export type RealtimeHint = {
  event: string;
  payload: Record<string, unknown>;
};

export type Tenant = {
  /** The doctrine `<area>:<subject-id>:<purpose>` topic (private channel). */
  topic: string;
  /** Broadcast event names this tenant handles (open set — TEXT, no enum). */
  events: string[];
  /** A hint arrived: invalidate + fetch through the contract, never render the payload. */
  onHint: (hint: RealtimeHint) => void;
  /** Optional: channel state changed — reconcile, and `rejoin()` to re-subscribe. */
  onStatus?: (status: TenantStatus, rejoin: () => void) => void;
};

export type Connection = {
  supabase: SupabaseClient | null;
  accessToken: string | null;
  /** The auth uid — the identity anchor; a change re-arms the socket fresh. */
  userId: string | null;
  /** The session-guard arming rule, evaluated by the caller. */
  armed: boolean;
};

export type RealtimeManager = {
  registerTenant(tenant: Tenant): () => void;
  updateConnection(connection: Connection): void;
  getStatus(topic: string): TenantStatus | null;
  /**
   * Watch a topic's channel status without being a tenant (STORY-6). A mounted
   * comm surface subscribes to show its reconnecting affordance and reconcile
   * on recovery. `null` is delivered when the channel is torn down. Returns an
   * unsubscribe.
   */
  subscribeStatus(topic: string, listener: (status: TenantStatus | null) => void): () => void;
  teardownAll(): void;
};

/** Content-free telemetry scope — the topic's purpose, never its subject id. */
function topicKind(topic: string): string {
  const purpose = topic.split(':').pop();
  return purpose ?? 'other';
}

type ChannelRecord = {
  channel: RealtimeChannel;
  status: TenantStatus;
};

/**
 * A manager is a closure over its own registry so tests get an isolated
 * instance (`createRealtimeManager()`), while the app shares the module
 * singleton (`realtimeManager`). Same shape as the module-level session caches.
 */
export function createRealtimeManager(): RealtimeManager {
  const tenantsByTopic = new Map<string, Set<Tenant>>();
  const channelsByTopic = new Map<string, ChannelRecord>();
  const statusListenersByTopic = new Map<string, Set<(status: TenantStatus | null) => void>>();
  let live: { supabase: SupabaseClient; accessToken: string; userId: string } | null = null;

  function eventsFor(topic: string): string[] {
    const events = new Set<string>();
    for (const t of tenantsByTopic.get(topic) ?? []) {
      for (const e of t.events) events.add(e);
    }
    return [...events];
  }

  function dispatchHint(topic: string, event: string, payload: Record<string, unknown>): void {
    emitTelemetry('realtime.hint', { scope: topicKind(topic), event });
    for (const t of tenantsByTopic.get(topic) ?? []) {
      if (t.events.includes(event)) t.onHint({ event, payload });
    }
  }

  function notifyStatus(topic: string, status: TenantStatus): void {
    const rejoin = () => rejoinTopic(topic);
    for (const t of tenantsByTopic.get(topic) ?? []) {
      t.onStatus?.(status, rejoin);
    }
    notifyStatusSubscribers(topic, status);
  }

  function notifyStatusSubscribers(topic: string, status: TenantStatus | null): void {
    for (const listener of statusListenersByTopic.get(topic) ?? []) listener(status);
  }

  function onSubscribeStatus(topic: string, raw: string): void {
    const record = channelsByTopic.get(topic);
    if (!record) return;
    if (raw === 'SUBSCRIBED') {
      record.status = 'subscribed';
      emitTelemetry('realtime.joined', { scope: topicKind(topic) });
    } else if (raw === 'CHANNEL_ERROR') {
      record.status = 'reconnecting';
      // A private-channel authorization refusal surfaces as CHANNEL_ERROR.
      emitTelemetry('realtime.refused', { scope: topicKind(topic) });
    } else if (raw === 'TIMED_OUT') {
      record.status = 'reconnecting';
      emitTelemetry('realtime.lost', { scope: topicKind(topic) });
    } else if (raw === 'CLOSED') {
      record.status = 'closed';
    }
    notifyStatus(topic, record.status);
  }

  function joinTopic(topic: string): void {
    if (!live) return;
    if (channelsByTopic.has(topic)) return; // exactly one per topic
    if (!tenantsByTopic.get(topic)?.size) return;

    let builder = live.supabase.channel(topic, { config: { private: true } });
    for (const event of eventsFor(topic)) {
      builder = builder.on('broadcast', { event }, (msg: { payload?: Record<string, unknown> }) =>
        dispatchHint(topic, event, msg?.payload ?? {}),
      );
    }
    const channel = builder.subscribe((status: string) => onSubscribeStatus(topic, status));
    channelsByTopic.set(topic, { channel, status: 'reconnecting' });
  }

  function leaveTopic(topic: string): void {
    const record = channelsByTopic.get(topic);
    if (!record) return;
    live?.supabase.removeChannel(record.channel);
    channelsByTopic.delete(topic);
    // The channel is gone — a watching surface is no longer degraded, it has no
    // comm channel at all (sign-out / navigation away).
    notifyStatusSubscribers(topic, null);
  }

  function rejoinTopic(topic: string): void {
    leaveTopic(topic);
    emitTelemetry('realtime.rejoined', { scope: topicKind(topic) });
    joinTopic(topic);
  }

  function teardownAllChannels(): void {
    for (const topic of [...channelsByTopic.keys()]) leaveTopic(topic);
  }

  function joinAll(): void {
    for (const topic of tenantsByTopic.keys()) joinTopic(topic);
  }

  return {
    registerTenant(tenant: Tenant): () => void {
      let set = tenantsByTopic.get(tenant.topic);
      if (!set) {
        set = new Set();
        tenantsByTopic.set(tenant.topic, set);
      }
      set.add(tenant);
      // Join now if armed; otherwise the next `updateConnection` arms it.
      joinTopic(tenant.topic);

      return () => {
        const current = tenantsByTopic.get(tenant.topic);
        if (!current) return;
        current.delete(tenant);
        if (current.size === 0) {
          tenantsByTopic.delete(tenant.topic);
          leaveTopic(tenant.topic); // last tenant left — tear the socket down
        }
      };
    },

    updateConnection(connection: Connection): void {
      const { supabase, accessToken, userId, armed } = connection;
      const effective = armed && !!supabase && !!accessToken && !!userId;

      if (!effective) {
        // Disarm (sign-out / Mist / sessionless): drop every channel; tenant
        // registrations persist and rejoin when the arming rule holds again.
        if (live) {
          teardownAllChannels();
          live = null;
        }
        return;
      }

      const identityChanged = live === null || live.userId !== userId;
      live = { supabase: supabase!, accessToken: accessToken!, userId: userId! };
      // The socket must carry the caller JWT before any private join / re-auth.
      supabase!.realtime.setAuth(accessToken!);
      if (identityChanged) teardownAllChannels(); // never leak a prior identity's channels
      joinAll();
    },

    getStatus(topic: string): TenantStatus | null {
      return channelsByTopic.get(topic)?.status ?? null;
    },

    subscribeStatus(topic: string, listener: (status: TenantStatus | null) => void): () => void {
      let set = statusListenersByTopic.get(topic);
      if (!set) {
        set = new Set();
        statusListenersByTopic.set(topic, set);
      }
      set.add(listener);
      return () => {
        const current = statusListenersByTopic.get(topic);
        if (!current) return;
        current.delete(listener);
        if (current.size === 0) statusListenersByTopic.delete(topic);
      };
    },

    teardownAll(): void {
      teardownAllChannels();
      live = null;
    },
  };
}

/** The app-wide manager (one per browser tab), sharing the AuthContext socket. */
export const realtimeManager = createRealtimeManager();
