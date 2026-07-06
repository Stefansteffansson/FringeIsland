'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  acceptInvitation,
  declineInvitation,
  fetchMyInvitations,
} from '@/lib/groups/client';
import type { MyInvitation } from '@/lib/groups/invitations';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * FEAT-H015 STORY-4 — my invitations, above the groups list.
 * The invitation CONTEXT (the contract returns name/description/inviter).
 * Post-6-done fix (2026-07-06): the group name links to the group page —
 * the revealed-visibility amendment lets an invited FIM see the group's
 * face before answering (look before you answer). Accept joins and hands
 * the page its groups re-read (one refresh — the group appears as the
 * invitation leaves); Decline is ConfirmModal-gated. No pending
 * invitations → no section at all. Auto-claimed-at-signup invitations render
 * and answer identically — this component cannot tell the difference, by design.
 */
export function MyInvitations({ onAnswered }: { onAnswered: () => void }) {
  const [invitations, setInvitations] = useState<MyInvitation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [declineTarget, setDeclineTarget] = useState<MyInvitation | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setInvitations(await fetchMyInvitations());
      setError(null);
    } catch {
      setInvitations(null);
      setError('Failed to load your invitations.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const accept = async (inv: MyInvitation) => {
    setActionError(null);
    setBusy(true);
    try {
      await acceptInvitation(inv.group_id);
      await load();
      onAnswered();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const confirmDecline = async () => {
    if (!declineTarget) return;
    setActionError(null);
    setBusy(true);
    try {
      await declineInvitation(declineTarget.group_id);
      setDeclineTarget(null);
      await load();
    } catch (err) {
      setActionError((err as Error).message);
      setDeclineTarget(null);
    } finally {
      setBusy(false);
    }
  };

  if (error) {
    return (
      <p role="alert" className="mb-6 text-sm text-red-600">
        {error}
      </p>
    );
  }
  if (!invitations || invitations.length === 0) return null;

  return (
    <div
      data-testid="my-invitations"
      className="mb-6 rounded-xl border border-blue-100 bg-blue-50 p-6"
    >
      <h2 className="mb-3 text-lg font-semibold text-gray-800">You are invited</h2>
      {actionError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {actionError}
        </p>
      )}
      <ul className="space-y-3">
        {invitations.map((inv) => (
          <li
            key={inv.group_id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-white px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                <Link
                  href={`/groups/${encodeURIComponent(inv.group_id)}`}
                  className="hover:underline"
                >
                  {inv.group_name}
                </Link>
              </p>
              {inv.group_description && (
                <p className="text-xs text-gray-600">{inv.group_description}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">
                Invited by {inv.invited_by_display_name ?? 'someone'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                data-testid={`accept-invitation-${inv.group_id}`}
                disabled={busy}
                onClick={() => void accept(inv)}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                data-testid={`decline-invitation-${inv.group_id}`}
                disabled={busy}
                onClick={() => setDeclineTarget(inv)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>

      <ConfirmModal
        isOpen={declineTarget !== null}
        title="Decline this invitation?"
        message={
          declineTarget
            ? `You will not join "${declineTarget.group_name}". They can invite you again later.`
            : ''
        }
        confirmText="Decline invitation"
        cancelText="Keep it"
        variant="warning"
        busy={busy}
        onConfirm={() => void confirmDecline()}
        onCancel={() => setDeclineTarget(null)}
      />
    </div>
  );
}
