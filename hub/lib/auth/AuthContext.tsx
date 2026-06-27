'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { beginMistSession, deriveIdentity, type Identity } from '@/lib/auth/mist';
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
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // One client instance for the provider's lifetime.
  const [supabase] = useState(() => createClient());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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

  async function signOut() {
    await supabase.auth.signOut();
  }

  // Derived in render (not in the auth listener) — pure, no query, no deadlock.
  const identity = useMemo(() => deriveIdentity(user), [user]);

  return (
    <AuthContext.Provider
      value={{ user, session, loading, identity, signIn, signUp, beginMist, signOut }}
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
