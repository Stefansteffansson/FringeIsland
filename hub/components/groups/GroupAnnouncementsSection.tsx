'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  peekGroupAnnouncements,
  fetchGroupAnnouncements,
  sendCommunityAnnouncement,
  retractAnnouncement,
  type Announcement,
} from '@/lib/announcements/client';
import { authorClassName } from '@/lib/forum/attribution';
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
 */
const PAGE = 20;

export function GroupAnnouncementsSection({ groupId }: { groupId: string }) {
  const [items, setItems] = useState<Announcement[] | null>(() => peekGroupAnnouncements(groupId));
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

  const can = (p: string) => perms.has(p);

  const load = useCallback(async () => {
    try {
      const rows = await fetchGroupAnnouncements(groupId);
      setItems(rows);
      setHasMore(rows.length >= PAGE);
      setFailed(false);
      setMembersOnly(false);
    } catch (err) {
      // Post-6-done fix (2026-08-14, live walk): a member-gated refusal is not
      // a malfunction — honest members-only copy, never the failure fallback.
      setMembersOnly(isForbidden(err));
      setFailed(!isForbidden(err));
    }
  }, [groupId]);

  useEffect(() => {
    let active = true;
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
  }, [groupId, load]);

  async function loadEarlier() {
    if (!items || items.length === 0) return;
    const oldest = items[items.length - 1].created_at;
    try {
      const older = await fetchGroupAnnouncements(groupId, oldest);
      setItems([...items, ...older]);
      setHasMore(older.length >= PAGE);
    } catch {
      setHasMore(false);
    }
  }

  async function handleSend() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) return;
    setSending(true);
    setSendError(null);
    try {
      const created = await sendCommunityAnnouncement(groupId, t, b); // confirmed row
      setItems((prev) => [created, ...(prev ?? [])]);
      setTitle('');
      setBody('');
    } catch (err) {
      // Refusal surfaced honestly; the composed draft is preserved.
      setSendError(err instanceof Error ? err.message : 'Your announcement could not be sent');
    } finally {
      setSending(false);
    }
  }

  async function handleRetract() {
    if (!confirmRetract) return;
    setRetractBusy(true);
    try {
      const { id } = await retractAnnouncement(groupId, confirmRetract); // confirmed
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
        <p data-testid="group-announcements-members-only" className="mt-3 text-sm text-gray-500">
          Announcements are for members of this group.
        </p>
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
        title="Retract this announcement?"
        message="It will leave the board for everyone. This can’t be undone."
        confirmText="Retract"
        variant="danger"
        busy={retractBusy}
        onConfirm={handleRetract}
        onCancel={() => setConfirmRetract(null)}
      />
    </section>
  );
}
