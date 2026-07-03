'use client';

import { useCallback, useEffect, useRef } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Identity } from '@/lib/auth/mist';
import { replaceLocation } from '@/lib/auth/redirect';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H012 — the session guard: the Hub's first tenant of the ADR-U039
 * socket doctrine (IDN-11, STORY-3/4/5).
 *
 * One private-topic subscription per authenticated FIM on the shared socket
 * (`account:<auth_uid>:sessions` — the §4-named session-signal channel). The
 * `session_revoked` hint is server-originated (FEAT-PC009's SECURITY DEFINER
 * emits it) and content-free; this guard treats it as a HINT, never an
 * authority: on a hint naming THIS device's session it VERIFIES with the auth
 * server (`getUser()` — GoTrue checks session-row existence) and only signs
 * out on refusal, so a spoofed or stale hint is a no-op by construction.
 * A hint naming another session just nudges an open /sessions page to re-read.
 *
 * Fallback guarantee (doctrine rule 6): revalidation on focus/visibility plus
 * a slow visible-tab interval — a device that missed the hint (offline,
 * asleep) is caught on its next wake, and at the latest within the interval.
 * The legacy oracle (`hub-legacy/lib/auth/AuthContext.tsx`) polled at 10s and
 * signed out blindly on broadcast; v2 relaxes the poll (the hint carries the
 * immediacy) and adds verify-on-signal (the doctrine's load-bearing rule).
 *
 * Deadlock rule holds: nothing here runs inside `onAuthStateChange`, and the
 * validation path calls the Auth server, never PostgREST.
 */

/** Cross-component nudge for an open /sessions page (analogous to the
 *  `refreshNavigation` house mechanism, scoped to session state). */
export const SESSIONS_CHANGED_EVENT = 'sessionsChanged';

/** Slow visible-tab fallback poll (FEAT-H012 STORY-4; tuned constant). */
const VISIBLE_POLL_MS = 60_000;

/** The `session_id` claim of a Supabase access token (documented to correlate
 *  with `auth.sessions.id`). Null on anything unparseable. */
export function sessionIdOfToken(accessToken: string | null | undefined): string | null {
  if (!accessToken) return null;
  try {
    const part = accessToken.split('.')[1];
    if (!part) return null;
    const payload = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as {
      session_id?: string;
    };
    return payload.session_id ?? null;
  } catch {
    return null;
  }
}

export function useSessionGuard(
  supabase: SupabaseClient,
  session: Session | null,
  identity: Identity,
) {
  // The guard is armed only for a FIM with a live session.
  const armed = identity === 'fim' && session !== null;
  const ownSessionId = sessionIdOfToken(session?.access_token);
  const userId = session?.user?.id ?? null;

  // Serialize validations — a focus + interval + hint pile-up runs one check.
  const validating = useRef(false);

  const validateSession = useCallback(
    async (via: 'hint' | 'focus' | 'interval') => {
      if (validating.current) return;
      validating.current = true;
      try {
        const { error } = await supabase.auth.getUser();
        if (error) {
          // The auth server refused the session — it was revoked or expired.
          emitTelemetry('sessions.guard_signed_out', { via });
          await supabase.auth.signOut();
          // Replace so Back cannot return to the stale page (legacy oracle).
          replaceLocation('/login');
        }
      } catch {
        // Network failure is NOT a refusal — never sign out on a hiccup.
      } finally {
        validating.current = false;
      }
    },
    [supabase],
  );

  // The hint subscription (ADR-U039 rules 1-4).
  useEffect(() => {
    if (!armed || !userId) return;

    // Node/browser parity: make sure the socket carries the caller's JWT —
    // private-channel authorization rides it (RLS on realtime.messages).
    supabase.realtime.setAuth(session!.access_token);

    const channel = supabase
      .channel(`account:${userId}:sessions`, { config: { private: true } })
      .on('broadcast', { event: 'session_revoked' }, (msg) => {
        const revoked = (msg as { payload?: { session_id?: string } }).payload?.session_id;
        if (revoked && ownSessionId && revoked === ownSessionId) {
          // Verify-on-signal — the hint is never an authority.
          void validateSession('hint');
        } else {
          // Another of this member's devices was revoked — nudge an open
          // /sessions page to re-read. Nothing destructive.
          window.dispatchEvent(new Event(SESSIONS_CHANGED_EVENT));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, armed, userId, ownSessionId, validateSession]);

  // The fallback validation (doctrine rule 6).
  useEffect(() => {
    if (!armed) return;

    const onWake = () => {
      if (document.visibilityState === 'visible') void validateSession('focus');
    };
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void validateSession('interval');
    }, VISIBLE_POLL_MS);

    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [armed, validateSession]);
}
