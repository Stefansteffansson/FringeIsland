'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AdminSuspendedContentWing } from '@/components/admin/AdminSuspendedContentWing';
import type { AdminGroupDetail as Detail } from '@/lib/admin/groups';

/**
 * FEAT-H035 STORY-2/3/4 — /admin/groups/[id]: detail with state-appropriate
 * actions, the suspend/reactivate ceremonies, and the reassign-out-of-
 * caretakership picker. State honesty: the surface never offers what the
 * contract will refuse — Reassign renders only on caretaker groups (the
 * platform refuses non-caretaker reassignment with P0001), lifecycle actions
 * only where the state machine allows. Every mutation repaints from a fresh
 * read; refusals surface visibly (never optimistic-only).
 */

const STATUS_STYLES: Record<string, string> = {
  closed: 'bg-gray-200 text-gray-700',
  archived: 'bg-amber-100 text-amber-800',
  resting: 'bg-sky-100 text-sky-800',
  suspended: 'bg-red-100 text-red-700',
};

type ViewState =
  | { kind: 'loading' }
  | { kind: 'refused' }
  | { kind: 'error' }
  | { kind: 'loaded'; detail: Detail };

// FEAT-H038 STORY-6 (FEAT-PC023): the hold ceremony is a MODE CHOICE — Rest
// (the visible steward-fix hold) or Suspend (the hard hazard hold) on an
// active group; Wake on resting, Reactivate on suspended.
type Ceremony = 'rest' | 'wake' | 'suspend' | 'reactivate' | 'reassign' | null;

