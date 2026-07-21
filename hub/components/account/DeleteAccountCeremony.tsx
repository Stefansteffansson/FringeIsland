'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestDelete } from '@/lib/account/lifecycleClient';

/**
 * FEAT-H029 — the delete ceremony (IDN-10, C-F board F-2/F-3). A deliberate,
 * multi-step surface — never a one-click destruction:
 *   1. What this means — the honest F-2 split: what is erased (journal, journey
 *      record) and what remains for others, attributed "Former member"
 *      (forum posts, messages). Immediate and irreversible (F-3 — no grace
 *      period, no countdown).
 *   2. The export offer — a working path to the FEAT-H010 download, reachable
 *      before any destructive control (CB-6: access before erasure; never
 *      gated, even if the member exported yesterday).
 *   3. Type-to-confirm — the destructive control stays disabled until the
 *      member types the exact phrase; disabled again while in flight (never
 *      double-fired; the platform's terminal-reject is the backstop).
 * On success the platform has already ended every session; the Hub clears its
 * local state on the farewell page (STORY-3) — no authenticated flash, no
 * optimistic farewell.
 */
export const DELETE_CONFIRM_PHRASE = 'delete my account';

export function DeleteAccountCeremony({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phraseMatches = typed.trim().toLowerCase() === DELETE_CONFIRM_PHRASE;

  const destroy = async () => {
    if (!phraseMatches || busy) return;
    setBusy(true);
    setError(null);
    try {
      await requestDelete();
      // Confirmed by the platform — sessions are already dead server-side.
      // The farewell page clears local auth state on mount (STORY-3).
      router.replace('/farewell');
    } catch (err) {
      // Failure leaves the member whole (STORY-5): stay here, say why, allow
      // retry — never a false or partial farewell.
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <div
      data-testid="delete-account-ceremony"
      className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 p-5"
    >
      <h3 className="text-base font-semibold text-red-900">Delete my account — forever</h3>

      <div data-testid="delete-consequences" className="mt-3 space-y-2 text-sm text-red-900">
        <p>
          This is <strong>immediate and cannot be undone</strong>. Your private journal and your
          journey record are <strong>erased</strong>. Your groups see you leave the way the
          platform always handles a departure.
        </p>
        <p>
          What you wrote to others — forum posts and messages — <strong>stays with them</strong>,
          shown as &ldquo;Former member&rdquo;. Nothing you shared is ripped out of anyone
          else&rsquo;s record.
        </p>
      </div>

      <div className="mt-4">
        <a
          data-testid="delete-export-offer"
          href="/api/account/export"
          className="inline-block rounded-lg border-2 border-red-300 px-4 py-2 text-sm font-semibold text-red-800 transition-colors hover:bg-red-100"
        >
          Download my data first
        </a>
      </div>

      <div className="mt-4">
        <label htmlFor="delete-confirm-input" className="block text-sm font-medium text-red-900">
          Type <span className="font-mono font-bold">{DELETE_CONFIRM_PHRASE}</span> to confirm:
        </label>
        <input
          id="delete-confirm-input"
          data-testid="delete-confirm-input"
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          disabled={busy}
          autoComplete="off"
          className="mt-2 w-full rounded-lg border-2 border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none disabled:opacity-50"
        />
      </div>

      {error && (
        <p role="alert" data-testid="delete-error" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-3">
        <button
          type="button"
          data-testid="delete-account-confirm"
          onClick={destroy}
          disabled={!phraseMatches || busy}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? 'Deleting…' : 'Delete my account forever'}
        </button>
        <button
          type="button"
          data-testid="delete-account-cancel"
          onClick={onCancel}
          disabled={busy}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
