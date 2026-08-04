'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import type { AdminUserDetail as Detail, AdminUserMembership } from '@/lib/admin/users';

/**
 * FEAT-H036 STORY-2..6 — /admin/members/[id]: identity + state, the
 * memberships panel with per-row Remove (ADM-18), and the STATE-HONEST action
 * rail — derived from payload facts only (account_state, is_platform_admin,
 * deactivation_origin, memberships[].removal_scenario); the surface never
 * offers what the contract refuses, and never recomputes lifecycle rules.
 * Ceremony weight escalates with irreversibility: hard delete carries the
 * H029-class type-to-confirm (never one click lighter than self-delete).
 * Every mutation repaints from a fresh read; refusals render the platform's
 * message verbatim (the 409 body passes through).
 */

const STATE_STYLES: Record<string, string> = {
  paused: 'bg-amber-100 text-amber-800',
  suspended: 'bg-red-100 text-red-700',
  decommissioned: 'bg-gray-200 text-gray-700',
};

const SCENARIO_COPY: Record<string, string> = {
  regular_leave: 'They leave the group; the group continues.',
  steward_handover: 'They are the only Steward — stewardship hands to FringeIsland as caretaker.',
  group_closure: 'They are the only member — this closes the group.',
};

type ViewState =
  | { kind: 'loading' }
  | { kind: 'refused' }
  | { kind: 'error' }
  | { kind: 'loaded'; detail: Detail; viewerIsSelf: boolean };

type Ceremony =
  | { kind: 'suspend' }
  | { kind: 'reactivate' }
  | { kind: 'decommission' }
  | { kind: 'force-logout' }
  | { kind: 'platform-exit' }
  | { kind: 'grant-admin' }
  | { kind: 'revoke-admin' }
  | { kind: 'remove'; membership: AdminUserMembership }
  | null;

