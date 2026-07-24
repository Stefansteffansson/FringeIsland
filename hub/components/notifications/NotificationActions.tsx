'use client';

import { useState } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import {
  notificationResponses,
  type NotificationResponse,
} from '@/lib/notifications/format';
import type { NotificationRow } from '@/lib/notifications/queries';

/**
 * FEAT-H031 (N-B) — the generic typed-action affordance for an actionable
 * notification. Response buttons are data-driven from `action_type`
 * (Accept/Decline in Ferd; a new response is a registry entry, not a component
 * change — ADR-U051/U008); each is `ConfirmModal`-gated. Dispatch is delegated
 * to `onRespond` (the surface owns the optimistic update + rollback). An
 * unrecognised `action_type` yields no responses, so the component renders
 * nothing and the row falls back to its passive read-only status chip.
 *
 * Rendered as a SIBLING of `NotificationItem` (never inside it) — the bell wraps
 * the item in a `<button>`, and buttons must not nest.
 */
const INTENT_CLASS: Record<NotificationResponse['intent'], string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  danger: 'border border-red-300 text-red-700 hover:bg-red-50',
  neutral: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
};

export function NotificationActions({
  row,
  onRespond,
}: {
  row: NotificationRow;
  onRespond: (row: NotificationRow, response: NotificationResponse) => Promise<void>;
}) {
  const responses = notificationResponses(row.action_type);
  const [pending, setPending] = useState<NotificationResponse | null>(null);
  const [busy, setBusy] = useState(false);

  if (responses.length === 0) return null;

  const confirm = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      await onRespond(row, pending);
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-2 flex gap-2" data-testid="notification-actions">
      {responses.map((r) => (
        <button
          key={r.key}
          type="button"
          data-testid={`notif-action-${r.key}`}
          disabled={busy}
          onClick={() => setPending(r)}
          className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${INTENT_CLASS[r.intent]}`}
        >
          {r.label}
        </button>
      ))}
      <ConfirmModal
        isOpen={pending != null}
        busy={busy}
        title={pending ? `${pending.label}?` : ''}
        message={pending ? `${pending.label} “${row.title}”?` : ''}
        confirmText={pending?.label ?? 'Confirm'}
        cancelText="Cancel"
        variant={pending?.intent === 'danger' ? 'danger' : 'info'}
        onConfirm={confirm}
        onCancel={() => {
          if (!busy) setPending(null);
        }}
      />
    </div>
  );
}