export function AdminGroupDetail({ groupId }: { groupId: string }) {
  const [view, setView] = useState<ViewState>({ kind: 'loading' });
  const [ceremony, setCeremony] = useState<Ceremony>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [chosenId, setChosenId] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`);
      if (res.status === 404 || res.status === 403 || res.status === 401) {
        setView({ kind: 'refused' });
        return;
      }
      if (!res.ok) {
        setView({ kind: 'error' });
        return;
      }
      const body = (await res.json()) as { detail: Detail };
      setView({ kind: 'loaded', detail: body.detail });
    } catch {
      setView({ kind: 'error' });
    }
  }, [groupId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = useCallback(
    async (path: string, body?: Record<string, unknown>) => {
      setBusy(true);
      setActionError(null);
      try {
        const res = await fetch(`/api/admin/groups/${groupId}/${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string };
          setActionError(payload.error ?? 'The action was refused.');
        } else {
          setReassignOpen(false);
          setChosenId('');
        }
      } catch {
        setActionError('The action could not be completed.');
      } finally {
        setCeremony(null);
        setBusy(false);
        await load(); // the honest repaint — always from a fresh read
      }
    },
    [groupId, load],
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
        <div role="status" aria-label="Loading group" className="space-y-3">
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
          <p className="mb-2 text-red-800">Could not load this group.</p>
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
  const isEngagement = d.group_type === 'engagement';
  // FEAT-H038 STORY-6: active offers the mode choice (Rest | Suspend); resting
  // offers Wake | Suspend (the escalation); suspended offers Reactivate only.
  const canRest = isEngagement && d.status === 'active';
  const canWake = isEngagement && d.status === 'resting';
  const canSuspend = isEngagement && (d.status === 'active' || d.status === 'resting');
  const canReactivate = isEngagement && d.status === 'suspended';
  const canReassign = isEngagement && d.deusex_stewarded && d.status === 'active';
  const candidates = d.members.filter((m) => !m.is_steward);
  const chosen = candidates.find((m) => m.personal_group_id === chosenId);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-2xl font-semibold">{d.name}</h1>
        {d.status !== 'active' && (
          <span
            data-testid="status-badge"
            className={`rounded-full px-2 py-0.5 text-xs ${
              STATUS_STYLES[d.status] ?? 'bg-gray-100 text-gray-600'
            }`}
          >
            {d.status}
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-gray-500">
        {d.group_type} · created {new Date(d.created_at).toLocaleDateString()}
      </p>

      {d.deusex_stewarded && (
        <div
          data-testid="caretaker-banner"
          className="mb-4 rounded border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900"
        >
          FringeIsland is the caretaker of this group. Use Reassign stewardship to hand it back to
          a member.
        </div>
      )}

      {actionError && (
        <p role="alert" data-testid="action-error" className="mb-4 rounded bg-red-50 p-3 text-sm text-red-800">
          {actionError}
        </p>
      )}

      <section aria-label="Counts" className="mb-6 flex gap-6 text-sm">
        <div>
          <span className="block text-gray-500">Members</span>
          <span className="text-lg font-medium">{d.member_count}</span>
        </div>
        <div>
          <span className="block text-gray-500">People</span>
          <span className="text-lg font-medium">{d.non_system_member_count}</span>
        </div>
      </section>

      <section aria-label="Stewards" className="mb-6">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Stewards</h2>
        {d.stewards.length === 0 ? (
          <p className="text-sm text-gray-600">
            {d.deusex_stewarded ? 'No human steward — the platform is caretaking.' : 'None.'}
          </p>
        ) : (
          <ul className="space-y-1">
            {d.stewards.map((s) => (
              <li key={s.personal_group_id} data-testid="steward-row" className="text-sm">
                {s.display_name}
              </li>
            ))}
          </ul>
        )}
      </section>

      {(canRest || canWake || canSuspend || canReactivate || canReassign) && (
        <section aria-label="Actions" className="flex flex-wrap gap-3">
          {canRest && (
            <button
              data-testid="rest-group"
              onClick={() => setCeremony('rest')}
              className="rounded bg-sky-700 px-4 py-2 text-sm text-white"
            >
              Rest
            </button>
          )}
          {canWake && (
            <button
              data-testid="wake-group"
              onClick={() => setCeremony('wake')}
              className="rounded bg-sky-700 px-4 py-2 text-sm text-white"
            >
              Wake
            </button>
          )}
          {canSuspend && (
            <button
              data-testid="suspend-group"
              onClick={() => setCeremony('suspend')}
              className="rounded bg-red-700 px-4 py-2 text-sm text-white"
            >
              Suspend
            </button>
          )}
          {canReactivate && (
            <button
              data-testid="reactivate-group"
              onClick={() => setCeremony('reactivate')}
              className="rounded bg-amber-600 px-4 py-2 text-sm text-white"
            >
              Reactivate
            </button>
          )}
          {canReassign && (
            <button
              data-testid="reassign-stewardship"
              onClick={() => setReassignOpen((o) => !o)}
              className="rounded bg-indigo-700 px-4 py-2 text-sm text-white"
            >
              Reassign stewardship
            </button>
          )}
        </section>
      )}

      {reassignOpen && canReassign && (
        <section aria-label="Reassign stewardship" className="mt-4 rounded border p-4">
          {candidates.length === 0 ? (
            <p data-testid="reassign-no-candidates" className="text-sm text-gray-700">
              No eligible members — this group has no active human members to hand stewardship to.
            </p>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <select
                data-testid="reassign-picker"
                aria-label="New steward"
                value={chosenId}
                onChange={(e) => setChosenId(e.target.value)}
                className="rounded border px-2 py-1 text-sm"
              >
                <option value="">Choose a member…</option>
                {candidates.map((m) => (
                  <option key={m.personal_group_id} value={m.personal_group_id}>
                    {m.display_name}
                  </option>
                ))}
              </select>
              <button
                data-testid="reassign-confirm"
                disabled={!chosen}
                onClick={() => setCeremony('reassign')}
                className="rounded bg-indigo-700 px-3 py-1 text-sm text-white disabled:opacity-50"
              >
                Hand stewardship
              </button>
            </div>
          )}
        </section>
      )}

      {/* FEAT-H041: the content wing — suspended engagement groups only
          (state honesty both directions: the FEAT-PC026 contracts refuse
          everyone else anyway). A section refusal mid-flight (the
          reactivation race) re-reads the detail and the wing collapses. */}
      {isEngagement && d.status === 'suspended' && (
        <AdminSuspendedContentWing
          groupId={groupId}
          groupName={d.name}
          members={d.members}
          onStateDrift={load}
        />
      )}

      <ConfirmModal
        isOpen={ceremony === 'rest'}
        title="Rest group"
        message={`Rest "${d.name}"? Every member sees the group resting — content stays readable, changes are off until it is woken.`}
        confirmText="Rest"
        variant="warning"
        busy={busy}
        onConfirm={() => void mutate('rest')}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
      <ConfirmModal
        isOpen={ceremony === 'wake'}
        title="Wake group"
        message={`Wake "${d.name}"? The group returns to active for every member.`}
        confirmText="Wake"
        variant="warning"
        busy={busy}
        onConfirm={() => void mutate('wake')}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
      <ConfirmModal
        isOpen={ceremony === 'suspend'}
        title="Suspend group"
        message={`Suspend "${d.name}"? Every member sees the group marked suspended until it is reactivated.`}
        confirmText="Suspend"
        variant="danger"
        busy={busy}
        onConfirm={() => void mutate('suspend')}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
      <ConfirmModal
        isOpen={ceremony === 'reactivate'}
        title="Reactivate group"
        message={`Reactivate "${d.name}"? The group returns to active for every member.`}
        confirmText="Reactivate"
        variant="warning"
        busy={busy}
        onConfirm={() => void mutate('reactivate')}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
      <ConfirmModal
        isOpen={ceremony === 'reassign'}
        title="Hand stewardship back"
        message={`Hand stewardship of "${d.name}" to ${chosen?.display_name ?? ''}? The platform caretaker steps back and ${chosen?.display_name ?? 'the member'} becomes Steward.`}
        confirmText="Hand stewardship"
        variant="danger"
        busy={busy}
        onConfirm={() => void mutate('reassign', { newStewardGroupId: chosenId })}
        onCancel={() => {
          if (!busy) setCeremony(null);
        }}
      />
    </main>
  );
}
