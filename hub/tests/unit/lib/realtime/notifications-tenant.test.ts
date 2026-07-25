import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

const invalidateNotificationsCache = jest.fn();
jest.mock('@/lib/notifications/client', () => ({
  invalidateNotificationsCache: () => invalidateNotificationsCache(),
}));
jest.mock('@/lib/realtime/manager', () => ({
  realtimeManager: { registerTenant: jest.fn() },
}));

import {
  notificationsTopic,
  notificationsTenant,
  registerNotificationsTenant,
  resetNotificationHintCoalescing,
  NOTIFICATIONS_CHANGED_EVENT,
  NOTIFICATION_HINT_COALESCE_MS,
} from '@/lib/realtime/notifications-tenant';
import { realtimeManager } from '@/lib/realtime/manager';

/**
 * FEAT-H032 (TASK-NC-04) — the notifications tenant.
 *
 * LABELLED HONESTLY: **test-after**. The tenant was written first, then this
 * suite. Not a red-first TDD cycle and not counted as one.
 *
 * What it protects is the part that is easy to get wrong and invisible when
 * wrong: that a burst of hints collapses into ONE re-read (otherwise the socket
 * saving is spent on request volume), and that nothing in the hint payload ever
 * reaches a consumer (verify-on-signal — ADR-U039:24).
 */
describe('FEAT-H032 — notifications tenant (N-C)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    invalidateNotificationsCache.mockReset();
    resetNotificationHintCoalescing();
  });
  afterEach(() => {
    resetNotificationHintCoalescing();
    jest.useRealTimers();
  });

  describe('topic', () => {
    it('keys the ADR-U039 per-member topic on the auth uid', () => {
      expect(notificationsTopic('uid-1')).toBe('account:uid-1:notifications');
    });

    it('is null with no member — a Mist or sessionless visitor watches nothing', () => {
      expect(notificationsTopic(null)).toBeNull();
    });
  });

  describe('the tenant declaration', () => {
    it('declares the topic and an OPEN event set', () => {
      const t = notificationsTenant('uid-1');
      expect(t.topic).toBe('account:uid-1:notifications');
      expect(t.events).toContain('notification');
      // open set: TEXT event names, no sealed enum (extensibility)
      expect(Array.isArray(t.events)).toBe(true);
    });
  });

  describe('onHint — verify-on-signal', () => {
    it('invalidates the cache immediately, before any dispatch', () => {
      const t = notificationsTenant('uid-1');
      t.onHint({ event: 'notification', payload: { id: 'n-1' } });
      // eager invalidation: a consumer re-reading for any other reason during
      // the coalescing window must not be served a stale cached count
      expect(invalidateNotificationsCache).toHaveBeenCalled();
    });

    it('coalesces a burst into exactly ONE dispatch', () => {
      const listener = jest.fn();
      window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
      const t = notificationsTenant('uid-1');

      // a member added to several groups at once
      t.onHint({ event: 'notification', payload: { id: 'n-1' } });
      t.onHint({ event: 'notification', payload: { id: 'n-2' } });
      t.onHint({ event: 'notification', payload: { id: 'n-3' } });

      expect(listener).not.toHaveBeenCalled(); // trailing edge, not leading
      jest.advanceTimersByTime(NOTIFICATION_HINT_COALESCE_MS);
      expect(listener).toHaveBeenCalledTimes(1);

      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
    });

    it('dispatches again for a LATER burst — coalescing is a window, not a latch', () => {
      const listener = jest.fn();
      window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
      const t = notificationsTenant('uid-1');

      t.onHint({ event: 'notification', payload: { id: 'n-1' } });
      jest.advanceTimersByTime(NOTIFICATION_HINT_COALESCE_MS);
      expect(listener).toHaveBeenCalledTimes(1);

      t.onHint({ event: 'notification', payload: { id: 'n-2' } });
      jest.advanceTimersByTime(NOTIFICATION_HINT_COALESCE_MS);
      expect(listener).toHaveBeenCalledTimes(2);

      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
    });

    it('carries NO payload content on the dispatched event', () => {
      let seen: unknown = 'untouched';
      const listener = (e: Event) => {
        seen = (e as CustomEvent).detail;
      };
      window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);

      const t = notificationsTenant('uid-1');
      t.onHint({
        event: 'notification',
        // even if the substrate ever leaked content, the tenant must not relay it
        payload: { id: 'n-1', title: 'LEAK', body: 'LEAK', type: 'LEAK' },
      });
      jest.advanceTimersByTime(NOTIFICATION_HINT_COALESCE_MS);

      // no detail at all — consumers re-read through the authorized path
      expect(seen).toBeNull();
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
    });

    it('re-invalidates on the trailing edge — a hint landing mid-window is not lost', () => {
      const t = notificationsTenant('uid-1');
      t.onHint({ event: 'notification', payload: { id: 'n-1' } });
      const afterFirst = invalidateNotificationsCache.mock.calls.length;
      jest.advanceTimersByTime(NOTIFICATION_HINT_COALESCE_MS);
      expect(invalidateNotificationsCache.mock.calls.length).toBeGreaterThan(afterFirst);
    });
  });

  describe('teardown — nothing survives the identity change (STORY-7)', () => {
    it('cancels a PENDING coalesced dispatch on unregister', () => {
      // The leak this guards: a hint arriving moments before sign-out would
      // otherwise fire ~250ms later and send a still-mounted bell to fetch with
      // a dead session. Found while investigating an intermittent sign-out E2E
      // failure that the pre-change control did not reproduce.
      const unregisterInner = jest.fn();
      (realtimeManager.registerTenant as jest.Mock).mockReturnValue(unregisterInner);

      const listener = jest.fn();
      window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);

      const teardown = registerNotificationsTenant('uid-1');
      const tenant = (realtimeManager.registerTenant as jest.Mock).mock
        .calls[0][0] as ReturnType<typeof notificationsTenant>;

      tenant.onHint({ event: 'notification', payload: { id: 'n-1' } });
      teardown(); // sign-out lands inside the coalescing window

      jest.advanceTimersByTime(NOTIFICATION_HINT_COALESCE_MS * 4);
      expect(listener).not.toHaveBeenCalled();
      expect(unregisterInner).toHaveBeenCalledTimes(1);

      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, listener);
    });
  });
});
