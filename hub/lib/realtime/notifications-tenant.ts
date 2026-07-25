'use client';

import { realtimeManager, type Tenant } from '@/lib/realtime/manager';
import { invalidateNotificationsCache } from '@/lib/notifications/client';

/**
 * FEAT-H032 (TASK-NC-04) — the app-wide notifications tenant (NTF-9).
 *
 * One subscription to `account:<auth_uid>:notifications` (FEAT-PD015's
 * per-member channel) serves every notification consumer — the bell badge, the
 * recent dropdown, and the `/notifications` inbox. Deliberately built on the
 * C-C conversations-tenant shape rather than a new mechanism: FEAT-H027's
 * manager docstring names this tenant as its extension case, so registration
 * alone is the whole integration and `manager.ts` is untouched.
 *
 * On a hint the tenant does exactly two things and never a third: drop the
 * notifications session cache so the next read is fresh, and dispatch the
 * `notificationsChanged` window event (the `refreshNavigation` /
 * `conversationsChanged` house pattern). Mounted surfaces re-read through their
 * existing couriers. **No payload content is rendered anywhere** — the hint
 * carries only a row id, and even that is used solely as correlation, never as
 * data (verify-on-signal, ADR-U039:24). A forged or misdelivered id therefore
 * changes nothing on screen: the re-read is authorized and returns only the
 * caller's own rows.
 *
 * Arming is the manager's rule, inherited: a Mist or a sessionless visitor
 * registers nothing (Mists hold no durable notification rows — board NB-8), and
 * sign-out unregisters.
 */

/** Cross-component nudge for the notification surfaces — the house event
 *  pattern, mirroring `CONVERSATIONS_CHANGED_EVENT`. */
export const NOTIFICATIONS_CHANGED_EVENT = 'notificationsChanged';

/**
 * Coalescing window. A member added to several groups at once, or a fan-out
 * that lands as a burst, produces several hints in quick succession; without
 * this each would trigger its own re-read and the socket saving would be spent
 * on request volume instead (a named rabbit hole in FEAT-H032). One trailing
 * dispatch per window is enough — the re-read is a full refresh, not a delta,
 * so collapsing N hints into one loses nothing.
 */
export const NOTIFICATION_HINT_COALESCE_MS = 250;

let coalesceTimer: ReturnType<typeof setTimeout> | null = null;

/** Test seam: drop any pending coalesced dispatch. */
export function resetNotificationHintCoalescing(): void {
  if (coalesceTimer !== null) {
    clearTimeout(coalesceTimer);
    coalesceTimer = null;
  }
}

/** The per-member notifications topic — the one the bell watches for its
 *  reconnecting affordance. Null when there's no member to key it. */
export function notificationsTopic(userId: string | null): string | null {
  return userId ? `account:${userId}:notifications` : null;
}

/** The declarative tenant for a member's notification channel. */
export function notificationsTenant(userId: string): Tenant {
  return {
    topic: notificationsTopic(userId)!,
    // Open set (TEXT, per the manager's contract) — a kind invented in a later
    // wave rides this same event with no edit here.
    events: ['notification'],
    onHint: () => {
      // Verify-on-signal: invalidate, then let consumers re-read through the
      // authorized path. The payload is never read for content.
      invalidateNotificationsCache();
      if (typeof window === 'undefined') return;

      if (coalesceTimer !== null) clearTimeout(coalesceTimer);
      coalesceTimer = setTimeout(() => {
        coalesceTimer = null;
        // Invalidate again on the trailing edge: hints that arrived DURING the
        // window may have landed after a consumer's re-read began.
        invalidateNotificationsCache();
        window.dispatchEvent(new CustomEvent(NOTIFICATIONS_CHANGED_EVENT));
      }, NOTIFICATION_HINT_COALESCE_MS);
    },
  };
}

/** Register while armed; the returned teardown unregisters on sign-out or an
 *  identity change. Called from `useRealtimeTenants` beside the conversations
 *  tenant, so both share the one socket the manager owns.
 *
 *  The teardown ALSO cancels any pending coalesced dispatch. Without that the
 *  timer outlives the tenant: a hint arriving moments before sign-out would
 *  fire ~250 ms later, dispatch `notificationsChanged`, and send a still-mounted
 *  bell to fetch with a dead session. Nothing may survive the identity change
 *  (the FEAT-H027 STORY-7 guarantee) — a module-level timer included. */
export function registerNotificationsTenant(userId: string): () => void {
  const unregister = realtimeManager.registerTenant(notificationsTenant(userId));
  return () => {
    resetNotificationHintCoalescing();
    unregister();
  };
}
