'use client';

import { useEffect } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Identity } from '@/lib/auth/mist';
import { realtimeManager, type Tenant } from '@/lib/realtime/manager';
import { invalidateMessagesCache } from '@/lib/messages/client';
import { registerNotificationsTenant } from '@/lib/realtime/notifications-tenant';

/**
 * FEAT-H027 (TASK-CC-04) — the app-wide conversations tenant.
 *
 * One subscription to `account:<auth_uid>:conversations` (FEAT-PD010's
 * per-member channel) serves all three COM-10 consumers — the inbox, the open
 * detail, and the unread badge. On any hint the tenant does exactly two
 * things, and never a third: drop the messages session cache so the next read
 * is fresh, and dispatch the `conversationsChanged` window event (the
 * `refreshNavigation` / `sessionsChanged` house pattern) carrying the hinted
 * `conversation_id`. Mounted surfaces listen and re-read through their existing
 * couriers — the tenant never reaches into them, and no payload content is
 * rendered anywhere (verify-on-signal, STORY-5).
 *
 * `useRealtimeTenants` is wired beside `useSessionGuard` in AuthContext: it
 * drives the shared manager's connection from auth state (the arming rule —
 * FIM + live session) and registers the tenant only while armed. A Mist or a
 * sessionless visitor arms nothing (STORY-2); sign-out unregisters (STORY-7).
 */

/** Cross-component nudge for the comm surfaces — the house event pattern,
 *  mirroring `SESSIONS_CHANGED_EVENT`. Carries the hinted id as correlation. */
export const CONVERSATIONS_CHANGED_EVENT = 'conversationsChanged';

export type ConversationsChangedDetail = { conversationId: string | null };

/** The per-member conversations topic — the one a comm surface watches for its
 *  reconnecting affordance (STORY-6). Null when there's no member to key it. */
export function conversationsTopic(userId: string | null): string | null {
  return userId ? `account:${userId}:conversations` : null;
}

/** The declarative tenant for a member's conversations channel. */
export function conversationsTenant(userId: string): Tenant {
  return {
    topic: conversationsTopic(userId)!,
    events: ['message_created'],
    onHint: ({ payload }) => {
      // Verify-on-signal — the hint is never an authority. Invalidate + nudge;
      // every visible change traces to an authorized re-fetch a consumer runs.
      invalidateMessagesCache();
      const conversationId =
        typeof payload.conversation_id === 'string' ? payload.conversation_id : null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent<ConversationsChangedDetail>(CONVERSATIONS_CHANGED_EVENT, {
            detail: { conversationId },
          }),
        );
      }
    },
  };
}

/**
 * Wire the realtime substrate into AuthContext (beside `useSessionGuard`).
 * Mirrors the session-guard hook shape so AuthContext is not restructured.
 */
export function useRealtimeTenants(
  supabase: SupabaseClient,
  session: Session | null,
  identity: Identity,
): void {
  // The session-guard arming rule — a Mist or a sessionless visitor arms nothing.
  const armed = identity === 'fim' && session !== null;
  const userId = session?.user?.id ?? null;
  const accessToken = session?.access_token ?? null;

  // Drive the shared manager's connection. Keyed on the identity anchor + token
  // so a token refresh re-auths the socket without churning subscriptions, and
  // an identity change re-arms fresh (the manager owns both transitions).
  useEffect(() => {
    realtimeManager.updateConnection({ supabase, accessToken, userId, armed });
  }, [supabase, accessToken, userId, armed]);

  // Register the app-wide conversations tenant while armed; unregister on
  // sign-out / identity change (the returned teardown).
  useEffect(() => {
    if (!armed || !userId) return;
    return realtimeManager.registerTenant(conversationsTenant(userId));
  }, [armed, userId]);

  // FEAT-H032 (N-C): the notifications tenant joins on the SAME socket, under
  // the same arming rule. Registration is the whole integration — the manager
  // is untouched, exactly as FEAT-H027 STORY-1 designed.
  useEffect(() => {
    if (!armed || !userId) return;
    return registerNotificationsTenant(userId);
  }, [armed, userId]);
}
