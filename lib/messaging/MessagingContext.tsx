'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string | null;
  participant_1_last_read_at: string | null;
  participant_2_last_read_at: string | null;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface MessagingContextType {
  unreadConversationCount: number;
  userProfileId: string | null;
  refreshUnreadCount: () => Promise<void>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const MessagingContext = createContext<MessagingContextType | undefined>(
  undefined
);

// ─── Provider ────────────────────────────────────────────────────────────────

export function MessagingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userProfile } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const userProfileId = userProfile?.id ?? null;
  const [unreadConversationCount, setUnreadConversationCount] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Reset unread count when user logs out
  useEffect(() => {
    if (!userProfileId) {
      setUnreadConversationCount(0);
    }
  }, [userProfileId]);

  // ── Step 2: Count unread conversations + subscribe to Realtime ──────────
  const refreshUnreadCount = async () => {
    if (!userProfileId) return;

    try {
      // Fetch all conversations for this user
      const { data: conversations, error } = await supabase
        .from('conversations')
        .select('id, participant_1, participant_2, last_message_at, participant_1_last_read_at, participant_2_last_read_at');

      if (error) throw error;

      let count = 0;
      for (const conv of conversations || []) {
        if (!conv.last_message_at) continue; // no messages yet

        const isP1 = conv.participant_1 === userProfileId;
        const lastReadAt = isP1
          ? conv.participant_1_last_read_at
          : conv.participant_2_last_read_at;

        // If never read, or last message is after last read, it's unread
        if (!lastReadAt || new Date(conv.last_message_at).getTime() > new Date(lastReadAt).getTime()) {
          count++;
        }
      }

      setUnreadConversationCount(count);
    } catch (err) {
      console.error('[MessagingProvider] Failed to count unread conversations:', err);
    }
  };

  useEffect(() => {
    if (!userProfileId) return;

    let cancelled = false;

    const init = async () => {
      if (!cancelled) await refreshUnreadCount();
    };

    init();

    // Subscribe to new messages via Realtime to update unread count.
    // Note: direct_messages has no recipient column, and Realtime filters only
    // support eq, so we can't filter server-side by conversation list. Instead,
    // we skip the recount when the current user sent the message (they already
    // know about it) and let RLS filter the actual query.
    const channel = supabase
      .channel(`direct_messages:${userProfileId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
        },
        (payload) => {
          const newMsg = payload.new as { sender_id?: string };
          // Skip recount for messages we sent ourselves
          if (newMsg.sender_id === userProfileId) return;
          // Delay briefly so the conversation page (if open) can update
          // last_read_at before we recount
          setTimeout(() => refreshUnreadCount(), 500);
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[MessagingProvider] Realtime channel error');
        }
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfileId]);

  // ── Step 3: Re-fetch on visibility change ────────────────────────────────
  useEffect(() => {
    if (!userProfileId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUnreadCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfileId]);

  // ── Step 4: Hook into refreshNavigation ──────────────────────────────────
  useEffect(() => {
    if (!userProfileId) return;

    const handleRefresh = () => {
      refreshUnreadCount();
    };

    window.addEventListener('refreshNavigation', handleRefresh);
    return () => window.removeEventListener('refreshNavigation', handleRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfileId]);

  return (
    <MessagingContext.Provider
      value={{
        unreadConversationCount,
        userProfileId,
        refreshUnreadCount,
      }}
    >
      {children}
    </MessagingContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMessaging() {
  const context = useContext(MessagingContext);
  if (context === undefined) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
}
