'use client';

import { useState } from 'react';
import Link from 'next/link';
import { leaveGroupAsGroupClient } from '@/lib/groups/client';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * FEAT-H018 STORY-3 — the wielded group's memberships panel.
 * Rendered by the page ONLY when the acting-contexts read includes this group
 * (no fake doors — the substrate refuses keyless wielding anyway). Lists
 * where the group belongs and its pending invitations; Accept / Decline /
 * Withdraw act AS the group behind confirms that NAME THE WIELDING
 * (ADR-U041 §2 — spending the group's authority is a deliberate gesture).
 * Refusal copy renders verbatim in place; mutations re-read (never
 * optimistic — the D8 posture).
 */

export interface ActingMembershipRow {
  membership_id: string;
  group_id: string;
  name: string;
  status: string;
}

// FEAT-H031 (N-B): the acting-invitation RESPONSE (accept/decline) folded to the
// notification bell/inbox — this panel keeps only the wielded Withdraw and the
// read-only invited status. Reconciles with the bell on re-fetch (no realtime).
type PendingAct = { kind: 'withdraw'; row: ActingMembershipRow };

export function GroupMembershipsPanel({
  actingGroup,
  rows,
  error,
  onMutated,
}: {
  actingGroup: { id: string; name: string };
  rows: ActingMembershipRow[] | null;
  error: string | null;
  onMutated: () => void;
}) {
  const [act, setAct] = useState<PendingAct | null>(null);
  const [busy, setBusy] = useState(false);
  const [actError, setActError] = useState<string | null>(null);

  const confirmAct = async () => {
    if (!act) return;
    setBusy(true);
    setActError(null);
    try {
      await leaveGroupAsGroupClient(actingGroup.id, act.row.group_id);
      setAct(null);
      onMutated();
    } catch (err) {
      setActError((err as Error).message);
      setAct(null);
    } finally {
      setBusy(false);
    }
  };

  // The confirm names the wielding: the member is acting FOR the group.
  const copy = (a: PendingAct): { title: string; message: string; verb: string } => ({
    title: 'Withdraw the group?',
    message: `You are acting for ${actingGroup.name}: withdraw its membership of "${a.row.name}"? Its unfinished work in that group's private journeys is frozen.`,
    verb: 'Yes, withdraw',
  });

  return (
    <div
      data-testid="group-memberships-panel"
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-1 text-lg font-semibold text-gray-800">
        Memberships of this group
      </h2>
      <p className="mb-3 text-xs text-gray-500">
        Where {actingGroup.name} belongs — you can answer for it here.
      </p>

      {(error || actError) && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error ?? actError}
        </p>
      )}

      {rows === null ? (
        error ? null : <p className="text-sm text-gray-500">Loading memberships...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          {actingGroup.name} is not a member of any group.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.membership_id}
              className="flex items-center justify-between gap-3 text-sm text-gray-800"
            >
              <div className="flex items-center gap-2">
                {/* Post-6-done fix: a door, not a label — the revealed-
                    visibility amendment lets the wielder visit the group
                    their group belongs to. */}
                <Link
                  href={`/groups/${encodeURIComponent(r.group_id)}`}
                  className="hover:underline"
                >
                  {r.name}
                </Link>
                <span
                  data-testid={`membership-status-${r.membership_id}`}
                  className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                    r.status === 'invited'
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {r.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {r.status === 'invited' ? (
                  // FEAT-H031: the acting-invitation is answered in the bell/inbox
                  // now (fanned to the group's act_as_group holders) — read-only here.
                  <span
                    data-testid={`respond-in-notifications-${r.membership_id}`}
                    className="text-xs text-gray-400"
                  >
                    Answer in your notifications
                  </span>
                ) : (
                  <button
                    type="button"
                    data-testid={`withdraw-as-group-${r.membership_id}`}
                    onClick={() => {
                      setActError(null);
                      setAct({ kind: 'withdraw', row: r });
                    }}
                    className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        isOpen={act !== null}
        title={act ? copy(act).title : ''}
        message={act ? copy(act).message : ''}
        confirmText={act ? copy(act).verb : ''}
        variant={act?.kind === 'withdraw' ? 'danger' : 'info'}
        busy={busy}
        onConfirm={() => void confirmAct()}
        onCancel={() => {
          if (!busy) setAct(null);
        }}
      />
    </div>
  );
}
