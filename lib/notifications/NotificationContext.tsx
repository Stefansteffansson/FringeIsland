'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  recipient_user_id: string;
  type: string;
  title: string;
  body: string | null;
  payload: Record<string, unknown>;
  group_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

interface NotificationContextType {
  unreadCount: number;
  notifications: Notification[];
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

// ─── Provider ────────────────────────────────────────────────────────────────

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userProfile } = useAuth();
  const supabase = createClient();

  const userProfileId = userProfile?.id ?? null;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Reset state when user logs out
  useEffect(() => {
    if (!userProfileId) {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [userProfileId]);

  // ── Step 2: Fetch notifications + subscribe to Realtime ───────────────────
  useEffect(() => {
    if (!userProfileId) return;

    let cancelled = false;

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('recipient_user_id', userProfileId)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;

        if (!cancelled) {
          const rows = (data ?? []) as Notification[];
          setNotifications(rows);
          setUnreadCount(rows.filter((n) => !n.is_read).length);
        }
      } catch (err) {
        console.error('[NotificationProvider] Failed to fetch notifications:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchNotifications();

    // Subscribe to Realtime INSERT events for this user
    const channel = supabase
      .channel(`notifications:${userProfileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_user_id=eq.${userProfileId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[NotificationProvider] Realtime channel error');
        }
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userProfileId, supabase]);

  // ── Step 3: Re-fetch unread count on page visibility change / reconnect ────
  useEffect(() => {
    if (!userProfileId) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;

      try {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_user_id', userProfileId)
          .eq('is_read', false);

        setUnreadCount(count ?? 0);
      } catch (err) {
        console.error('[NotificationProvider] Failed to refresh unread count:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userProfileId, supabase]);

  // ── Step 4: Hook into refreshNavigation custom event ──────────────────────
  useEffect(() => {
    if (!userProfileId) return;

    const handleRefresh = async () => {
      try {
        const { count } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('recipient_user_id', userProfileId)
          .eq('is_read', false);

        setUnreadCount(count ?? 0);
      } catch (err) {
        console.error('[NotificationProvider] Failed to refresh on navigation event:', err);
      }
    };

    window.addEventListener('refreshNavigation', handleRefresh);

    return () => {
      window.removeEventListener('refreshNavigation', handleRefresh);
    };
  }, [userProfileId, supabase]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('[NotificationProvider] Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!userProfileId) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_user_id', userProfileId)
        .eq('is_read', false);

      if (error) throw error;

      const now = new Date().toISOString();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: now }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('[NotificationProvider] Failed to mark all as read:', err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id);
        if (removed && !removed.is_read) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        return prev.filter((n) => n.id !== id);
      });
    } catch (err) {
      console.error('[NotificationProvider] Failed to delete notification:', err);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        notifications,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
