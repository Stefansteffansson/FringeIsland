'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createGroupConversation,
  fetchGroupConversations,
  joinConversation,
  leaveConversation,
  type GroupConversationRow,
} from '@/lib/messages/client';
import { fetchMyPermissions } from '@/lib/groups/client';
import { isForbidden } from '@/lib/http/status-error';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { ForumActingContext } from '@/components/groups/GroupForumSection';

/**
 * FEAT-H025 STORY-6 — the group page's Conversations panel (COM-15, CB-7).
 * A failure-isolated slice on the ADR-U042 envelope posture: list / honest
 * empty state / honest unavailable state — the group page always renders
 * whole. The create affordance renders ONLY when the platform's effective-
 * permissions read grants `create_group_conversations` (asked of the
 * platform, never computed locally); join is by membership and the platform
 * enforces it — the button is UX, the RPC is the gate.
 *
 * FEAT-H047 (over FEAT-PD019 T2 + the T2R leave rider): the wielded render.
 * With an `acting` context (a hat with standing, selected on the page) the
 * list reads through the acting path with a banner; Join/Open/Leave reflect
 * the GROUP's participation; join/leave/create confirm ONCE with copy naming
 * the wielding (the 2026-08-19 ruling — weighty one-time acts confirm,
 * messages don't); Open links carry `?acting=` (the link carries the hat);
 * create gates on the HAT's permission — pure substitution.
 */
