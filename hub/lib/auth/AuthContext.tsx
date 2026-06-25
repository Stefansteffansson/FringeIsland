'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type AuthState = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    consentAccepted: boolean,
  ) => Promise<{ error: string | null; pendingConfirmation?: boolean }>;
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

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
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
