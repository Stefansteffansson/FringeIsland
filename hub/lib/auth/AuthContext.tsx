'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { invalidateAllCaches } from '@/lib/auth/cache-registry';
import { beginMistSession, deriveIdentity, type Identity } from '@/lib/auth/mist';
import { useSessionGuard } from '@/lib/auth/session-guard';
import { useRealtimeTenants } from '@/lib/realtime/conversations-tenant';
import { TRANSCENDENCE_CONSENT_REQUIRED_ERROR } from '@/lib/auth/transcendence-policy';
import { emitTelemetry } from '@/lib/observability/telemetry';

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /**
   * Three-state identity (FEAT-H003): sessionless / mist / fim. Derived from the
   * auth user's `is_anonymous` flag — never queried inside the auth listener, so
   * it cannot deadlock onAuthStateChange (Hub CLAUDE.md gotcha).
   */
  identity: Identity;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    consentAccepted: boolean,
  ) => Promise<{ error: string | null; pendingConfirmation?: boolean }>;
  /**
   * Begin acting as a Mist (FEAT-H003 STORY-2) — the lazy-materialisation facade
   * over the seam. Emits Mist telemetry (failures included, STORY-5). On success
   * the auth listener picks up the new anon session and `identity` becomes 'mist'.
   */
  beginMist: () => Promise<{ error: string | null }>;
  /**
   * Become a FIM in place (FEAT-H004 STORY-1/2) — convert THEN finalise. The
   * client consent gate blocks before any conversion (STORY-2); the auth-SDK
   * `updateUser` performs the anon->permanent conversion (same `auth.users.id`,
   * so the Mist's proto group + journeys carry over with continuity); the
   * FEAT-PC002 finalisation RPC is reached through the Platform API route (never
   * a browser RPC — ADR-U009). On success the auth listener re-derives identity
   * Mist -> FIM (`is_anonymous` flips); failure is surfaced, never swallowed.
   */
  transcend: (
    email: string,
    password: string,
    displayName: string,
    consentAccepted: boolean,
  ) => Promise<{ error: string | null }>;
  /**
   * Say goodbye (FEAT-H004 STORY-3) — the explicit-erase farewell. Calls the
   * FEAT-PC002 explicit-erase RPC through the Platform API route (never a browser
   * RPC — ADR-U009), then signs out so the surface drops to the sessionless
   * entry. A route failure is surfaced and the session is NOT dropped (the Mist
   * remains). Offered only to a Mist (a FIM leaves via account-state/exit).
   */
  sayGoodbye: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  /**
   * TASK-MIST-01 — the ghost window. A Mist erased server-side while this
   * browser kept its JWT still reads `identity === 'mist'` locally (ADR-U037,
   * correct by design); its first actor-bound read then refuses with
   * `no_resolvable_actor`. Nothing will resolve that actor again, so the
   * session is dropped (local scope — a Mist is per-device) and the visitor
   * lands sessionless; the next "look around" mints a fresh Mist.
   */
  dropGhostSession: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // One client instance for the provider's lifetime.
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  // TASK-TRX-02: true while transcend() is between the SDK conversion and the
  // finalisation route resolving. The conversion flips `is_anonymous` (and
  // fires USER_UPDATED) BEFORE the platform txn commits, so deriving 'fim'
  // from the user alone opens a window where every fim-keyed read fires into
  // a mid-transaction substrate refusal — which then sticks in session caches
  // (the 2026-08-13 live-walk bug). Identity holds at 'mist' until the seam
  // knows the substrate agrees.
  const [transcending, setTranscending] = useState(false);

  useEffect(() => {
    // Seed the initial session, then subscribe to changes. Per the Hub gotcha,
    // the listener ONLY sets state — it never queries — to avoid the
    // onAuthStateChange deadlock. Data queries live in their own effects/routes.
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Session gone (sign-out / expiry): drop the session caches so a later
      // sign-in never shows another member's label or groups. Pure local drops —
      // no query in the listener (the onAuthStateChange deadlock gotcha holds).
      // COR-A W9 (AC-5): registry inversion — each area cache module registers
      // its invalidator at module init and auth imports NONE of them. Only
      // loaded modules are registered: an area never imported this session has
      // no cache to clear, so lazy registration is correct-by-construction.
      if (!newSession) {
        invalidateAllCaches();
      }
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(
    email: string,
    password: string,
    displayName: string,
    consentAccepted: boolean,
  ): Promise<{ error: string | null; pendingConfirmation?: boolean }> {
    // Sign-up goes through the hub API route: it enforces the consent gate
    // server-side, performs the auth signUp, and records the audit/telemetry
    // seams. On success it returns session tokens we set on the browser client,
    // so the onAuthStateChange listener updates this context (keeping it coherent).
    let payload: {
      ok?: boolean;
      error?: string;
      pendingConfirmation?: boolean;
      session?: { access_token: string; refresh_token: string };
    } | null = null;

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, consentAccepted }),
      });
      try {
        payload = await res.json();
      } catch {
        /* non-JSON response */
      }
      if (!res.ok) {
        return { error: payload?.error ?? 'Sign-up failed. Please try again.' };
      }
    } catch {
      return { error: 'Could not reach the server. Please try again.' };
    }

    if (payload?.pendingConfirmation) {
      return { error: null, pendingConfirmation: true };
    }

    if (payload?.session?.access_token && payload?.session?.refresh_token) {
      const { error } = await supabase.auth.setSession({
        access_token: payload.session.access_token,
        refresh_token: payload.session.refresh_token,
      });
      if (error) return { error: error.message };
    }

    return { error: null };
  }

  async function beginMist(): Promise<{ error: string | null }> {
    const { error } = await beginMistSession(supabase);
    if (error) {
      // V4 — a failed entry is an event, never silently swallowed (STORY-5).
      emitTelemetry('mist.enter_failed', { reason: error });
      return { error };
    }
    // V4 — Mist entry telemetry. The FEAT-PC002 reaper (ADR-U033) now realises
    // ephemerality (pg_cron sweep + explicit-erase), so the accumulation gap is
    // closed — `reaperRealised: true`.
    emitTelemetry('mist.entered', { reaperRealised: true });
    return { error: null };
  }

  async function transcend(
    email: string,
    password: string,
    displayName: string,
    consentAccepted: boolean,
  ): Promise<{ error: string | null }> {
    // Consent gate — no consent, no conversion, no finalisation (STORY-2).
    if (!consentAccepted) {
      emitTelemetry('transcendence.failed', { reason: 'consent_missing_client' });
      return { error: TRANSCENDENCE_CONSENT_REQUIRED_ERROR };
    }

    // TASK-TRX-02: hold identity at 'mist' for the whole convert->finalise
    // window (see the state's comment). Dropped in `finally` on every path —
    // the failure paths keep today's semantics.
    setTranscending(true);
    try {
      // 1. Convert: anon -> permanent via the auth SDK (the narrow exception).
      //    Preserves the same auth.users.id, so the proto group + journeys carry
      //    over with continuity — the Hub copies no rows.
      const { error: convertError } = await supabase.auth.updateUser({
        email,
        password,
        data: { display_name: displayName },
      });
      if (convertError) {
        emitTelemetry('transcendence.failed', { reason: 'conversion_error' });
        return { error: convertError.message };
      }

      // 2. Finalise via the Platform API route (the RPC runs server-side, never in
      //    the browser — ADR-U009). Order matters: convert, then finalise.
      try {
        const res = await fetch('/api/auth/transcend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ consentAccepted: true }),
        });
        let payload: { ok?: boolean; error?: string } | null = null;
        try {
          payload = await res.json();
        } catch {
          /* non-JSON response */
        }
        if (!res.ok) {
          // No half-FIM swallow — surface the failure (the platform RPC rolled back).
          return {
            error: payload?.error ?? 'Could not complete becoming a FIM. Please try again.',
          };
        }
      } catch {
        return { error: 'Could not reach the server. Please try again.' };
      }

      // TASK-TRX-02: converge — no Mist-era cache (profile label, adopted
      // bundle slices, session caches) survives into the FIM session, and
      // mounted listeners re-read over the house channel. Any read that
      // slipped into the transcend window and was refused mid-transaction is
      // dropped here rather than left to stick.
      invalidateAllCaches();
      window.dispatchEvent(new Event('refreshNavigation'));

      return { error: null };
    } finally {
      setTranscending(false);
    }
  }

  async function sayGoodbye(): Promise<{ error: string | null }> {
    try {
      const res = await fetch('/api/auth/farewell', { method: 'POST' });
      let payload: { ok?: boolean; error?: string } | null = null;
      try {
        payload = await res.json();
      } catch {
        /* non-JSON response */
      }
      if (!res.ok) {
        // Surface the failure — the Mist remains (no session dropped).
        return { error: payload?.error ?? 'Could not say goodbye. Please try again.' };
      }
    } catch {
      return { error: 'Could not reach the server. Please try again.' };
    }
    // Erased server-side — drop the local session => sessionless entry.
    // `local`: a Mist is per-device and anonymous, so there is no other session
    // this could mean; saying so explicitly keeps every call site honest.
    await supabase.auth.signOut({ scope: 'local' });
    return { error: null };
  }

  /**
   * Deliberate sign-out — ends THIS browser, and nothing else.
   *
   * `signOut()` defaults to `scope: 'global'`, so this used to end the member's
   * phone and tablet too, silently. That is the opposite of what "Sign out"
   * means nearly everywhere — Google, Microsoft, Facebook, Apple, GitHub and
   * Slack all treat it as device-local and put "sign out everywhere" behind a
   * separate, explicitly named control beside a device list. Signing out is
   * routine (a shared machine, the end of a day); ending *every* session is a
   * security response, a different intent, and deserves to be asked for.
   *
   * Decided by Stefan 2026-07-27. A deliberate "Sign out everywhere" lands
   * later on `/sessions`, which already lists devices and revokes them one at a
   * time but has no bulk contract yet (only `DELETE /api/sessions/[id]`).
   */
  async function signOut() {
    await supabase.auth.signOut({ scope: 'local' });
  }

  async function dropGhostSession() {
    emitTelemetry('mist.ghost_session_dropped');
    await supabase.auth.signOut({ scope: 'local' });
  }

  // Derived in render (not in the auth listener) — pure, no query, no deadlock.
  // TASK-TRX-02: while a transcend is in flight the converted user already
  // reads non-anonymous, but the substrate is still mid-transaction — hold
  // 'mist' until the seam confirms (the state's comment has the full story).
  const identity = useMemo(
    () => (transcending && user ? 'mist' : deriveIdentity(user)),
    [user, transcending],
  );

  // FEAT-H012: the ADR-U039 session guard — the private session-signal channel
  // (verify-on-signal) + focus/visibility + slow-poll fallback validation. Runs
  // on EVERY page (a revoked device isn't sitting on /sessions), which is why
  // it lives here and not in the sessions surface.
  useSessionGuard(supabase, session, identity);

  // FEAT-H027: the ADR-U039 realtime tenants — the shared channel manager's
  // connection (armed for a FIM with a live session) + the app-wide
  // conversations tenant (inbox / open detail / unread badge re-read on a
  // content-free hint). Beside the session guard: same shared socket, same
  // arming rule, same "on every page" reasoning.
  useRealtimeTenants(supabase, session, identity);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        identity,
        signIn,
        signUp,
        beginMist,
        transcend,
        sayGoodbye,
        signOut,
        dropGhostSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
