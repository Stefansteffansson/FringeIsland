'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchMyNominations, respondToNomination } from '@/lib/groups/client';
import type { PendingNomination } from '@/lib/groups/leadership';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * FEAT-H017 STORY-2 — the nominee's pending stewardship offers, above the
 * groups list. Sourced from the scoped own-notifications read (the A-NTF
 * re-home seam, D8 — deliberately NOT an inbox; this section re-homes into
 * the inbox when A-NTF lands). Shows the group and the contract-enforced
 * response window (shown, never counted down client-side). Accept and
 * Decline are both ConfirmModal-gated; outcomes are relayed never predicted:
 * accept → the contract's guaranteed postcondition ("you are now the
 * Steward"), decline → "passed on" WITHOUT naming next-nominee-vs-FringeIsland
 * (the routing is the contract's decision). The expired/answered 409 renders
 * verbatim and the re-read resolves the affordance. No pending offers → no
 * section at all.
 */
export function PendingNominations({ onAnswered }: { onAnswered: () => void }) {
  const [nominations, setNominations] = useState<PendingNomination[] | null>(null);
  const [answer, setAnswer] = useState<{ nomination: PendingNomination; accept: boolean } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setNominations(await fetchMyNominations());
    } catch {
      // The section is an affordance, not a page — fail silent-empty; the
      // durable row waits and the next visit retries.
      setNominations(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const confirmAnswer = async () => {
    if (!answer) return;
    setBusy(true);
    setActionError(null);
    setOutcome(null);
    const { nomination, accept } = answer;
    try {
      await respondToNomination(nomination.notification_id, accept);
      setOutcome(
        accept
          ? `You are now the Steward of "${nomination.group_name}".`
          : 'The offer has been passed on.',
      );
      if (accept) onAnswered();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setAnswer(null);
      setBusy(false);
      // Answered or expired either way — the re-read resolves the affordance.
      await load();
    }
  };

  const hasPending = nominations !== null && nominations.length > 0;
  if (!hasPending && !outcome && !actionError) return null;

  return (
    <div
      data-testid="pending-nominations"
      className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 p-6"
    >
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        You are nominated to lead
      </h2>
      {outcome && (
        <p role="status" className="mb-3 text-sm text-emerald-700">
          {outcome}
        </p>
      )}
      {actionError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {actionError}
        </p>
      )}
      {hasPending && (
        <ul className="space-y-3">
          {nominations!.map((nom) => (
            <li
              key={nom.notification_id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-indigo-100 bg-white px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Steward of &quot;{nom.group_name}&quot;
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Respond by {new Date(nom.expires_at).toLocaleDateString()} — after
                  that the offer passes on.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid={`accept-nomination-${nom.notification_id}`}
                  disabled={busy}
                  onClick={() => setAnswer({ nomination: nom, accept: true })}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  Accept
                </button>
                <button
                  type="button"
                  data-testid={`decline-nomination-${nom.notification_id}`}
                  disabled={busy}
                  onClick={() => setAnswer({ nomination: nom, accept: false })}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        isOpen={answer !== null}
        title={answer?.accept ? 'Accept stewardship?' : 'Decline this nomination?'}
        message={
          answer
            ? answer.accept
              ? `Become the Steward of "${answer.nomination.group_name}"? The current Steward leaves as you take over.`
              : `Decline stewardship of "${answer.nomination.group_name}"? The offer passes on.`
            : ''
        }
        confirmText={answer?.accept ? 'Accept stewardship' : 'Decline nomination'}
        cancelText="Not now"
        variant={answer?.accept ? 'info' : 'warning'}
        busy={busy}
        onConfirm={() => void confirmAnswer()}
        onCancel={() => {
          if (!busy) setAnswer(null);
        }}
      />
    </div>
  );
}
