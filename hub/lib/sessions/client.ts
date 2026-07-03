/**
 * FEAT-H012 — the Hub's API-first sessions client (IDN-11).
 *
 * The browser surface reads + revokes the member's own sessions ONLY through
 * the FEAT-PC009-backed BFF at `/api/sessions` — never a direct Supabase call
 * (ADR-U009 / Hub CLAUDE.md narrow-exception rule; the substrate has no
 * client-reachable table surface anyway). Thin transports that surface the
 * route's error message on failure — session PII (UA/IP) renders to the
 * member and never enters telemetry or error payloads.
 */
import type { DeviceSession } from '@/lib/sessions/queries';

export type { DeviceSession } from '@/lib/sessions/queries';

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? fallback;
}

/** The caller's own per-device session inventory, newest-last-active first. */
export async function fetchSessions(): Promise<DeviceSession[]> {
  const res = await fetch('/api/sessions');
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
  const data = (await res.json()) as { sessions: DeviceSession[] };
  return data.sessions;
}

/** Targeted remote sign-out of ONE of the caller's own sessions. */
export async function revokeSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(await errorMessage(res, `Request failed (${res.status})`));
  }
}
