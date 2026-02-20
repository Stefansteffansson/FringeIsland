'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
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

  // Resolve auth_user_id → users table profile (id, full_name, avatar_url)
  const resolveProfile = useCallback(async (authUserId: string): Promise<UserProfile | null> => {
    try {
      const { data } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .eq('auth_user_id', authUserId)
        .single();
      return data as UserProfile | null;
    } catch {
      return null;
    }
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;

    // Get initial session + resolve profile before marking as loaded
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const profile = await resolveProfile(session.user.id);
        if (!cancelled) setUserProfile(profile);
      }

      if (!cancelled) setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        const profile = await resolveProfile(session.user.id);
        setUserProfile(profile);
      } else {
        setUserProfile(null);
      }

      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase.auth, resolveProfile]);

  // Refresh cached profile (call after profile edits)
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const profile = await resolveProfile(user.id);
    if (profile) setUserProfile(profile);
  }, [user, resolveProfile]);

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

      // NOTE: We're NOT creating the users table record here
      // We'll handle that with a Supabase trigger instead

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
      // get_current_user_profile_id() returns null for is_active=false users,
      // so RLS blocks the profile query → profile is null for deactivated accounts.
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
