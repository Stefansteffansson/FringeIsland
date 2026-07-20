'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import {
  fetchConversations,
  peekConversations,
  type ConversationSummary,
} from '@/lib/messages/client';

/**
 * FEAT-H025 STORY-2 — the `/messages` inbox (COM-2). One list, both kinds,
 * sorted by last activity (the platform's order — no client re-sorting).
 * FIM-only (CB-1): a Mist deep-link redirects home; sessionless goes to
 * login. B4: the session-cache peek paints instantly on revisit while the
 * read revalidates; B6: skeleton (never a spinner) in the 1–3 s band.
 */
export default function MessagesPage() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<ConversationSummary[] | null>(() => peekConversations());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    // Gate on identity status, never a role string (products-tier rule).
    if (!user || identity === 'sessionless') {
      router.replace('/login?redirect=/messages');
      return;
    }
    if (identity === 'mist') {
      router.replace('/');
    }
  }, [user, identity, authLoading, router]);

  useEffect(() => {
    if (authLoading || identity !== 'fim') return;
    let active = true;
    fetchConversations()
      .then((fresh) => {
        if (active) {
          setRows(fresh);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active && peekConversations() === null) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [authLoading, identity]);

  return (
    <AppShell title="Messages">
      {authLoading || identity !== 'fim' ? (
        <div className="space-y-3" aria-hidden="true">
          <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
        </div>
      ) : failed ? (
        <p role="alert" className="text-sm text-red-600">
          Your messages can&apos;t be shown right now.
        </p>
      ) : rows === null ? (
        <div className="space-y-3" aria-hidden="true" data-testid="inbox-skeleton">
          <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
          <div className="h-16 animate-pulse rounded-xl bg-gray-100" />
        </div>
      ) : rows.length === 0 ? (
        <div data-testid="inbox-empty" className="rounded-xl border border-gray-100 bg-white p-8 text-center">
          <p className="text-sm text-gray-600">No conversations yet.</p>
          <p className="mt-1 text-sm text-gray-500">
            Open one of <Link href="/groups" className="text-indigo-700 hover:underline">your groups</Link> and
            message a fellow member.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/messages/${c.id}`}
                data-testid={`inbox-row-${c.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm transition-colors hover:bg-gray-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {c.kind === 'dm'
                      ? c.other_participant_name ?? 'Unknown'
                      : c.title ?? c.group_name ?? 'Conversation'}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {c.kind === 'dm' ? 'Direct message' : c.group_name ?? 'Group conversation'}
                  </p>
                </div>
                <div className="ml-4 flex shrink-0 items-center gap-3">
                  {c.last_message_at && (
                    <span className="text-xs text-gray-400">
                      {new Date(c.last_message_at).toLocaleString()}
                    </span>
                  )}
                  {c.has_unread && (
                    <span
                      data-testid={`inbox-unread-${c.id}`}
                      aria-label="Unread"
                      className="h-2.5 w-2.5 rounded-full bg-indigo-600"
                    />
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
