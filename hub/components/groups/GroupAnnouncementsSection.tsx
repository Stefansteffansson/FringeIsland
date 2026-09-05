'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  peekGroupAnnouncements,
  fetchGroupAnnouncements,
  sendCommunityAnnouncement,
  retractAnnouncement,
  type Announcement,
} from '@/lib/announcements/client';
import { authorClassName, authorKindBadge } from '@/lib/forum/attribution';
import { fetchMyPermissions } from '@/lib/groups/client';
import { isForbidden } from '@/lib/http/status-error';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * FEAT-H028 STORY-1/2 — the group page's Announcements section (COM-8, Cycle
 * C-D). A failure-isolated slice on the ADR-U042 envelope posture (like the
 * Forum section): list / honest empty / honest unavailable — the group page
 * always renders whole. Newest-first from `get_group_announcements`, keyset
 * "load more", attribution at the content-display layer (COM-14). Compose +
 * Retract render ONLY on the platform's `send_announcements` grant — asked of
 * the platform via effective-permissions, never computed locally; the RPC is
 * the gate, the button is UX. The surface renders from the confirmed response
 * and preserves a composed draft on a refusal. No sockets (C-D carry rule).
 *
 * FEAT-H048 (over FEAT-PD019 T3): the wielded render — the third and last
 * consumer of the group page's one acting context. With an `acting` context
 * (a hat with standing, selected on the page), the read and both writes carry
 * the acting group, a banner names the substitution, and compose/Retract gate
 * on the HAT's `send_announcements` — pure substitution, nothing of the
 * wielder's own standing mixes in. RULED: a board is not a cadence surface, so
 * both acts CONFIRM with copy naming the wielding (no H047-style composer
 * label). Group authors badge on the additive `kind` key, in both views.
 */
const PAGE = 20;

/** FEAT-H048: the acting context the page passes when a hat is selected — the
 *  same shape the Forum and Conversations sections already receive. */
export interface AnnouncementsActingContext {
  groupId: string;
  name: string;
  /** The hat's substitution permissions (H018's already-fetched read). */
  permissions: string[];
}

