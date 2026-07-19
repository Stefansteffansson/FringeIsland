'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createGroupConversation,
  fetchGroupConversations,
  joinConversation,
  type GroupConversationRow,
} from '@/lib/messages/client';
import { fetchMyPermissions } from '@/lib/groups/client';

/**
 * FEAT-H025 STORY-6 — the group page's Conversations panel (COM-15, CB-7).
 * A failure-isolated slice on the ADR-U042 envelope posture: list / honest
 * empty state / honest unavailable state — the group page always renders
 * whole. The create affordance renders ONLY when the platform's effective-
 * permissions read grants `create_group_conversations` (asked of the
 * platform, never computed locally); join is by membership and the platform
 * enforces it — the button is UX, the RPC is the gate.
 */
export function GroupConversationsSection({ groupId }: { groupId: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<GroupConversationRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [canCreate, setCanCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const listing = await fetchGroupConversations(groupId);
      setRows(listing.conversations);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [groupId]);

  useEffect(() => {
    let active = true;
    (async () => {
      await load();
      try {
        const perms = await fetchMyPermissions(groupId);
        if (active) setCanCreate(perms.permissions.includes('create_group_conversations'));
      } catch {
        if (active) setCanCreate(false); // hidden until the platform says yes
      }
    })();
    return () => {
      active = false;
    };
  }, [groupId, load]);

  async function handleCreate() {
    setBusy('create');
    setActionError(null);
    try {
      const id = await createGroupConversation(groupId, title.trim() || null);
      router.push(`/messages/${id}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open the conversation');
      setBusy(null);
    }
  }

  async function handleJoin(conversationId: string) {
    setBusy(conversationId);
    setActionError(null);
    try {
      await joinConversation(conversationId);
      router.push(`/messages/${conversationId}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not join the conversation');
      setBusy(null);
    }
  }

  return (
    <section
      data-testid="group-conversations"
      className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Conversations</h2>
        {canCreate && !creating && (
          <button
            type="button"
            data-testid="conversation-create"
            onClick={() => setCreating(true)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            New conversation
          </button>
        )}
      </div>

      {creating && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            aria-label="Conversation title"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={busy === 'create'}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => setCreating(false)}
            className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      )}

      {actionError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {failed ? (
        <p data-testid="group-conversations-unavailable" className="mt-3 text-sm text-gray-500">
          The group&apos;s conversations can&apos;t be shown right now.
        </p>
      ) : rows === null ? (
        <div className="mt-3 h-10 animate-pulse rounded-lg bg-gray-100" aria-hidden="true" />
      ) : rows.length === 0 ? (
        <p data-testid="group-conversations-empty" className="mt-3 text-sm text-gray-500">
          No conversations in this group yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm"
            >
              <span className="font-medium text-gray-800">{c.title ?? 'Conversation'}</span>
              {c.am_i_participant ? (
                <button
                  type="button"
                  data-testid={`conversation-open-${c.id}`}
                  onClick={() => router.push(`/messages/${c.id}`)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
                >
                  Open
                </button>
              ) : (
                <button
                  type="button"
                  data-testid={`conversation-join-${c.id}`}
                  onClick={() => handleJoin(c.id)}
                  disabled={busy === c.id}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:opacity-50"
                >
                  Join
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
