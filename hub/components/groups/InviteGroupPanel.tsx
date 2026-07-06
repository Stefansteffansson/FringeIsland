'use client';

import { useState } from 'react';
import {
  inviteGroupClient,
  searchInvitableGroupsClient,
} from '@/lib/groups/client';

/**
 * FEAT-H018 STORY-2 — "Invite a group" (MEM-10 admission, ADR-U041).
 * Rendered by the page only for invite_members holders (the already-fetched
 * effective-permissions read — no probing). The typeahead relays the
 * FEAT-PC015 `search_invitable_groups` hits (public active engagement groups,
 * cap 8 contract-side); refusal copy (cycle / duplicate / self) renders
 * VERBATIM in place. The invited group answers through its own wielders —
 * nothing here pre-empts the answer.
 */
export function InviteGroupPanel({
  groupId,
  onMutated,
}: {
  groupId: string;
  onMutated: () => void;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<Array<{ id: string; name: string }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const search = async () => {
    if (query.trim() === '') return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setHits(await searchInvitableGroupsClient(groupId, query.trim()));
    } catch (err) {
      setHits(null);
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const invite = async (invitedGroupId: string, name: string) => {
    setBusy(true);
    setError(null);
    try {
      await inviteGroupClient(groupId, invitedGroupId);
      setNotice(`The invitation to ${name} is out — its representatives answer for it.`);
      setHits(null);
      setQuery('');
      onMutated();
    } catch (err) {
      // The contract's honest reason (cycle / duplicate / self) — in place.
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="invite-group-panel"
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-1 text-lg font-semibold text-gray-800">Invite a group</h2>
      <p className="mb-3 text-xs text-gray-500">
        A whole group can join as a member — it acts through people it has
        empowered.
      </p>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mb-3 text-sm text-emerald-700">
          {notice}
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          type="text"
          data-testid="invite-group-query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search public groups..."
          className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm"
        />
        <button
          type="button"
          data-testid="invite-group-search"
          disabled={busy || query.trim() === ''}
          onClick={() => void search()}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Search
        </button>
      </div>

      {hits !== null &&
        (hits.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No groups match that search.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {hits.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between gap-2 text-sm text-gray-800"
              >
                {h.name}
                <button
                  type="button"
                  data-testid={`invite-group-hit-${h.id}`}
                  disabled={busy}
                  onClick={() => void invite(h.id, h.name)}
                  className="rounded border border-indigo-200 px-2 py-0.5 text-xs text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                >
                  Invite
                </button>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