export function GroupAnnouncementsSection({
  groupId,
  acting = null,
}: {
  groupId: string;
  acting?: AnnouncementsActingContext | null;
}) {
  const actingId = acting?.groupId;
  const [items, setItems] = useState<Announcement[] | null>(() =>
    peekGroupAnnouncements(groupId, actingId),
  );
  const [failed, setFailed] = useState(false);
  const [membersOnly, setMembersOnly] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [perms, setPerms] = useState<Set<string>>(new Set());

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const [confirmRetract, setConfirmRetract] = useState<string | null>(null);
  const [retractBusy, setRetractBusy] = useState(false);

  // FEAT-H048 STORY-2: the wielded announce names the wielding before it fires
  // (the H018 rabbit hole — no session-wide acting mode; each act names it).
  const [confirmWieldedSend, setConfirmWieldedSend] = useState(false);

  // FEAT-H048: under a hat, affordances key on the HAT's permissions — pure
  // substitution, never the wielder's own grants (ADR-U041 §2a).
  const can = (p: string) => (acting ? acting.permissions.includes(p) : perms.has(p));

  // 2026-09-05 (the Ferd-close E2E race, the conversations section's shape):
  // only the LATEST read may write — a read takes a sequence number before
  // its await and drops its result if a newer read has started since.
  const readSeq = useRef(0);
  const load = useCallback(async () => {
    const seq = ++readSeq.current;
    try {
      const rows = await fetchGroupAnnouncements(groupId, undefined, actingId);
      if (seq !== readSeq.current) return; // superseded by a newer read
      setItems(rows);
      setHasMore(rows.length >= PAGE);
      setFailed(false);
      setMembersOnly(false);
    } catch (err) {
      // Post-6-done fix (2026-08-14, live walk): a member-gated refusal is not
      // a malfunction — honest members-only copy, never the failure fallback.
      // FEAT-H048: under a hat the same branch names the hat's insufficiency.
      if (seq !== readSeq.current) return; // superseded by a newer read
      setMembersOnly(isForbidden(err));
      setFailed(!isForbidden(err));
    }
  }, [groupId, actingId]);

  useEffect(() => {
    let active = true;
    // FEAT-H048: a view switch (Myself <-> a hat) repaints from that view's own
    // peek — the two views never share a cache entry.
    setItems(peekGroupAnnouncements(groupId, actingId));
    setMembersOnly(false);
    setFailed(false);
    (async () => {
      await load();
      try {
        const p = await fetchMyPermissions(groupId);
        if (active) setPerms(new Set(p.permissions));
      } catch {
        if (active) setPerms(new Set());
      }
    })();
    return () => {
      active = false;
    };
  }, [groupId, actingId, load]);

  async function loadEarlier() {
    if (!items || items.length === 0) return;
    const oldest = items[items.length - 1].created_at;
    try {
      const older = await fetchGroupAnnouncements(groupId, oldest, actingId);
      setItems([...items, ...older]);
      setHasMore(older.length >= PAGE);
    } catch {
      setHasMore(false);
    }
  }

  async function submitSend(asGroupId?: string) {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;
    setSending(true);
    setSendError(null);
    try {
      // The confirmed row-doc carries its OWN platform-resolved author (name,
      // attribution, kind), so this prepend renders the platform's answer, not
      // optimism — wielded or not. There is no per-page senders map here to go
      // stale, which is what forced H047's wielded send to re-read.
      const created = await sendCommunityAnnouncement(groupId, t, b, asGroupId); // confirmed row
      setItems((prev) => [created, ...(prev ?? [])]);
      setTitle('');
      setBody('');
    } catch (err) {
      // Refusal surfaced honestly; the composed draft is preserved.
      setSendError(err instanceof Error ? err.message : 'Your announcement could not be sent');
    } finally {
      setSending(false);
      setConfirmWieldedSend(false);
    }
  }

  function handleSend() {
    if (title.trim() === '' || body.trim() === '') return;
    if (acting) {
      // FEAT-H048 STORY-2: the confirm names the wielding first — a board is
      // spoken to everyone, once.
      setConfirmWieldedSend(true);
      return;
    }
    void submitSend();
  }

  async function handleRetract() {
    if (!confirmRetract) return;
    setRetractBusy(true);
    try {
      const { id } = await retractAnnouncement(groupId, confirmRetract, actingId); // confirmed
      setItems((prev) => prev?.filter((a) => a.id !== id) ?? null);
      setConfirmRetract(null);
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'The announcement could not be retracted');
    } finally {
      setRetractBusy(false);
    }
  }

  return (
    <section
      data-testid="group-announcements"
      className="mt-8 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <h2 className="text-lg font-semibold text-gray-800">Announcements</h2>

      {acting && !membersOnly && (
        // FEAT-H048 STORY-1: the substitution named per-section (the H018
        // rabbit hole — never a global acting mode).
        <p
          data-testid="announcements-acting-banner"
          className="mt-2 rounded-lg bg-violet-50 px-3 py-2 text-sm text-violet-800"
        >
          Viewing as {acting.name}
        </p>
      )}

      {can('send_announcements') && (
        <div className="mt-3 space-y-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-label="Announcement title"
            data-testid="announcement-compose-title"
            placeholder="Title"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            aria-label="Announcement body"
            data-testid="announcement-compose-body"
            placeholder="Say it once, to the whole group…"
            rows={3}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <div className="flex justify-end">
            <button
              type="button"
              data-testid="announcement-send"
              onClick={handleSend}
              disabled={sending || title.trim() === '' || body.trim() === ''}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Announce
            </button>
          </div>
        </div>
      )}

      {sendError && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {sendError}
        </p>
      )}

      {membersOnly ? (
        acting ? (
          // FEAT-H048 STORY-1: the hat's insufficiency named honestly — no
          // malfunction fallback, no fake door.
          <p
            data-testid="group-announcements-hat-insufficient"
            className="mt-3 text-sm text-gray-500"
          >
            The {acting.name} hat doesn&apos;t open these announcements.
          </p>
        ) : (
          <p data-testid="group-announcements-members-only" className="mt-3 text-sm text-gray-500">
            Announcements are for members of this group.
          </p>
        )
      ) : failed ? (
        <p data-testid="group-announcements-unavailable" className="mt-3 text-sm text-gray-500">
          Announcements can&apos;t be shown right now.
        </p>
      ) : items === null ? (
        <div className="mt-3 h-16 animate-pulse rounded-lg bg-gray-100" aria-hidden="true" />
      ) : items.length === 0 ? (
        <p data-testid="group-announcements-empty" className="mt-3 text-sm text-gray-500">
          No announcements in this group yet.
        </p>
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {items.map((a) => (
              <li
                key={a.id}
                data-testid={`announcement-${a.id}`}
                className="rounded-lg border border-gray-100 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 data-testid={`announcement-title-${a.id}`} className="text-sm font-semibold text-gray-800">
                    {a.title}
                  </h3>
                  {can('send_announcements') && (
                    <button
                      type="button"
                      data-testid={`announcement-retract-${a.id}`}
                      onClick={() => setConfirmRetract(a.id)}
                      className="shrink-0 rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Retract
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{a.body}</p>
                <div className="mt-2 flex items-center gap-2 text-xs">
                  <span data-testid={`announcement-author-${a.id}`} className={authorClassName(a.author)}>
                    {a.author.display_name}
                  </span>
                  {authorKindBadge(a.author) && (
                    // FEAT-H048 STORY-3 (ADR-U041 §5): representation visible
                    // for what it is — the H046 badge posture; the ladder's
                    // attribution styling beside it is never overridden.
                    <span
                      data-testid={`announcement-author-badge-${a.id}`}
                      className="rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-800"
                    >
                      {authorKindBadge(a.author)}
                    </span>
                  )}
                  <span className="text-gray-400">{new Date(a.created_at).toLocaleString()}</span>
                </div>
              </li>
            ))}
          </ul>
          {hasMore && (
            <button
              type="button"
              data-testid="announcements-load-earlier"
              onClick={loadEarlier}
              className="mt-3 text-sm font-medium text-indigo-700 hover:underline"
            >
              Load earlier
            </button>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={confirmRetract !== null}
        title={acting ? `Retract as ${acting.name}?` : 'Retract this announcement?'}
        message={
          acting
            ? `You are retracting as ${acting.name} — it will leave the board for everyone. This can’t be undone.`
            : 'It will leave the board for everyone. This can’t be undone.'
        }
        confirmText={acting ? `Retract as ${acting.name}` : 'Retract'}
        variant="danger"
        busy={retractBusy}
        onConfirm={handleRetract}
        onCancel={() => setConfirmRetract(null)}
      />

      {acting && (
        // FEAT-H048 STORY-2: the wielded announce, named before it fires.
        <ConfirmModal
          isOpen={confirmWieldedSend}
          title={`Announce as ${acting.name}?`}
          message={`You are announcing as ${acting.name} — the board will carry the group's name, not yours, and everyone in this group is told.`}
          confirmText={`Announce as ${acting.name}`}
          busy={sending}
          onConfirm={() => void submitSend(acting.groupId)}
          onCancel={() => setConfirmWieldedSend(false)}
        />
      )}
    </section>
  );
}
