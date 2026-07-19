'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  fetchConversations,
  peekConversations,
  unreadConversationCount,
} from '@/lib/messages/client';

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
  const { identity } = useAuth();
  const [unread, setUnread] = useState<number>(() =>
    unreadConversationCount(peekConversations()),
  );

  useEffect(() => {
    if (identity !== 'fim') return;

    let active = true;
    const load = async () => {
      try {
        const rows = await fetchConversations();
        if (active) setUnread(unreadConversationCount(rows));
      } catch {
        if (active) setUnread(0); // best-effort chrome — degrade silently
      }
    };
    load();

    const onRefresh = () => load();
    window.addEventListener('refreshNavigation', onRefresh);
    return () => {
      active = false;
      window.removeEventListener('refreshNavigation', onRefresh);
    };
  }, [identity]);

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
