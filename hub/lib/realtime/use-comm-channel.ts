'use client';

import { useEffect, useRef, useState } from 'react';
import { realtimeManager, type TenantStatus } from '@/lib/realtime/manager';

/**
 * FEAT-H027 (TASK-CC-06) — the comm-surface reconciliation hook (STORY-6).
 *
 * A mounted comm surface (the inbox, the open detail, the forum section, the
 * badge) watches its channel's status through the manager and:
 *  - reports `reconnecting` for a QUIET inline affordance — but only once a
 *    channel that WAS subscribed has left that state, so the first connect
 *    never flashes the indicator ("leaves the subscribed state", not "is still
 *    connecting");
 *  - reconciles (the surface's own invalidate + re-fetch) on RECOVERY
 *    (degraded → subscribed) and on tab-visibility REGAIN — durable-first makes
 *    a re-read sufficient; there is no missed-event replay;
 *  - while degraded AND the tab is visible, runs a slow poll so a surface that
 *    can't hear hints stays honest; the poll stops the moment the socket
 *    returns or the tab hides (a hidden tab polls nothing).
 *
 * The indicator is derived from a topic-keyed state, so it resets for free when
 * the watched topic changes (group navigation) and no setState runs in the
 * effect body (the `react-hooks/set-state-in-effect` rule).
 */

/**
 * Slow visible-tab reconciliation poll. Mirrors the session-guard
 * `VISIBLE_POLL_MS` (FEAT-H012) deliberately rather than importing it, so the
 * comm poll and the session-guard poll stay independently tunable.
 */
export const COMM_POLL_MS = 60_000;

export function useCommChannel(
  topic: string | null,
  onReconcile: () => void,
): { reconnecting: boolean } {
  // The topic currently known to be degraded. Deriving `reconnecting` from this
  // (rather than a bare boolean) means a topic change clears the affordance by
  // itself, and every state write lives inside a callback — never the effect body.
  const [degradedTopic, setDegradedTopic] = useState<string | null>(null);

  // Latest reconcile in a ref — a fresh callback each render must not re-run the
  // subscription/poll effect (it is keyed on the topic alone).
  const onReconcileRef = useRef(onReconcile);
  useEffect(() => {
    onReconcileRef.current = onReconcile;
  }, [onReconcile]);

  useEffect(() => {
    if (!topic) return;

    // Seed the baseline WITHOUT rendering: a surface that mounts mid-degrade
    // treats the current status as its baseline — only a transition THIS
    // instance observes counts as "left the subscribed state".
    let wasSubscribed = realtimeManager.getStatus(topic) === 'subscribed';
    let degraded = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const stopPoll = () => {
      if (pollTimer !== null) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    };
    const armPoll = () => {
      if (degraded && document.visibilityState === 'visible' && pollTimer === null) {
        pollTimer = setInterval(() => {
          if (document.visibilityState === 'visible') onReconcileRef.current();
        }, COMM_POLL_MS);
      }
    };

    const applyStatus = (status: TenantStatus | null) => {
      if (status === 'subscribed') {
        const recovered = degraded; // it had left subscribed, now it's back
        wasSubscribed = true;
        degraded = false;
        setDegradedTopic((t) => (t === topic ? null : t));
        stopPoll();
        if (recovered) onReconcileRef.current();
      } else if (status === null) {
        // No channel (sign-out / navigation away) — not a degraded surface.
        degraded = false;
        setDegradedTopic((t) => (t === topic ? null : t));
        stopPoll();
      } else if (wasSubscribed) {
        // 'reconnecting' | 'closed' after having been subscribed = degraded.
        degraded = true;
        setDegradedTopic(topic);
        armPoll();
      }
    };

    const unsubscribe = realtimeManager.subscribeStatus(topic, applyStatus);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        onReconcileRef.current(); // catch-up on focus regain
        armPoll();
      } else {
        stopPoll(); // hidden tab polls nothing
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
      stopPoll();
    };
  }, [topic]);

  return { reconnecting: topic !== null && degradedTopic === topic };
}
