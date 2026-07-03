'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import {
  fetchJournalEntries,
  postJournalEntry,
  patchJournalEntry,
  removeJournalEntry,
  type JournalEntry,
} from '@/lib/journal/client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { InlineError } from '@/components/ui/InlineError';
import { LoadingState } from '@/components/ui/LoadingState';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H011 — the journal surface container (IDN-5, STORY-1..3). Owns the
 * API-first list read + compose / edit-in-place / ConfirmModal-gated delete
 * flows over the FEAT-PD001 contracts. Every mutation RE-READS the list (the
 * single source of truth — never an optimistic local splice); a failed save
 * surfaces an error and preserves the typed text (STORY-1). Keyset "load
 * older" pages by the oldest visible entry's created_at (STORY-2). Telemetry
 * is content-free — bodies and titles never enter events (V4 no-go).
 */

type EditorState =
  | { mode: 'compose' }
  | { mode: 'edit'; entry: JournalEntry };

function EntryForm({
  initialTitle,
  initialBody,
  busy,
  onSave,
  onCancel,
}: {
  initialTitle: string | null;
  initialBody: string;
  busy: boolean;
  onSave: (title: string | null, body: string) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initialTitle ?? '');
  const [body, setBody] = useState(initialBody);
  const titleId = useId();
  const bodyId = useId();

  return (
    <form
      className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim() === '') return; // STORY-1: no empty entries
        onSave(title.trim() === '' ? null : title, body);
      }}
    >
      <div>
        <label htmlFor={titleId} className="mb-1 block text-sm font-medium text-gray-700">
          Title (optional)
        </label>
        <input
          id={titleId}
          type="text"
          value={title}
          maxLength={300}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor={bodyId} className="mb-1 block text-sm font-medium text-gray-700">
          Entry
        </label>
        <textarea
          id={bodyId}
          value={body}
          rows={5}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          Save entry
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function JournalPanel() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>({ mode: 'compose' });
  const [busy, setBusy] = useState(false);
  const [deletePending, setDeletePending] = useState<JournalEntry | null>(null);
  const [hasMore, setHasMore] = useState(true);
  // Remounts the compose form after a successful save (clears the fields).
  const [composeNonce, setComposeNonce] = useState(0);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const resolved = await fetchJournalEntries();
        if (!active) return;
        setEntries(resolved);
        setHasMore(resolved.length > 0);
        emitTelemetry('journal.viewed', { count: resolved.length });
      } catch (err) {
        if (!active) return;
        setError('We could not open your journal. Please try again.');
        emitTelemetry('journal.view_failed', { message: (err as Error).message });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [nonce]);

  async function save(title: string | null, body: string) {
    setBusy(true);
    setActionError(null);
    try {
      if (editor.mode === 'edit') {
        await patchJournalEntry(editor.entry.id, title, body);
        emitTelemetry('journal.edited', { outcome: 'success' });
      } else {
        await postJournalEntry(title, body);
        emitTelemetry('journal.saved', { outcome: 'success' });
        setComposeNonce((n) => n + 1); // clear the composer
      }
      setEditor({ mode: 'compose' });
      reload(); // single source of truth — re-read, never splice
    } catch (err) {
      // The typed text stays exactly where it is (STORY-1).
      setActionError((err as Error).message || 'We could not save your entry. Please try again.');
      emitTelemetry(editor.mode === 'edit' ? 'journal.edited' : 'journal.saved', {
        outcome: 'failed',
      });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deletePending) return;
    setBusy(true);
    setActionError(null);
    try {
      await removeJournalEntry(deletePending.id);
      emitTelemetry('journal.deleted', { outcome: 'success' });
      setDeletePending(null);
      reload();
    } catch (err) {
      setActionError((err as Error).message || 'We could not delete the entry.');
      emitTelemetry('journal.deleted', { outcome: 'failed' });
      setDeletePending(null);
    } finally {
      setBusy(false);
    }
  }

  async function loadOlder() {
    if (entries.length === 0) return;
    const oldest = entries[entries.length - 1];
    try {
      const older = await fetchJournalEntries({ before: oldest.created_at });
      setEntries((current) => [...current, ...older]);
      setHasMore(older.length > 0);
      emitTelemetry('journal.paged', { count: older.length });
    } catch {
      setActionError('We could not load older entries.');
    }
  }

  if (loading) return <LoadingState label="Opening your journal..." />;
  if (error) {
    return (
      <div className="space-y-3">
        <InlineError message={error} />
        <button
          type="button"
          onClick={reload}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <div data-testid="journal-action-error">
          <InlineError message={actionError} />
        </div>
      )}

      {editor.mode === 'compose' && (
        <EntryForm
          key={composeNonce}
          initialTitle={null}
          initialBody=""
          busy={busy}
          onSave={save}
        />
      )}

      {entries.length === 0 ? (
        <p data-testid="journal-empty" className="text-sm text-gray-600">
          Your journal is empty. Write your first entry above — it stays between
          you and the page.
        </p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) =>
            editor.mode === 'edit' && editor.entry.id === entry.id ? (
              <li key={entry.id}>
                <EntryForm
                  initialTitle={editor.entry.title}
                  initialBody={editor.entry.body}
                  busy={busy}
                  onSave={save}
                  onCancel={() => setEditor({ mode: 'compose' })}
                />
              </li>
            ) : (
              <li
                key={entry.id}
                data-testid="journal-entry"
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                {entry.title && (
                  <h2 className="mb-1 text-lg font-semibold text-gray-900">{entry.title}</h2>
                )}
                <p className="whitespace-pre-wrap text-sm text-gray-800">{entry.body}</p>
                <div className="mt-3 flex items-center justify-between">
                  <time
                    dateTime={entry.created_at}
                    className="text-xs text-gray-500"
                  >
                    {new Date(entry.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </time>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActionError(null);
                        setEditor({ mode: 'edit', entry });
                      }}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletePending(entry)}
                      className="rounded-md border border-red-200 px-3 py-1 text-xs text-red-600 transition-colors hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ),
          )}
        </ul>
      )}

      {entries.length > 0 && hasMore && (
        <button
          type="button"
          onClick={loadOlder}
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
        >
          Load older entries
        </button>
      )}

      <ConfirmModal
        isOpen={deletePending !== null}
        variant="warning"
        title="Delete entry?"
        message="This entry will be gone for good — the journal keeps no copies."
        confirmText="Yes, delete"
        cancelText="Cancel"
        busy={busy}
        onConfirm={confirmDelete}
        onCancel={() => setDeletePending(null)}
      />
    </div>
  );
}