export function AdminMemberDetail({ userId }: { userId: string }) {
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [ceremony, setCeremony] = useState<Ceremony>(null);
  const [hardDeleteOpen, setHardDeleteOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`);
      if (res.status === 404 || res.status === 403 || res.status === 401) {
        setView({ kind: 'refused' });
        return;
      }
      if (!res.ok) {
        setView({ kind: 'error' });
        return;
      }
      const body = (await res.json()) as { detail: Detail; viewer_is_self: boolean };
      setView({ kind: 'loaded', detail: body.detail, viewerIsSelf: body.viewer_is_self });
    } catch {
      setView({ kind: 'error' });
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = useCallback(
    async (
      path: string,
      body?: Record<string, unknown>,
      onSuccess?: (payload: Record<string, unknown>) => string | null,
    ) => {
      setBusy(true);
      setActionError(null);
      setActionSuccess(null);
      try {
        const res = await fetch(`/api/admin/users/${userId}/${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          setActionError((payload.error as string) ?? 'The action was refused.');
        } else {
          setHardDeleteOpen(false);
          setTyped('');
          if (onSuccess) setActionSuccess(onSuccess(payload));
        }
      } catch {
        setActionError('The action could not be completed.');
      } finally {
        setCeremony(null);
        setBusy(false);
        await load(); // the honest repaint — always from a fresh read
      }
    },
    [userId, load],
  );

  if (view.kind === 'refused') {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center gap-2">
        <h1 className="text-2xl font-semibold">404</h1>
        <p className="text-gray-600">This page could not be found.</p>
      </main>
    );
  }

  if (view.kind === 'loading') {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div role="status" aria-label="Loading member" className="space-y-3">
          <div className="h-8 w-1/2 animate-pulse rounded bg-gray-100" />
          <div className="h-24 animate-pulse rounded bg-gray-100" />
          <div className="h-16 animate-pulse rounded bg-gray-100" />
        </div>
      </main>
    );
  }

  if (view.kind === 'error') {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-red-800">Could not load this member.</p>
          <button
            onClick={() => {
              setView({ kind: 'loading' });
              void load();
            }}
            className="rounded bg-red-700 px-3 py-1 text-sm text-white"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const d = view.detail;
  const terminal = d.account_state === 'decommissioned';
  const canSuspend = d.account_state === 'active';
  const canReactivate = d.account_state === 'paused' || d.account_state === 'suspended';
  const canDecommission = !terminal;
  const canForceLogout = !terminal; // B-ADMIN-019: inactive members are valid targets
  const canExit = !terminal;
  const canGrant = !d.is_platform_admin && d.account_state === 'active';
  const canRevoke = d.is_platform_admin && !terminal;

  const closures = d.memberships.filter((m) => m.removal_scenario === 'group_closure').length;
  const handovers = d.memberships.filter((m) => m.removal_scenario === 'steward_handover').length;

  // W-4 (FEAT-H039): every ceremony names the unique identifier beside the
  // display name — the doppelganger guard. Email is admin-tier data already
  // on this screen.
  const who = `"${d.display_name}" (${d.email ?? 'no email on record'})`;

  // Origin-honest reactivation copy: the ceremony names what it lifts.
  const reactivateMessage =
    d.deactivation_origin === 'member'
      ? `Reactivate ${who}? This lifts a pause the member set themselves.`
      : `Reactivate ${who}? This lifts an admin hold — the member regains access immediately.`;

  const exitMessage =
    `Exit ${who} from the platform? This exits ${d.memberships.length} group${
      d.memberships.length === 1 ? '' : 's'
    }: ${closures} will close, ${handovers} hand stewardship to FringeIsland. ` +
    `The account is decommissioned and sessions end. No erasure happens — the profile remains.`;

  const revokeMessage = view.viewerIsSelf
    ? `Revoke your own platform administration (${d.email ?? 'no email on record'})? You will lose these pages immediately.`
    : `Revoke platform administration from ${who}? Their admin pages stop existing for them on their next request.`;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{d.display_name}</h1>
        {d.account_state !== 'active' && (
          <span
            data-testid="state-badge"
            className={`rounded-full px-2 py-0.5 text-xs ${
              STATE_STYLES[d.account_state] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {d.account_state}
          </span>
        )}
        {d.is_platform_admin && (
          <span
            data-testid="admin-chip"
            className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800"
          >
            Platform admin
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-gray-500">
        {d.email ?? '—'} · joined {new Date(d.created_at).toLocaleDateString()}
      </p>

      {actionError && (
        <p
          role="alert"
          data-testid="action-error"
          className="mb-4 rounded bg-red-50 p-3 text-sm text-red-800"
        >
          {actionError}
        </p>
      )}
      {actionSuccess && (
        <p
          role="status"
          data-testid="action-success"
          className="mb-4 rounded bg-green-50 p-3 text-sm text-green-800"
        >
          {actionSuccess}
        </p>
      )}

      <section aria-label="Memberships" className="mb-6">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Group memberships</h2>
        {d.memberships.length === 0 ? (
          <p className="text-sm text-gray-600">No active engagement memberships.</p>
        ) : (
          <ul className="space-y-1">
            {d.memberships.map((m) => (
              <li
                key={m.group_id}
                data-testid={`membership-row-${m.group_id}`}
                className="flex items-center gap-2 text-sm"
              >
                <span className="font-medium">{m.group_name}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {m.status}
                </span>
                {!terminal && (
                  <button
                    data-testid={`remove-from-group-${m.group_id}`}
                    onClick={() => setCeremony({ kind: 'remove', membership: m })}
                    className="ml-2 rounded border border-red-200 px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Actions" className="flex flex-wrap gap-3">
        {canSuspend && (
          <button
            data-testid="suspend-member"
            onClick={() => setCeremony({ kind: 'suspend' })}
            className="rounded bg-red-700 px-4 py-2 text-sm text-white"
          >
            Suspend
          </button>
        )}
        {canReactivate && (
          <button
            data-testid="reactivate-member"
            onClick={() => setCeremony({ kind: 'reactivate' })}
            className="rounded bg-amber-600 px-4 py-2 text-sm text-white"
          >
            Reactivate
          </button>
        )}
        {canDecommission && (
          <button
            data-testid="decommission-member"
            onClick={() => setCeremony({ kind: 'decommission' })}
            className="rounded bg-red-800 px-4 py-2 text-sm text-white"
          >
            Decommission
          </button>
        )}
        {canForceLogout && (
          <button
            data-testid="force-logout-member"
            onClick={() => setCeremony({ kind: 'force-logout' })}
            className="rounded bg-gray-700 px-4 py-2 text-sm text-white"
          >
            Force sign-out
          </button>
        )}
        {canExit && (
          <button
            data-testid="platform-exit-member"
            onClick={() => setCeremony({ kind: 'platform-exit' })}
            className="rounded bg-red-900 px-4 py-2 text-sm text-white"
          >
            Platform exit
          </button>
        )}
        {canGrant && (
          <button
            data-testid="grant-admin"
            onClick={() => setCeremony({ kind: 'grant-admin' })}
            className="rounded bg-indigo-700 px-4 py-2 text-sm text-white"
          >
            Grant platform admin
          </button>
        )}
        {canRevoke && (
          <button
            data-testid="revoke-admin"
            onClick={() => setCeremony({ kind: 'revoke-admin' })}
            className="rounded bg-indigo-900 px-4 py-2 text-sm text-white"
          >
            Revoke platform admin
          </button>
        )}
        <button
          data-testid="hard-delete-member"
          onClick={() => setHardDeleteOpen((o) => !o)}
          className="rounded border border-red-700 px-4 py-2 text-sm text-red-700"
        >
          Hard delete
        </button>
      </section>

      {hardDeleteOpen && (
        <section
          aria-label="Hard delete"
          data-testid="hard-delete-panel"
          className="mt-4 rounded border border-red-300 bg-red-50 p-4"
        >
          <p className="mb-2 text-sm text-red-900">
            Hard delete permanently removes this account ({d.email ?? 'no email on record'}) and
            their private record. Their forum posts and journeys reattribute to &quot;[Deleted
            User]&quot;. This cannot be undone.
          </p>
          <label className="mb-2 block text-sm text-red-900" htmlFor="hard-delete-input">
            Type the member&apos;s display name to confirm: <strong>{d.display_name}</strong>
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="hard-delete-input"
              data-testid="hard-delete-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="rounded border border-red-300 px-2 py-1 text-sm"
            />
            <button
              data-testid="hard-delete-confirm"
              disabled={typed.trim() !== d.display_name || busy}
              onClick={() => void mutate('hard-delete')}
              className="rounded bg-red-800 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
              Hard delete
            </button>
          </div>
        </section>
      )}

      <ConfirmModal
        isOpen={ceremony?.kind === 'suspend'}
        title="Suspend member"
        message={`Suspend ${who}? They lose access until an admin reactivates the account; this hold cannot be lifted by the member.`}
        confirmText="Suspend"
        variant="danger"
        busy={busy}
        onConfirm={() => void mutate('suspend')}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
      <ConfirmModal
        isOpen={ceremony?.kind === 'reactivate'}
        title="Reactivate member"
        message={reactivateMessage}
        confirmText="Reactivate"
        variant="warning"
        busy={busy}
        onConfirm={() => void mutate('reactivate')}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
      <ConfirmModal
        isOpen={ceremony?.kind === 'decommission'}
        title="Decommission member"
        message={`Decommission ${who}? The account closes terminally — this cannot be undone. Memberships and history remain on record.`}
        confirmText="Decommission"
        variant="danger"
        busy={busy}
        onConfirm={() => void mutate('decommission')}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
      <ConfirmModal
        isOpen={ceremony?.kind === 'force-logout'}
        title="Force sign-out"
        message={`Sign ${who} out everywhere? Every session ends now and their open tabs sign out within seconds.`}
        confirmText="Force sign-out"
        variant="warning"
        busy={busy}
        onConfirm={() =>
          void mutate('force-logout', undefined, (payload) => {
            const n = (payload.count as number) ?? 0;
            return `${n} session${n === 1 ? '' : 's'} signed out.`;
          })
        }
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
      <ConfirmModal
        isOpen={ceremony?.kind === 'platform-exit'}
        title="Platform exit"
        message={exitMessage}
        confirmText="Exit from platform"
        variant="danger"
        busy={busy}
        onConfirm={() =>
          void mutate('platform-exit', undefined, (payload) => {
            const n = (payload.groups_exited as number) ?? 0;
            return `Exited ${n} group${n === 1 ? '' : 's'}; the account is decommissioned.`;
          })
        }
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
      <ConfirmModal
        isOpen={ceremony?.kind === 'grant-admin'}
        title="Grant platform administrator"
        message={`Grant platform administration to ${who}? They gain every admin page and action, and are notified of the role.`}
        confirmText="Grant"
        variant="warning"
        busy={busy}
        onConfirm={() => void mutate('grant-admin')}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
      <ConfirmModal
        isOpen={ceremony?.kind === 'revoke-admin'}
        title="Revoke platform administrator"
        message={revokeMessage}
        confirmText="Revoke"
        variant="danger"
        busy={busy}
        onConfirm={() => void mutate('revoke-admin')}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
      <ConfirmModal
        isOpen={ceremony?.kind === 'remove'}
        title="Remove from group"
        message={
          ceremony?.kind === 'remove'
            ? `Remove ${who} from "${ceremony.membership.group_name}"? ${
                SCENARIO_COPY[ceremony.membership.removal_scenario] ??
                'The platform classifies the departure when it runs.'
              }`
            : ''
        }
        confirmText="Remove"
        variant="danger"
        busy={busy}
        onConfirm={() => {
          if (ceremony?.kind === 'remove') {
            void mutate('remove-from-group', { groupId: ceremony.membership.group_id });
          }
        }}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
    </main>
  );
}
