'use client';

import { useEffect, useRef, useState } from 'react';
import {
  cancelEmailInvite,
  cancelMemberInvite,
  searchMembers,
  sendInvite,
} from '@/lib/groups/client';
import type {
  EmailInvitation,
  MemberInvitation,
  PendingInvitations,
  SearchHit,
} from '@/lib/groups/invitations';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * FEAT-H015 STORY-1/2/3 — the invitations panel.
 * Renders ONLY for an invite_members holder — gated on the already-fetched
 * effective-permissions payload, never client-computed (the substrate refuses
 * everyone else anyway). The typeahead disables hits from the payload's
 * membership_status; the email path carries the HONEST v1 copy: the invitation
 * waits at sign-up, NO email is sent (D4 — the V3 dispatch seam). The pending
 * list renders both kinds distinctly (they cancel through different routes —
 * never conflated); the Expired badge is payload-driven, no client date math.
 * Every mutation re-reads via onMutated (the page's one refresh path);
 * refusals surface in place and forms keep their state.
 */
export function InvitationsPanel({
  groupId,
  permissions,
  pending,
  error,
  onMutated,
}: {
  groupId: string;
  permissions: string[] | null;
  pending: PendingInvitations | null;
  error: string | null;
  onMutated: () => void;
}) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [email, setEmail] = useState('');
  const [sentNote, setSentNote] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cancelMemberTarget, setCancelMemberTarget] = useState<MemberInvitation | null>(null);
  const [cancelEmailTarget, setCancelEmailTarget] = useState<EmailInvitation | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canInvite = permissions?.includes('invite_members') ?? false;

  // Debounced typeahead (2+ chars). The contract caps at 8 and never returns
  // emails; the query itself is member content and never enters telemetry.
  useEffect(() => {
    if (!canInvite) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setHits(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      searchMembers(groupId, q)
        .then(setHits)
        .catch((err) => {
          setHits(null);
          setActionError((err as Error).message);
        });
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, groupId, canInvite]);

  if (!canInvite) return null;

  const inviteHit = async (hit: SearchHit) => {
    setActionError(null);
    setSentNote(null);
    try {
      await sendInvite(groupId, { member_group_id: hit.member_group_id });
      setQuery('');
      setHits(null);
      onMutated();
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const inviteEmail = async () => {
    if (email.trim() === '') return;
    setActionError(null);
    setSentNote(null);
    setBusy(true);
    try {
      const result = await sendInvite(groupId, { email: email.trim() });
      setSentNote(
        result.kind === 'member_invitation'
          ? 'That address already belongs to a member — they have been invited directly.'
          : 'The invitation is saved and waits for them at sign-up — no email is sent yet.',
      );
      setEmail('');
      onMutated();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmCancel = async () => {
    setBusy(true);
    setActionError(null);
    try {
      if (cancelMemberTarget) {
        await cancelMemberInvite(groupId, cancelMemberTarget.member_group_id);
      } else if (cancelEmailTarget) {
        await cancelEmailInvite(groupId, cancelEmailTarget.id);
      }
      setCancelMemberTarget(null);
      setCancelEmailTarget(null);
      onMutated();
    } catch (err) {
      setActionError((err as Error).message);
      setCancelMemberTarget(null);
      setCancelEmailTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="invitations-panel"
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Invitations</h2>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {actionError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {actionError}
        </p>
      )}
      {sentNote && (
        <p data-testid="invite-sent-note" className="mb-3 text-sm text-green-700">
          {sentNote}
        </p>
      )}

      <div className="mb-4">
        <label htmlFor="member-search" className="mb-1 block text-xs font-medium text-gray-700">
          Find a member
        </label>
        <input
          id="member-search"
          data-testid="member-search-input"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name, or an exact email address"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
        {hits && (
          <ul data-testid="member-search-results" className="mt-2 space-y-1">
            {hits.length === 0 ? (
              <li className="text-sm text-gray-500">Nobody found.</li>
            ) : (
              hits.map((hit) => (
                <li key={hit.member_group_id}>
                  <button
                    type="button"
                    disabled={hit.membership_status !== null}
                    onClick={() => void inviteHit(hit)}
                    className="w-full rounded-lg border border-gray-100 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {hit.display_name}
                    {hit.membership_status === 'active' && (
                      <span className="ml-2 text-xs text-gray-400">already a member</span>
                    )}
                    {hit.membership_status === 'invited' && (
                      <span className="ml-2 text-xs text-gray-400">already invited</span>
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="invite-email" className="mb-1 block text-xs font-medium text-gray-700">
          Invite by email
        </label>
        <div className="flex gap-2">
          <input
            id="invite-email"
            data-testid="invite-email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="someone@example.com"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="button"
            data-testid="invite-email-button"
            disabled={busy || email.trim() === ''}
            onClick={() => void inviteEmail()}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Invite
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-400">
          The invitation waits for them when they sign up — no email is sent yet.
        </p>
      </div>

      {pending === null && !error ? (
        <p className="text-sm text-gray-500">Loading invitations...</p>
      ) : pending ? (
        <div data-testid="pending-invitations">
          <h3 className="mb-2 text-sm font-medium text-gray-700">Waiting for an answer</h3>
          {pending.member_invitations.length === 0 && pending.email_invitations.length === 0 ? (
            <p className="text-sm text-gray-500">No outstanding invitations.</p>
          ) : (
            <ul className="space-y-2">
              {pending.member_invitations.map((inv) => (
                <li
                  key={inv.member_group_id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                >
                  <span className="text-sm text-gray-800">
                    {inv.display_name}
                    <span className="ml-2 text-xs text-gray-400">
                      invited by {inv.invited_by_display_name ?? 'someone'}
                    </span>
                  </span>
                  <button
                    type="button"
                    data-testid={`cancel-member-invitation-${inv.member_group_id}`}
                    onClick={() => setCancelMemberTarget(inv)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Cancel
                  </button>
                </li>
              ))}
              {pending.email_invitations.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2"
                >
                  <span className="text-sm text-gray-800">
                    {inv.invited_email}
                    {inv.expired && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                        Expired
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    data-testid={`cancel-email-invitation-${inv.id}`}
                    onClick={() => setCancelEmailTarget(inv)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Cancel
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      <ConfirmModal
        isOpen={cancelMemberTarget !== null || cancelEmailTarget !== null}
        title="Cancel this invitation?"
        message={
          cancelMemberTarget
            ? `${cancelMemberTarget.display_name} will no longer be able to accept.`
            : 'This address will no longer be able to claim the invitation at sign-up.'
        }
        confirmText="Cancel invitation"
        cancelText="Keep it"
        variant="danger"
        busy={busy}
        onConfirm={() => void confirmCancel()}
        onCancel={() => {
          setCancelMemberTarget(null);
          setCancelEmailTarget(null);
        }}
      />
    </div>
  );
}