export function GroupConversationsSection({
  groupId,
  acting = null,
}: {
  groupId: string;
  acting?: ForumActingContext | null;
}) {
  const router = useRouter();
  const actingId = acting?.groupId;
  const [rows, setRows] = useState<GroupConversationRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [membersOnly, setMembersOnly] = useState(false);
  // 2026-09-05 (the Ferd-close E2E race): only the LATEST read may write. A
  // personal read still in flight when the hat went on resolved last as a
  // 403 and flipped the wielded list to "the hat doesn't open …". Every read
  // takes a sequence number before its await and drops its result if a newer
  // read has started since — a superseded read never writes.
  const readSeq = useRef(0);
  const [canCreatePersonally, setCanCreatePersonally] = useState(false);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // FEAT-H047 STORY-1: the one-time confirms naming the wielding.
  const [confirmJoin, setConfirmJoin] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null);
  const [confirmCreate, setConfirmCreate] = useState(false);

  // Pure substitution: under a hat the create affordance keys on the HAT's
  // permissions, never the member's own grants (ADR-U041 §2a).
  const canCreate = acting
    ? acting.permissions.includes('create_group_conversations')
    : canCreatePersonally;

  const threadHref = (conversationId: string) =>
    `/messages/${conversationId}${actingId ? `?acting=${actingId}` : ''}`;

  const load = useCallback(async () => {
    const seq = ++readSeq.current;
    try {
      const listing = await fetchGroupConversations(groupId, actingId);
      if (seq !== readSeq.current) return; // superseded by a newer read
      setRows(listing.conversations);
      setFailed(false);
      setMembersOnly(false);
    } catch (err) {
      // Post-6-done fix (2026-08-14, live walk): a member-gated refusal is not
      // a malfunction — honest members-only copy, never the failure fallback.
      // FEAT-H047: under a hat the same branch names the hat's insufficiency.
      if (seq !== readSeq.current) return; // superseded by a newer read
      setMembersOnly(isForbidden(err));
      setFailed(!isForbidden(err));
    }
  }, [groupId, actingId]);

  useEffect(() => {
    let active = true;
    // FEAT-H047: a view switch (Myself <-> a hat) repaints from a clean slate.
    setRows(null);
    setMembersOnly(false);
    setFailed(false);
    (async () => {
      await load();
      try {
        const perms = await fetchMyPermissions(groupId);
        if (active) setCanCreatePersonally(perms.permissions.includes('create_group_conversations'));
      } catch {
        if (active) setCanCreatePersonally(false); // hidden until the platform says yes
      }
    })();
    return () => {
      active = false;
    };
  }, [groupId, actingId, load]);

  async function doCreate() {
    setBusy('create');
    setActionError(null);
    try {
      const id = await createGroupConversation(groupId, title.trim() || null, actingId);
      router.push(threadHref(id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not open the conversation');
      setBusy(null);
    } finally {
      setConfirmCreate(false);
    }
  }

  function handleCreate() {
    if (acting) {
      setConfirmCreate(true);
      return;
    }
    void doCreate();
  }

  async function doJoin(conversationId: string) {
    setBusy(conversationId);
    setActionError(null);
    try {
      await joinConversation(conversationId, actingId);
      router.push(threadHref(conversationId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not join the conversation');
      setBusy(null);
    } finally {
      setConfirmJoin(null);
    }
  }

  function handleJoin(conversationId: string) {
    if (acting) {
      setConfirmJoin(conversationId);
      return;
    }
    void doJoin(conversationId);
  }

  // Leaving stays on the group page and re-lists from the confirmed response
  // (STORY-6: the row flips back to Join — rejoin is the same door). The
  // history survives the absence; the platform is the gate, this is UX.
  async function doLeave(conversationId: string) {
    setBusy(conversationId);
    setActionError(null);
    try {
      await leaveConversation(conversationId, actingId);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not leave the conversation');
    } finally {
      setBusy(null);
      setConfirmLeave(null);
    }
  }

  function handleLeave(conversationId: string) {
    if (acting) {
      setConfirmLeave(conversationId);
      return;
    }
    void doLeave(conversationId);
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

      {acting && !membersOnly && (
        // FEAT-H047 STORY-1: the substitution named per-section (the H018
        // rabbit hole — never a global acting mode).
        <p
          data-testid="conversations-acting-banner"
          className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-800"
        >
          Viewing as {acting.name}
        </p>
      )}

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

      {membersOnly ? (
        acting ? (
          // FEAT-H047 STORY-1: the hat's insufficiency named honestly — no
          // malfunction fallback, no fake door.
          <p
            data-testid="group-conversations-hat-insufficient"
            className="mt-3 text-sm text-gray-500"
          >
            The {acting.name} hat doesn&apos;t open this group&apos;s conversations.
          </p>
        ) : (
          <p data-testid="group-conversations-members-only" className="mt-3 text-sm text-gray-500">
            Group conversations are for members of this group.
          </p>
        )
      ) : failed ? (
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
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    data-testid={`conversation-open-${c.id}`}
                    onClick={() => router.push(threadHref(c.id))}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-50"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    data-testid={`conversation-leave-${c.id}`}
                    onClick={() => handleLeave(c.id)}
                    disabled={busy === c.id}
                    className="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-50"
                  >
                    Leave
                  </button>
                </span>
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

      {/* FEAT-H047 STORY-1: the one-time confirms naming the wielding — the
          weighty acts carry ceremony; messages carry a label instead. */}
      {acting && (
        <ConfirmModal
          isOpen={confirmJoin !== null}
          title={`Join as ${acting.name}?`}
          message={`You are joining as ${acting.name} — the group takes the seat, and its representatives share it.`}
          confirmText={`Join as ${acting.name}`}
          variant="info"
          busy={busy !== null}
          onConfirm={() => {
            if (confirmJoin) void doJoin(confirmJoin);
          }}
          onCancel={() => setConfirmJoin(null)}
        />
      )}
      {acting && (
        <ConfirmModal
          isOpen={confirmLeave !== null}
          title={`Leave as ${acting.name}?`}
          message={`You are leaving as ${acting.name} — the group gives up its seat; rejoining is the same door.`}
          confirmText={`Leave as ${acting.name}`}
          variant="warning"
          busy={busy !== null}
          onConfirm={() => {
            if (confirmLeave) void doLeave(confirmLeave);
          }}
          onCancel={() => setConfirmLeave(null)}
        />
      )}
      {acting && (
        <ConfirmModal
          isOpen={confirmCreate}
          title={`Open as ${acting.name}?`}
          message={`You are opening this conversation as ${acting.name} — the group takes the first seat.`}
          confirmText={`Open as ${acting.name}`}
          variant="info"
          busy={busy === 'create'}
          onConfirm={() => void doCreate()}
          onCancel={() => setConfirmCreate(false)}
        />
      )}
    </section>
  );
}
