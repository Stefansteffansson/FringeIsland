'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { LoadingState } from '@/components/ui/LoadingState';
import {
  groupPreferencesByCategory,
  preferenceSaveFailureMessage,
  renderableChannels,
  storedOnlyChannels,
  type NotificationPreferenceCell,
} from '@/lib/notifications/preferences';

/**
 * FEAT-H033 — the categories x channels preference matrix (NTF-10).
 *
 * Renders entirely FROM THE PAYLOAD. There is no category list, channel list or
 * interruption-grade list in this file: a new registry row appears with no Hub
 * change, which is the same kind-agnostic discipline FEAT-H030 proved for the
 * inbox renderer. Labels are server-authored and rendered verbatim — the H030
 * law is never re-word server copy.
 *
 * Two behaviours worth naming, because both were decisions rather than defaults:
 *
 *  - **A non-suppressible category is not a disabled toggle.** It renders as
 *    locked-on WITH A REASON. A greyed switch with no explanation reads as a bug,
 *    and a click-then-rollback would read as a worse one — so the affordance is
 *    never offered rather than offered and refused. (The route still refuses it
 *    with 409 if called directly; the substrate outranks a stored row regardless.)
 *  - **A non-delivering channel gets no column.** `email` is stored so the
 *    preference binds the day email ships, but rendering a toggle that cannot
 *    change anything would be a promise the Hub can't keep. It is named in one
 *    honest line instead of being hidden.
 */
export function NotificationPreferencesPanel() {
  const [cells, setCells] = useState<NotificationPreferenceCell[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pending, setPending] = useState<Set<string>>(new Set());

  const cellKey = (categoryKey: string, channel: string) => `${categoryKey}:${channel}`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/notifications/preferences');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as { preferences: NotificationPreferenceCell[] };
        if (!cancelled) setCells(body.preferences);
      } catch {
        if (!cancelled) setLoadError('We could not load your preferences. Please try again.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => groupPreferencesByCategory(cells ?? []), [cells]);
  const channels = useMemo(() => renderableChannels(cells ?? []), [cells]);
  const stored = useMemo(() => storedOnlyChannels(cells ?? []), [cells]);

  const channelLabel = useCallback(
    (channel: string) =>
      (cells ?? []).find((c) => c.channel === channel)?.channel_label ?? channel,
    [cells],
  );

  const toggle = useCallback(
    async (cell: NotificationPreferenceCell) => {
      const key = cellKey(cell.category_key, cell.channel);
      const next = !cell.allowed;
      setSaveError(null);
      setPending((p) => new Set(p).add(key));

      // Optimistic: the flip paints before the request is issued, which is what
      // keeps this inside the ADR-U043 B5 interaction budget — the round trip is
      // off the interaction path entirely.
      setCells((prev) =>
        (prev ?? []).map((c) =>
          c.category_key === cell.category_key && c.channel === cell.channel
            ? { ...c, allowed: next }
            : c,
        ),
      );

      try {
        const res = await fetch('/api/notifications/preferences', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: cell.category_key,
            channel: cell.channel,
            allowed: next,
          }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `HTTP ${res.status}`);
        }
      } catch (err) {
        // Visible rollback with an honest message — never a silent revert.
        setCells((prev) =>
          (prev ?? []).map((c) =>
            c.category_key === cell.category_key && c.channel === cell.channel
              ? { ...c, allowed: cell.allowed }
              : c,
          ),
        );
        // A server that answered with a reason is quoted verbatim; a request
        // that never landed gets words instead of "Failed to fetch".
        setSaveError(preferenceSaveFailureMessage(err));
      } finally {
        setPending((p) => {
          const nextPending = new Set(p);
          nextPending.delete(key);
          return nextPending;
        });
      }
    },
    [],
  );

  if (loadError) {
    return (
      <p role="alert" className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {loadError}
      </p>
    );
  }
  if (!cells) return <LoadingState label="Loading your preferences..." />;

  return (
    <section aria-labelledby="notification-preferences-heading" className="mb-10">
      <h2 id="notification-preferences-heading" className="sr-only">
        Notification categories
      </h2>

      {saveError && (
        <p
          role="alert"
          className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {saveError}
        </p>
      )}

      <ul className="divide-y divide-gray-200 rounded border border-gray-200">
        {rows.map((row) => (
          <li key={row.category_key} className="flex items-center justify-between gap-4 p-4">
            <div>
              <p className="font-medium text-gray-900">{row.category_label}</p>
              {/* W-08's sibling (gate walk 2026-07-30): this read "Always on —
                  these tell you about your own account and access", a sentence
                  written for `account` back when it was the ONLY non-suppressible
                  category. GB-3 made `asks` the second, and it inherited copy
                  that was false about it — questions waiting for your answer are
                  not about your account and access.

                  Deliberately NOT fixed with a category -> sentence map: this
                  file holds no category list, and adding one to explain
                  categories would undo the very discipline the header claims.
                  The line is now true of every non-suppressible category. The
                  category-specific WHY belongs in the registry beside
                  `member_suppressible`, server-authored and rendered verbatim —
                  that is a contract change, recorded rather than smuggled in. */}
              {!row.member_suppressible && (
                <p className="mt-1 text-xs text-gray-600">
                  Always on — this one can&rsquo;t be switched off.
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              {channels.map((channel) => {
                const cell = row.cells.find((c) => c.channel === channel);
                if (!cell) return null;
                const key = cellKey(row.category_key, channel);

                // Locked-on: stated, not a disabled mystery, and never clickable.
                if (!row.member_suppressible) {
                  return (
                    <span
                      key={key}
                      data-testid={`pref-locked-${row.category_key}-${channel}`}
                      className="text-sm font-medium text-gray-500"
                    >
                      On
                    </span>
                  );
                }

                return (
                  <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                    {channels.length > 1 && <span>{channelLabel(channel)}</span>}
                    <input
                      type="checkbox"
                      role="switch"
                      aria-label={`${row.category_label} — ${channelLabel(channel)}`}
                      data-testid={`pref-toggle-${row.category_key}-${channel}`}
                      checked={cell.allowed}
                      disabled={pending.has(key)}
                      onChange={() => void toggle(cell)}
                      className="h-4 w-4"
                    />
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      {/* W-08 (gate walk 2026-07-27): this line used to end "your choice will
          apply as soon as it is" — refuting itself inside one clause, because
          there is nothing to switch and so no email choice for "your choice" to
          point at. The member went looking for a setting that does not exist.
          The referent that IS real is the switches above, which govern a
          category however it is delivered; naming them keeps the reassurance
          and drops the phantom. */}
      {stored.length > 0 && (
        <p className="mt-4 text-xs text-gray-600" data-testid="undelivered-channel-note">
          {stored.join(' and ')} delivery is not live yet, so there is nothing to switch
          here — the choices above cover every channel, so they will apply to it
          the day it arrives.
        </p>
      )}
    </section>
  );
}
