'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchSessions, revokeSession, type DeviceSession } from '@/lib/sessions/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InlineError } from '@/components/ui/InlineError';
import { LoadingState } from '@/components/ui/LoadingState';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H012 — the sessions surface container (IDN-11, STORY-1/2). Owns the
 * API-first inventory read + the ConfirmModal-gated targeted revoke over the
 * FEAT-PC009 contracts. Every mutation RE-READS the list (single source of
 * truth — never an optimistic splice); a failed revoke surfaces an error and
 * re-reads to the truthful state. Revoking the CURRENT device carries distinct
 * copy and ends in a local signOut (the page gate then redirects). Telemetry
 * is content-free — user agents and IPs render to the member only (V2).
 */

/** Honest lightweight device line — a few heuristics, never a UA taxonomy
 *  (FEAT-H012 rabbit-hole guard). */
export function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device';
  const browser = userAgent.includes('Edg/')
    ? 'Edge'
    : userAgent.includes('Firefox/')
      ? 'Firefox'
      : userAgent.includes('Chrome/')
        ? 'Chrome'
        : userAgent.includes('Safari/')
          ? 'Safari'
          : null;
  const os = userAgent.includes('Windows')
    ? 'Windows'
    : userAgent.includes('iPhone') || userAgent.includes('iPad')
      ? 'iOS'
      : userAgent.includes('Android')
        ? 'Android'
        : userAgent.includes('Mac OS')
          ? 'Mac'
          : userAgent.includes('Linux')
            ? 'Linux'
            : null;
  if (!browser && !os) return 'Unknown device';
  if (browser && os) return `${browser} · ${os}`;
  return browser ?? (os as string);
}

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export function SessionsPanel() {
  const { signOut } = useAuth();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [revokePending, setRevokePending] = useState<DeviceSession | null>(null);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const resolved = await fetchSessions();
        if (!active) return;
        setSessions(resolved);
        emitTelemetry('sessions.viewed', { count: resolved.length });
      } catch (err) {
        if (!active) return;
        setError((err as Error).message || 'Failed to load sessions');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [nonce]);

  const confirmRevoke = useCallback(async () => {
    if (!revokePending) return;
    const target = revokePending;
    setBusy(true);
    setActionError(null);
    try {
      await revokeSession(target.id);
      emitTelemetry('sessions.revoked', { current: target.is_current });
      setRevokePending(null);
      if (target.is_current) {
        // The page gate redirects once auth state clears.
        await signOut();
        return;
      }
      reload();
    } catch (err) {
      setRevokePending(null);
      setActionError((err as Error).message || 'Failed to sign out the session');
      reload(); // truthful state, never an optimistic assumption
    } finally {
      setBusy(false);
    }
  }, [revokePending, signOut, reload]);

  if (loading) return <LoadingState label="Loading your sessions..." />;
  if (error) {
    return (
      <div className="space-y-3">
        <InlineError message={error} />
        <button
          type="button"
          onClick={reload}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {actionError && <InlineError message={actionError} />}

      <ul className="space-y-3">
        {sessions.map((s) => (
          <li
            key={s.id}
            data-testid="session-row"
            className="flex items-start justify-between gap-4 rounded-lg border border-gray-200 bg-white p-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">
                  {describeDevice(s.user_agent)}
                </span>
                {s.is_current && (
                  <span
                    data-testid="this-device"
                    className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                  >
                    This device
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-gray-600">
                {s.ip ? `IP ${s.ip} · ` : ''}
                last active {formatTime(s.last_active)} · signed in {formatTime(s.created_at)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setRevokePending(s)}
              className="shrink-0 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
            >
              Sign out
            </button>
          </li>
        ))}
      </ul>

      <p className="text-xs text-gray-500">
        Signing out another device takes effect there within moments when it is online, and no
        later than its next check-in.
      </p>

      <ConfirmModal
        isOpen={revokePending !== null}
        variant="warning"
        title={revokePending?.is_current ? 'Sign out here?' : 'Sign out this device?'}
        message={
          revokePending?.is_current
            ? 'This will sign you out on this device, right now.'
            : 'That device will be signed out shortly — within moments when it is online.'
        }
        confirmText="Yes, sign out"
        cancelText="Cancel"
        busy={busy}
        onConfirm={confirmRevoke}
        onCancel={() => setRevokePending(null)}
      />
    </div>
  );
}
