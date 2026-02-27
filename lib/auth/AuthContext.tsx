'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session, RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  personal_group_id: string;
  nickname: string;
  display_preference: 'real_name' | 'nickname';
  show_real_name: boolean;
  display_name: string; // Resolved from personal group name (single source of truth)
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  validateSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const profileResolvedRef = useRef(false);
  const forceLogoutChannelRef = useRef<RealtimeChannel | null>(null);

  // Auth state: only set user/session, never make DB queries inside callbacks
  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUserProfile(null);
        profileResolvedRef.current = false;
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // Profile resolution: separate effect triggered by user state changes
  // This avoids deadlocking the Supabase SSR client by not querying inside onAuthStateChange
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const resolve = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, full_name, avatar_url, personal_group_id, nickname, display_preference, show_real_name, personal_group:groups!personal_group_id(name)')
          .eq('auth_user_id', user.id)
          .single();
        if (error) {
          // 406 = row hidden by RLS (deactivated user). signIn() handles this
          // with a user-facing message, so only log unexpected errors.
          if (error.code !== 'PGRST116') {
            console.error('[AuthContext] Profile resolution failed:', error.message);
          }
          return;
        }
        if (!cancelled && data) {
          const pg = data.personal_group as any;
          setUserProfile({
            id: data.id,
            full_name: data.full_name,
            avatar_url: data.avatar_url,
            personal_group_id: data.personal_group_id,
            nickname: data.nickname,
            display_preference: data.display_preference,
            show_real_name: data.show_real_name,
            display_name: pg?.name || data.nickname || data.full_name,
          });
          profileResolvedRef.current = true;
        }
      } catch (err) {
        console.error('[AuthContext] Profile resolution exception:', err);
      }
    };

    resolve();

    return () => { cancelled = true; };
  }, [user, supabase]);

  // Force-logout Realtime subscription: listens for admin-initiated force logout
  useEffect(() => {
    if (!userProfile) {
      // Clean up any existing channel when profile is cleared (logout)
      if (forceLogoutChannelRef.current) {
        supabase.removeChannel(forceLogoutChannelRef.current);
        forceLogoutChannelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel(`force-logout:${userProfile.id}`)
      .on('broadcast', { event: 'force_logout' }, () => {
        // Sign out immediately — no DB queries (deadlock rule)
        supabase.auth.signOut();
      })
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[AuthContext] Force-logout channel error');
        }
      });

    forceLogoutChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      forceLogoutChannelRef.current = null;
    };
  }, [userProfile, supabase]);

  // Refresh cached profile (call after profile edits)
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, personal_group_id, nickname, display_preference, show_real_name, personal_group:groups!personal_group_id(name)')
        .eq('auth_user_id', user.id)
        .single();
      if (!error && data) {
        const pg = data.personal_group as any;
        setUserProfile({
          id: data.id,
          full_name: data.full_name,
          avatar_url: data.avatar_url,
          personal_group_id: data.personal_group_id,
          nickname: data.nickname,
          display_preference: data.display_preference,
          show_real_name: data.show_real_name,
          display_name: pg?.name || data.nickname || data.full_name,
        });
      }
    } catch {
      // Silently fail on refresh
    }
  }, [user, supabase]);

  // Listen for refreshNavigation events to update cached profile
  useEffect(() => {
    const handleRefresh = () => { refreshProfile(); };
    window.addEventListener('refreshNavigation', handleRefresh);
    return () => window.removeEventListener('refreshNavigation', handleRefresh);
  }, [refreshProfile]);

  // Validate session: calls getUser() (hits Auth, not PostgREST — safe from deadlock).
  // If session is invalid, signs out and redirects to /login. Uses window.location.replace
  // so the stale page is replaced in history (Back button won't return to it).
  const validateSession = useCallback(async () => {
    try {
      const { error } = await supabase.auth.getUser();
      if (error) {
        await supabase.auth.signOut();
        window.location.replace('/login');
      }
    } catch {
      await supabase.auth.signOut();
      window.location.replace('/login');
    }
  }, [supabase]);

  // Periodic session validation: catches force-logouts even if Realtime broadcast
  // doesn't reach the client. Also checks immediately when the tab regains focus
  // (user switches back to the app) so stale sessions are caught quickly.
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      validateSession();
    }, 10_000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        validateSession();
      }
    };

    const handleFocus = () => {
      validateSession();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, validateSession]);

  const signUp = async (email: string, password: string, displayName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Application-layer active check.
      // RLS hides deactivated users (is_active = false), so the query may
      // return null or a 406 error. Both mean the account is deactivated.
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('is_active')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (profileError || !profile || !profile.is_active) {
        await supabase.auth.signOut();
        throw new Error('Your account has been deactivated. Please contact support.');
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    user,
    session,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
    validateSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
