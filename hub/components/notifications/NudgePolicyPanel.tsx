'use client';

import { useCallback, useEffect, useState } from 'react';
import type { NudgePolicyView } from '@/lib/notifications/preferences';

const PLATFORM_ANNOUNCEMENT_KEY = 'realtime_hint_platform_announcements';

/**
 * FEAT-H033 — the operator nudge console (board rows ND-4 + ND-5).
 *
 * Closes N-C's NC-2a deferrals. `ds5_config.realtime_hint_platform_announcements`
 * shipped as data with **no door**; its own migration comment said the operator
 * surface arrives with N-D. The general per-category nudge switch was cut as
 * gold-plating when it would have been a standalone build, and rides along here.
 *
 * THE COST LINE IS THE POINT, not decoration. N-C measured that a platform-wide
 * announcement is billed **per recipient whether or not anyone is listening** —
 * 857 delivery rows against a reachable population of 1,274 — so the dominant
 * cost tracks headcount, not concurrency, and "hardly anyone is online" is not a
 * mitigation. That number previously lived only in a session bridge, where the
 * person about to flip the switch would never see it. Showing it at the moment of
 * the decision is the cheapest guardrail available, and it is why board row ND-6
 * (the ~25x-cheaper shared topic) could be deferred honestly: the expensive path
 * is switched off, and this line is what will tell an operator when that changes.
 *
 * Renders NOTHING for a non-admin. The gate is the contract — the platform
 * refuses the read and the write with 42501 (ADR-U038: a route or a hidden
 * component may never be the only place an authorization decision is enforced) —
 * so a 403 here means "not an operator", which is not an error worth shouting at
 * an ordinary member.
 */
export function NudgePolicyPanel() {
  const [policy, setPolicy] = useState<NudgePolicyView | null>(null);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications/nudge-policy');
      if (res.status === 403 || res.status === 401) {
        setVisible(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as { policy: NudgePolicyView };
      setPolicy(body.policy);
      setVisible(true);
    } catch (err) {
      // An operator who IS one deserves to see a failure; a member never gets here.
      setError((err as Error).message);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const put = useCallback(
    async (body: Record<string, unknown>, busyKey: string) => {
      setBusy(busyKey);
      setError(null);
      try {
        const res = await fetch('/api/notifications/nudge-policy', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(payload?.error ?? `HTTP ${res.status}`);
        }
        await load();
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [load],
  );

  if (!visible || !policy) return null;

  const platformNudge =
    policy.config.find((c) => c.key === PLATFORM_ANNOUNCEMENT_KEY)?.value === 'true';

  return (
    <section
      aria-labelledby="nudge-policy-heading"
      data-testid="nudge-policy-panel"
      className="rounded border border-amber-200 bg-amber-50 p-4"
    >
      <h2 id="nudge-policy-heading" className="text-lg font-semibold text-gray-900">
        Operator: live-update policy
      </h2>
      <p className="mt-1 text-sm text-gray-700">
        Controls whether a delivered notification also updates open bells in real time.
        Delivery itself is never affected — only how loudly it arrives.
      </p>

      {error && (
        <p role="alert" className="mt-3 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 border-t border-amber-200 pt-4">
        <label className="flex items-center gap-3 text-sm text-gray-900">
          <input
            type="checkbox"
            role="switch"
            data-testid="nudge-platform-announcements"
            checked={platformNudge}
            disabled={busy === PLATFORM_ANNOUNCEMENT_KEY}
            onChange={() =>
              void put(
                { key: PLATFORM_ANNOUNCEMENT_KEY, value: platformNudge ? 'false' : 'true' },
                PLATFORM_ANNOUNCEMENT_KEY,
              )
            }
            className="h-4 w-4"
          />
          <span>Live-update bells for platform-wide announcements</span>
        </label>
        <p data-testid="nudge-cost-line" className="mt-2 text-xs font-medium text-amber-900">
          Turning this on means each platform-wide announcement emits about{' '}
          {policy.platform_reach.toLocaleString()} real-time messages — one per member,
          charged whether or not they are online.
        </p>
      </div>

      <div className="mt-5 border-t border-amber-200 pt-4">
        <h3 className="text-sm font-semibold text-gray-900">Per-category live updates</h3>
        <ul className="mt-2 divide-y divide-amber-200">
          {policy.categories.map((category) => (
            <li key={category.key} className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm text-gray-800">{category.label}</span>
              <input
                type="checkbox"
                role="switch"
                aria-label={`Live updates for ${category.label}`}
                data-testid={`nudge-category-${category.key}`}
                checked={category.nudge}
                disabled={busy === category.key}
                onChange={() =>
                  void put({ category: category.key, nudge: !category.nudge }, category.key)
                }
                className="h-4 w-4"
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
