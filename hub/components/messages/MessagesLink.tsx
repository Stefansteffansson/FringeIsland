'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  fetchConversations,
  peekConversations,
  invalidateMessagesCache,
  unreadConversationCount,
} from '@/lib/messages/client';
import {
  CONVERSATIONS_CHANGED_EVENT,
  conversationsTopic,
} from '@/lib/realtime/conversations-tenant';
import { useCommChannel } from '@/lib/realtime/use-comm-channel';

/**
 * FEAT-H025 STORY-1 — the shell Messages chrome. A **FIM-only** affordance
 * (CB-1: communication is FIM-only; a Mist gets no Messages chrome at all —
 * gate on identity status, never a role string). The unread indicator counts
 * CONVERSATIONS with unread — read-state, never notifications (the oracle
 * rule). Refreshes on `refreshNavigation` (every messages mutation fires it)
 * — no sockets, no polling until C-C (ADR-U039). Best-effort chrome: a failed
 * read degrades to the plain link, never an error surface.
 * 'use client' — reads auth state (Hub gotcha: `useAuth` no-ops on the server).
 */
export function MessagesLink() {
  const { identity, user } = useAuth();
  const [unread, setUnread] = useState<number>(() =>
    unreadConversationCount(peekConversations()),
  );

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const rows = await fetchConversations();
      if (mountedRef.current) setUnread(unreadConversationCount(rows));
    } catch {
      if (mountedRef.current) setUnread(0); // best-effort chrome — degrade silently
    }
  }, []);

  useEffect(() => {
    if (identity !== 'fim') return;
    // Initial badge read as an inline promise chain — setState lands in `.then`
    // (async), never synchronously in the effect body (set-state-in-effect).
    let active = true;
    fetchConversations()
      .then((rows) => {
        if (active && mountedRef.current) setUnread(unreadConversationCount(rows));
      })
      .catch(() => {
        if (active && mountedRef.current) setUnread(0);
      });

    // Refresh on own-action nudges (refreshNavigation) AND on a live hint
    // (conversationsChanged, FEAT-H027) — the badge moves without navigation.
    const onRefresh = () => load();
    window.addEventListener('refreshNavigation', onRefresh);
    window.addEventListener(CONVERSATIONS_CHANGED_EVENT, onRefresh);
    return () => {
      active = false;
      window.removeEventListener('refreshNavigation', onRefresh);
      window.removeEventListener(CONVERSATIONS_CHANGED_EVENT, onRefresh);
    };
  }, [identity, load]);

  // FEAT-H027 STORY-6: the badge reconciles with the mounted comm surfaces on
  // recovery / visibility regain / degraded poll (invalidate + re-fetch). The
  // badge is chrome — it participates in reconciliation but shows no indicator.
  const reconcile = useCallback(() => {
    invalidateMessagesCache();
    load();
  }, [load]);
  useCommChannel(
    identity === 'fim' ? conversationsTopic(user?.id ?? null) : null,
    reconcile,
  );

  if (identity !== 'fim') return null;

  return (
    <Link
      href="/messages"
      aria-label={unread > 0 ? `Messages — ${unread} unread` : 'Messages'}
      className="relative flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
    >
      <span>Messages</span>
      {unread > 0 && (
        <span
          data-testid="messages-unread-badge"
          className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-indigo-600 px-1 text-xs font-semibold text-white"
        >
          {unread}
        </span>
      )}
    </Link>
  );
}
