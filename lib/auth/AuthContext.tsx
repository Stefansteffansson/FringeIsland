'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  personal_group_id: string;
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const profileResolvedRef = useRef(false);

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
          .select('id, full_name, avatar_url, personal_group_id')
          .eq('auth_user_id', user.id)
          .single();
        if (error) {
          console.error('[AuthContext] Profile resolution failed:', error.message);
          return;
        }
        if (!cancelled && data) {
          setUserProfile(data as UserProfile);
          profileResolvedRef.current = true;
        }
      } catch (err) {
        console.error('[AuthContext] Profile resolution exception:', err);
      }
    };

    resolve();

    return () => { cancelled = true; };
  }, [user, supabase]);

  // Refresh cached profile (call after profile edits)
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, avatar_url, personal_group_id')
        .eq('auth_user_id', user.id)
        .single();
      if (!error && data) {
        setUserProfile(data as UserProfile);
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
      const { data: profile } = await supabase
        .from('users')
        .select('is_active')
        .eq('auth_user_id', data.user.id)
        .maybeSingle();

      if (!profile) {
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
