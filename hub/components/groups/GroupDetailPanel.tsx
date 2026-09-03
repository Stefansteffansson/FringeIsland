'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { openDm } from '@/lib/messages/client';
import {
  activateMember,
  assignMemberRole,
  closeGroup,
  deleteGroup,
  handGroupToDeusEx,
  leaveGroup,
  nominateSteward,
  pauseMember,
  removeGroupMember,
  removeMemberRole,
  restGroupClient,
  updateGroupSettings,
  wakeGroupClient,
} from '@/lib/groups/client';
import type { GroupDetail, GroupMemberEntry, RolesFabric, UpdateGroupSettingsInput } from '@/lib/groups/queries';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { CeremonyReasonField } from '@/components/ui/CeremonyReasonField';

/**
 * FEAT-H013 STORY-2/3/4 — the group detail panel (GRP-2/3/4/5).
 * Renders exactly what the FEAT-PC010 payload provides: fields, a
 * vocabulary-tolerant lifecycle badge (only when not active), the member
 * count, and the member list — with honest "hidden" copy when the contract
 * omits it (never a client-side guess). The settings editor exists iff the
 * viewer's capability flag says so (the Hub never computes permissions) and
 * sends only the changed fields (partial update); saves re-read via
 * onRefresh, failures are non-destructive.
 *
 * FEAT-H014 STORY-3 (GRP-7): member entries carry role chips (the extended
 * payload's `roles[]`); assign/remove affordances exist iff the FABRIC
 * viewer flags say so. Refusals (the assignment-time wall, the last-Steward
 * invariant) surface in place — the chip stays, nothing is pre-computed.
 *
 * FEAT-H016 STORY-1/2/3 (MEM-4/5/6): member rows gain lifecycle affordances —
 * Pause / Reactivate / Remove — gated on the caller's effective-permissions
 * payload (three independent keys); the Paused badge renders from the
 * payload's membership_status (paused rows appear only when the contract
 * includes them — Open Q3). The Leave affordance is every member's own exit;
 * the sole-Steward and last-member 409s render their honest G-E copy in
 * place — the affordance is never hidden client-side.
 */

type LifecycleAction = {
  kind: 'pause' | 'activate' | 'remove';
  member: GroupMemberEntry;
};

const LIFECYCLE_COPY: Record<
  LifecycleAction['kind'],
  { title: string; verb: string; message: (name: string, group: string) => string }
> = {
  pause: {
    title: 'Pause participation',
    verb: 'Pause',
    message: (name, group) => `Pause ${name}'s participation in "${group}"? Their roles are kept and they can be reactivated later.`,
  },
  activate: {
    title: 'Reactivate participation',
    verb: 'Reactivate',
    message: (name, group) => `Reactivate ${name}'s participation in "${group}"?`,
  },
  remove: {
    title: 'Remove member',
    verb: 'Remove',
    message: (name, group) => `Remove ${name} from "${group}"? Their unfinished work in this group's private journeys is frozen.`,
  },
};

const STATUS_STYLES: Record<string, string> = {
  closed: 'bg-gray-200 text-gray-700',
  archived: 'bg-amber-100 text-amber-800',
  resting: 'bg-sky-100 text-sky-800',
  suspended: 'bg-red-100 text-red-700',
};

// FEAT-H038 STORY-5: member-surface vocabulary for the two hold modes; every
// other status keeps its raw token (vocabulary tolerance — the CHECK can grow).
const STATUS_LABELS: Record<string, string> = {
  resting: 'Resting',
  suspended: 'Suspended',
};

export function GroupDetailPanel({
  group,
  fabric = null,
  permissions = null,
  viewerMemberGroupId = null,
  onRefresh,
  onLeft,
}: {
  group: GroupDetail;
  /** FEAT-H014: the role fabric — picker options + assign/remove flags. */
  fabric?: RolesFabric | null;
  /** FEAT-H016: the caller's effective permissions — lifecycle-affordance gating. */
  permissions?: string[] | null;
  /** FEAT-H017: the caller's own member_group_id (the my-permissions payload's
   *  contract-resolved actor) — the nominate pick-list's self-exclusion. */
  viewerMemberGroupId?: string | null;
  onRefresh: () => void;
  /** FEAT-H016/H017: the page's navigation after the caller's exit or the
   *  group's ending (leave, hand-over, close, delete). */
  onLeft?: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    member: GroupMemberEntry;
    roleId: string;
    roleName: string;
  } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<LifecycleAction | null>(null);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaveBusy, setLeaveBusy] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  // FEAT-H017: the transfer choice (STORY-1/3) + the endings (STORY-4/5).
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);
  const [transferNotice, setTransferNotice] = useState<string | null>(null);
  const [chosenNominees, setChosenNominees] = useState<GroupMemberEntry[]>([]);
  const [nominateConfirmOpen, setNominateConfirmOpen] = useState(false);
  const [handOverConfirmOpen, setHandOverConfirmOpen] = useState(false);
  const [transferBusy, setTransferBusy] = useState(false);
  const [endingAction, setEndingAction] = useState<'close' | 'delete' | null>(null);
  const [endingBusy, setEndingBusy] = useState(false);
  const [endingError, setEndingError] = useState<string | null>(null);
  // FEAT-H038 STORY-6: the steward Rest/Wake ceremony (rest_group holders).
  const [restWakeAction, setRestWakeAction] = useState<'rest' | 'wake' | null>(null);
  const [restWakeBusy, setRestWakeBusy] = useState(false);
  const [restWakeError, setRestWakeError] = useState<string | null>(null);
  // FEAT-H049 STORY-2 (DB-4, GRP-10): the Steward's OPTIONAL note to the
  // members — blank sends nothing (the old call shape).
  const [restWakeNote, setRestWakeNote] = useState('');

  const canAssign = fabric?.viewer.can_assign_roles ?? false;
  const canRemove = fabric?.viewer.can_remove_roles ?? false;
  // FEAT-H016: three independent keys — any subset renders exactly that subset.
  const canPauseMember = permissions?.includes('pause_members') ?? false;
  const canActivateMember = permissions?.includes('activate_members') ?? false;
  const canRemoveMember = permissions?.includes('remove_members') ?? false;
  const roleIdByName = new Map((fabric?.roles ?? []).map((r) => [r.name, r.id]));
  const assignable = (member: GroupMemberEntry) =>
    (fabric?.roles ?? []).filter((r) => !member.roles.includes(r.name));

  const assign = async (member: GroupMemberEntry, roleId: string) => {
    setMemberError(null);
    try {
      await assignMemberRole(group.id, member.member_group_id, roleId);
      onRefresh();
    } catch (err) {
      // The wall's message, in place — nothing changes visually.
      setMemberError((err as Error).message);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoveBusy(true);
    setMemberError(null);
    try {
      await removeMemberRole(group.id, removeTarget.member.member_group_id, removeTarget.roleId);
      setRemoveTarget(null);
      onRefresh();
    } catch (err) {
      // The invariant's refusal (e.g. last Steward) — the chip stays.
      setMemberError((err as Error).message);
      setRemoveTarget(null);
    } finally {
      setRemoveBusy(false);
    }
  };

  // FEAT-H016: one confirm path for the three lifecycle actions. Refusals
  // (last-active-Steward, already-paused, self-target) surface in place via
  // the member-error line — the row stays, nothing is pre-computed.
  const confirmLifecycle = async () => {
    if (!lifecycleAction) return;
    setLifecycleBusy(true);
    setMemberError(null);
    const { kind, member } = lifecycleAction;
    try {
      if (kind === 'pause') await pauseMember(group.id, member.member_group_id);
      else if (kind === 'activate') await activateMember(group.id, member.member_group_id);
      else await removeGroupMember(group.id, member.member_group_id);
      setLifecycleAction(null);
      onRefresh();
    } catch (err) {
      setMemberError((err as Error).message);
      setLifecycleAction(null);
    } finally {
      setLifecycleBusy(false);
    }
  };

  // FEAT-H016 STORY-3: the member's own exit. Success hands navigation to the
  // page (onLeft); the refusal copy renders in place — and per FEAT-H017 the
  // sole-Steward wall becomes a door: a 409 with co-members opens the
  // transfer choice (the last-member 409's door, Close, is already on the
  // page). The position is contract-reported, never predicted.
  const confirmLeave = async () => {
    setLeaveBusy(true);
    setLeaveError(null);
    try {
      await leaveGroup(group.id);
      setLeaveOpen(false);
      onLeft?.();
    } catch (err) {
      setLeaveError((err as Error).message);
      setLeaveOpen(false);
      if ((err as { status?: number }).status === 409 && group.member_count > 1) {
        setTransferOpen(true);
      }
    } finally {
      setLeaveBusy(false);
    }
  };

  // FEAT-H017 STORY-1: the ordered pick-list — ACTIVE members other than the
  // caller, sourced from the existing member list (no separate fetch).
  // FEAT-H018 STORY-5 (ADR-U041 §4): persons only — the substrate refuses
  // non-personal nominees anyway; the surface never renders the door.
  const nominable = (group.members ?? []).filter(
    (m) =>
      (m.membership_status ?? 'active') === 'active' &&
      (m.member_group_type ?? 'personal') === 'personal' &&
      m.member_group_id !== viewerMemberGroupId &&
      !chosenNominees.some((c) => c.member_group_id === m.member_group_id),
  );
  // FEAT-H018 STORY-4 (ADR-U041 §5): counts and Close key on the non-system
  // count — the caretaker is never load-bearing. Tolerant fallback for
  // pre-extension payloads.
  const effectiveMemberCount = group.non_system_member_count ?? group.member_count;
  /** Gate walk 2026-07-30: the count above is right and stays right — but the
   *  screen contradicted itself, reading "1 member" over a list showing two
   *  rows, with nothing to reconcile them. The extra row is the caretaker, and
   *  it is deliberately not counted (§5: never load-bearing). So name it
   *  instead of inflating the count.
   *
   *  Keyed off the members actually RENDERED, not off the count arithmetic, so
   *  the line always explains exactly what is on screen. */
  const hasCaretaker = (group.members ?? []).some((m) => m.member_group_type === 'system');
  // Transfer is semantically a Steward-role grant — the affordance keys off
  // the payload's `assign_roles` (a permission key, never a role name; the
  // contract still guards sole-Steward-ness). Live-testing finding 2026-07-05:
  // a plain member was offered a door that always refuses.
  const canTransfer =
    group.viewer.is_member &&
    group.member_count > 1 &&
    (permissions?.includes('assign_roles') ?? false);
  const canClose = group.viewer.is_member && effectiveMemberCount === 1;
  const canDelete = permissions?.includes('delete_group') ?? false;
  // FEAT-H038 STORY-5/6: the two-mode surface split is capability-flag driven
  // (the `rest_group` key), never role-name driven. A failed permissions read
  // defaults to non-holder — the read-only banner is the safe honest state.
  const holdsRestGroup = permissions?.includes('rest_group') ?? false;
  const isResting = group.status === 'resting';
  const canRest = holdsRestGroup && group.status === 'active';
  const canWake = holdsRestGroup && isResting;

  const confirmRestWake = async () => {
    if (!restWakeAction) return;
    setRestWakeBusy(true);
    setRestWakeError(null);
    const note = restWakeNote.trim().length > 0 ? restWakeNote : undefined;
    try {
      if (restWakeAction === 'rest') await restGroupClient(group.id, note);
      else await wakeGroupClient(group.id, note);
      setRestWakeAction(null);
      setRestWakeNote('');
      onRefresh();
    } catch (err) {
      // The contract's honest copy, in place — the state stays contract-reported.
      setRestWakeError((err as Error).message);
      setRestWakeAction(null);
      setRestWakeNote('');
    } finally {
      setRestWakeBusy(false);
    }
  };

  const confirmNominate = async () => {
    setTransferBusy(true);
    setTransferError(null);
    try {
      await nominateSteward(
        group.id,
        chosenNominees.map((c) => c.member_group_id),
      );
      setNominateConfirmOpen(false);
      setTransferOpen(false);
      setChosenNominees([]);
      // STORY-1: no pre-empted departure — the Steward stays until acceptance.
      setTransferNotice(
        'The offer is out. You remain the Steward while it stands; if every nominee declines, the group passes to FringeIsland stewardship and you leave.',
      );
      onRefresh();
    } catch (err) {
      setTransferError((err as Error).message);
      setNominateConfirmOpen(false);
    } finally {
      setTransferBusy(false);
    }
  };

  const confirmHandOver = async () => {
    setTransferBusy(true);
    setTransferError(null);
    try {
      await handGroupToDeusEx(group.id);
      setHandOverConfirmOpen(false);
      onLeft?.();
    } catch (err) {
      // e.g. the last-member 409 pointing at Close — relayed in place.
      setTransferError((err as Error).message);
      setHandOverConfirmOpen(false);
    } finally {
      setTransferBusy(false);
    }
  };

  const confirmEnding = async () => {
    if (!endingAction) return;
    setEndingBusy(true);
    setEndingError(null);
    try {
      if (endingAction === 'close') await closeGroup(group.id);
      else await deleteGroup(group.id);
      setEndingAction(null);
      onLeft?.();
    } catch (err) {
      setEndingError((err as Error).message);
      setEndingAction(null);
    } finally {
      setEndingBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            {group.label && (
              <span className="mt-1 inline-block rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                {group.label}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {group.status !== 'active' && (
              // Vocabulary-tolerant: unknown statuses render plainly (the CHECK can grow).
              <span
                data-testid="status-badge"
                className={`rounded px-2 py-1 text-xs font-medium ${
                  STATUS_STYLES[group.status] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {STATUS_LABELS[group.status] ?? group.status}
              </span>
            )}
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                group.is_public ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}
            >
              {group.is_public ? 'Public' : 'Private'}
            </span>
          </div>
        </div>

        {group.description && <p className="mt-3 text-sm text-gray-600">{group.description}</p>}

        {group.hold_reason && (
          // FEAT-H049 STORY-3 (DB-4, GRP-10): the WHY under the held label —
          // rendered whenever the payload carries it (members only; the
          // platform decides), never gated on a role string.
          <p data-testid="hold-reason" className="mt-3 text-sm text-sky-900">
            Reason given: {group.hold_reason}
          </p>
        )}

        {isResting && !holdsRestGroup && (
          // FEAT-H038 STORY-5: the read-only banner — the state, never the why.
          // Write affordances below stay refusing-not-hidden (the house rule);
          // the contract answers each with 'group is resting'.
          <p
            data-testid="resting-banner"
            className="mt-3 rounded border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900"
          >
            This group is resting — everything is read-only until it wakes.
          </p>
        )}

        {restWakeError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {restWakeError}
          </p>
        )}

        <p data-testid="member-count-line" className="mt-4 text-xs text-gray-500">
          {effectiveMemberCount} {effectiveMemberCount === 1 ? 'member' : 'members'}
          {hasCaretaker && ' · FringeIsland is looking after this group'}
        </p>

        {leaveError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {leaveError}
          </p>
        )}
        {transferNotice && (
          <p role="status" className="mt-3 text-sm text-emerald-700">
            {transferNotice}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          {group.viewer.can_manage_settings && !editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Edit settings
            </button>
          )}
          {canRest && (
            // FEAT-H038 STORY-6: the steward-fix hold — capability-flag driven
            // (`rest_group`), never role-name driven. The verb is "rest".
            <button
              type="button"
              data-testid="rest-group"
              onClick={() => {
                setRestWakeError(null);
                setRestWakeAction('rest');
              }}
              className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-sky-800 hover:bg-sky-50"
            >
              Rest this group
            </button>
          )}
          {canWake && (
            <button
              type="button"
              data-testid="wake-group"
              onClick={() => {
                setRestWakeError(null);
                setRestWakeAction('wake');
              }}
              className="rounded-lg border border-sky-200 px-3 py-1.5 text-sm text-sky-800 hover:bg-sky-50"
            >
              Wake this group
            </button>
          )}
          {group.viewer.is_member && (
            // FEAT-H016: never hidden client-side — a sole Steward learns the
            // honest answer from the refusal, not from a missing button.
            <button
              type="button"
              data-testid="leave-group"
              onClick={() => {
                setLeaveError(null);
                setLeaveOpen(true);
              }}
              className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              Leave group
            </button>
          )}
          {canTransfer && (
            // FEAT-H017 STORY-1/3: the explicit door into the transfer choice.
            // Any member may open it; the contracts refuse non-sole-Stewards
            // honestly (relayed in the flow, never predicted here).
            <button
              type="button"
              data-testid="hand-over-leadership"
              onClick={() => {
                setTransferError(null);
                setTransferNotice(null);
                setTransferOpen((v) => !v);
              }}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Hand over leadership
            </button>
          )}
        </div>
      </div>

      {transferOpen && (
        <div
          data-testid="transfer-leadership"
          className="rounded-xl border border-indigo-100 bg-white p-6 shadow-sm"
        >
          <h2 className="mb-1 text-lg font-semibold text-gray-800">Hand over leadership</h2>
          <p className="mb-4 text-sm text-gray-600">
            Nominate one or more members as your successor — the offer goes to them in
            your order — or hand the group to FringeIsland as a last resort.
          </p>
          {transferError && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {transferError}
            </p>
          )}

          <h3 className="mb-2 text-sm font-medium text-gray-700">Nominate successors</h3>
          {chosenNominees.length > 0 && (
            <ol data-testid="nominee-order" className="mb-3 space-y-1">
              {chosenNominees.map((c, i) => (
                <li
                  key={c.member_group_id}
                  className="flex items-center gap-2 text-sm text-gray-800"
                >
                  <span className="text-xs text-gray-400">{i + 1}.</span>
                  {c.display_name}
                  <button
                    type="button"
                    aria-label={`Remove ${c.display_name} from the nomination`}
                    onClick={() =>
                      setChosenNominees((prev) =>
                        prev.filter((p) => p.member_group_id !== c.member_group_id),
                      )
                    }
                    className="text-gray-400 hover:text-gray-700"
                  >
                    &times;
                  </button>
                </li>
              ))}
            </ol>
          )}
          {nominable.length > 0 ? (
            <ul className="mb-3 space-y-1">
              {nominable.map((m) => (
                <li
                  key={m.member_group_id}
                  className="flex items-center justify-between gap-2 text-sm text-gray-800"
                >
                  {m.display_name}
                  <button
                    type="button"
                    data-testid={`nominate-candidate-${m.member_group_id}`}
                    onClick={() => setChosenNominees((prev) => [...prev, m])}
                    className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          ) : chosenNominees.length === 0 ? (
            <p className="mb-3 text-sm text-gray-500">
              No other active members to nominate.
            </p>
          ) : null}
          <button
            type="button"
            data-testid="send-nomination"
            disabled={chosenNominees.length === 0 || transferBusy}
            onClick={() => setNominateConfirmOpen(true)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Nominate in this order
          </button>

          <div className="mt-5 border-t border-gray-100 pt-4">
            {/* ADR-U019: the deliberate last resort — styled as such, never primary. */}
            <p className="mb-2 text-xs text-gray-500">
              No one to nominate? FringeIsland can steward the group so it is never
              left headless — and you leave.
            </p>
            <button
              type="button"
              data-testid="hand-to-deusex"
              disabled={transferBusy}
              onClick={() => setHandOverConfirmOpen(true)}
              className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm text-amber-800 hover:bg-amber-50 disabled:opacity-50"
            >
              Hand to FringeIsland
            </button>
          </div>
        </div>
      )}

      {editing && (
        <GroupSettingsForm
          group={group}
          onSaved={() => {
            setEditing(false);
            onRefresh();
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-800">Members</h2>
        {memberError && (
          <p role="alert" className="mb-3 text-sm text-red-600">
            {memberError}
          </p>
        )}
        {group.members ? (
          <ul data-testid="member-list" className="space-y-2">
            {group.members.map((m, i) => (
              <li
                key={m.member_group_id ?? `${m.display_name}-${i}`}
                data-testid={`member-row-${m.member_group_id}`}
                className="flex items-center justify-between gap-3"
              >
                <div
                  data-testid={`member-chips-${m.member_group_id}`}
                  className="flex flex-wrap items-center gap-1.5"
                >
                  <span className="text-sm text-gray-800">{m.display_name}</span>
                  {(m.membership_status ?? 'active') === 'paused' && (
                    // FEAT-H016: the payload's state, never client inference.
                    <span
                      data-testid={`paused-badge-${m.member_group_id}`}
                      className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800"
                    >
                      Paused
                    </span>
                  )}
                  {(m.member_group_type ?? 'personal') !== 'personal' && (
                    // FEAT-H018 STORY-4 (ADR-U041 §5): non-person members are
                    // visible for what they are — never hidden. Open set: an
                    // unknown group_type renders its raw value.
                    <span
                      data-testid={`kind-badge-${m.member_group_id}`}
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        m.member_group_type === 'system'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-violet-100 text-violet-800'
                      }`}
                    >
                      {m.member_group_type === 'engagement'
                        ? 'Group'
                        : m.member_group_type === 'system'
                          ? 'FringeIsland'
                          : m.member_group_type}
                    </span>
                  )}
                  {(m.roles ?? []).map((roleName) => (
                    <span
                      key={roleName}
                      className="flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.5 text-xs text-indigo-700"
                    >
                      {roleName}
                      {canRemove && roleIdByName.has(roleName) && (
                        <button
                          type="button"
                          aria-label={`Remove ${roleName} from ${m.display_name}`}
                          onClick={() =>
                            setRemoveTarget({
                              member: m,
                              roleId: roleIdByName.get(roleName)!,
                              roleName,
                            })
                          }
                          className="text-indigo-400 hover:text-indigo-700"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {/* FEAT-H025 STORY-5 (COM-1): the roster DM entry — persons
                      only, never self; the substrate enforces FIM-only (CB-1). */}
                  {(m.member_group_type ?? 'personal') === 'personal' &&
                    m.member_group_id &&
                    m.member_group_id !== viewerMemberGroupId && (
                      <button
                        type="button"
                        data-testid={`message-member-${m.member_group_id}`}
                        aria-label={`Message ${m.display_name}`}
                        onClick={() => {
                          void openDm(m.member_group_id!)
                            .then((cid) => router.push(`/messages/${cid}`))
                            .catch((err: Error) =>
                              setMemberError(err.message || 'Could not open the conversation'),
                            );
                        }}
                        className="rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Message
                      </button>
                    )}
                  {canAssign && assignable(m).length > 0 && (
                    <select
                      data-testid={`assign-select-${m.member_group_id}`}
                      value=""
                      onChange={(e) => {
                        if (e.target.value) void assign(m, e.target.value);
                      }}
                      className="rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-600"
                    >
                      <option value="">Assign role...</option>
                      {assignable(m).map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  )}
                  {canPauseMember && (m.membership_status ?? 'active') === 'active' && (
                    <button
                      type="button"
                      data-testid={`pause-member-${m.member_group_id}`}
                      aria-label={`Pause ${m.display_name}`}
                      onClick={() => setLifecycleAction({ kind: 'pause', member: m })}
                      className="rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Pause
                    </button>
                  )}
                  {canActivateMember && m.membership_status === 'paused' && (
                    <button
                      type="button"
                      data-testid={`activate-member-${m.member_group_id}`}
                      aria-label={`Reactivate ${m.display_name}`}
                      onClick={() => setLifecycleAction({ kind: 'activate', member: m })}
                      className="rounded border border-gray-200 px-1.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Reactivate
                    </button>
                  )}
                  {canRemoveMember && (
                    <button
                      type="button"
                      data-testid={`remove-member-${m.member_group_id}`}
                      aria-label={`Remove ${m.display_name} from the group`}
                      onClick={() => setLifecycleAction({ kind: 'remove', member: m })}
                      className="rounded border border-red-200 px-1.5 py-1 text-xs text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                  <span className="text-xs text-gray-400">
                    since {new Date(m.joined_at).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Member list hidden by this group&apos;s settings.</p>
        )}
      </div>

      {(canClose || canDelete) && (
        // FEAT-H017 STORY-4/5: the ways this group ends — distinct in copy and
        // placement from Leave (own exit) and Remove (another member). Close
        // offers itself only to the last member (contract-reported count);
        // Delete only to `delete_group` holders (payload key, never a role name).
        <div className="rounded-xl border border-red-100 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-gray-800">End of this group</h2>
          <p className="mb-4 text-sm text-gray-600">
            The group&apos;s work is preserved and reassigned — nothing a member made is
            destroyed.
          </p>
          {endingError && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {endingError}
            </p>
          )}
          <div className="flex items-center gap-2">
            {canClose && (
              <button
                type="button"
                data-testid="close-group"
                onClick={() => {
                  setEndingError(null);
                  setEndingAction('close');
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Close this group
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                data-testid="delete-group"
                onClick={() => {
                  setEndingError(null);
                  setEndingAction('delete');
                }}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete this group
              </button>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={removeTarget !== null}
        title="Remove role"
        message={`Remove "${removeTarget?.roleName ?? ''}" from ${removeTarget?.member.display_name ?? ''}?`}
        confirmText="Remove"
        variant="danger"
        busy={removeBusy}
        onConfirm={() => void confirmRemove()}
        onCancel={() => {
          if (!removeBusy) setRemoveTarget(null);
        }}
      />

      {/* FEAT-H016: the lifecycle confirmations (Remove is destructive). */}
      <ConfirmModal
        isOpen={lifecycleAction !== null}
        title={lifecycleAction ? LIFECYCLE_COPY[lifecycleAction.kind].title : ''}
        message={
          lifecycleAction
            ? LIFECYCLE_COPY[lifecycleAction.kind].message(
                lifecycleAction.member.display_name,
                group.name,
              )
            : ''
        }
        confirmText={lifecycleAction ? LIFECYCLE_COPY[lifecycleAction.kind].verb : ''}
        variant={lifecycleAction?.kind === 'remove' ? 'danger' : 'info'}
        busy={lifecycleBusy}
        onConfirm={() => void confirmLifecycle()}
        onCancel={() => {
          if (!lifecycleBusy) setLifecycleAction(null);
        }}
      />

      <ConfirmModal
        isOpen={leaveOpen}
        title="Leave group"
        message={`Leave "${group.name}"? Your unfinished work in this group's private journeys is frozen, and rejoining needs a new invitation.`}
        confirmText="Leave"
        variant="danger"
        busy={leaveBusy}
        onConfirm={() => void confirmLeave()}
        onCancel={() => {
          if (!leaveBusy) setLeaveOpen(false);
        }}
      />

      {/* FEAT-H038 STORY-6: the Rest/Wake ceremony — honest consequences, the
          "rest" verb, never "put to rest". */}
      <ConfirmModal
        isOpen={restWakeAction !== null}
        title={restWakeAction === 'wake' ? 'Wake this group?' : 'Rest this group?'}
        message={
          <span>
            {restWakeAction === 'wake'
              ? `Wake "${group.name}"? The group returns to active and members can act again.`
              : `Rest "${group.name}"? Members keep reading, but nothing changes while it rests — you can wake it anytime.`}
            {/* FEAT-H049 STORY-2 (DB-4): the optional note — Confirm never waits on it. */}
            <CeremonyReasonField
              value={restWakeNote}
              onChange={setRestWakeNote}
              label="A note to your members — optional"
              testId="ceremony-note"
            />
          </span>
        }
        confirmText={restWakeAction === 'wake' ? 'Wake group' : 'Rest group'}
        variant="info"
        busy={restWakeBusy}
        onConfirm={() => void confirmRestWake()}
        onCancel={() => {
          if (!restWakeBusy) {
            setRestWakeAction(null);
            setRestWakeNote('');
          }
        }}
      />

      {/* FEAT-H017 STORY-1: the nomination — the picked order IS the ranking. */}
      <ConfirmModal
        isOpen={nominateConfirmOpen}
        title="Send the nomination?"
        message={`Offer stewardship of "${group.name}" to ${chosenNominees
          .map((c) => c.display_name)
          .join(', then ')}? The offer goes to them in this order; you remain the Steward while it stands. If every nominee declines, the group passes to FringeIsland stewardship and you leave.`}
        confirmText="Send nomination"
        variant="info"
        busy={transferBusy}
        onConfirm={() => void confirmNominate()}
        onCancel={() => {
          if (!transferBusy) setNominateConfirmOpen(false);
        }}
      />

      {/* FEAT-H017 STORY-3: the ADR-U019 last resort — deliberate, never casual. */}
      <ConfirmModal
        isOpen={handOverConfirmOpen}
        title="Hand this group to FringeIsland?"
        message={`FringeIsland will steward "${group.name}" and you will leave the group. This is the last resort — the group is never left headless.`}
        confirmText="Hand over and leave"
        variant="warning"
        busy={transferBusy}
        onConfirm={() => void confirmHandOver()}
        onCancel={() => {
          if (!transferBusy) setHandOverConfirmOpen(false);
        }}
      />

      {/* FEAT-H017 STORY-4/5: Close (honest terminal act) / Delete (danger,
          explicit) — the confirm copy carries the contract's preserve/reassign
          guarantee, no DS-4/DS-5 detail. */}
      <ConfirmModal
        isOpen={endingAction !== null}
        title={endingAction === 'delete' ? 'Delete this group?' : 'Close this group?'}
        message={
          endingAction === 'delete'
            ? `Delete "${group.name}" for everyone? Members will be told, and the group's work is preserved and reassigned. This cannot be undone.`
            : `Close "${group.name}"? Its work is preserved and reassigned — the group ends here.`
        }
        confirmText={endingAction === 'delete' ? 'Delete group' : 'Close group'}
        variant={endingAction === 'delete' ? 'danger' : 'warning'}
        busy={endingBusy}
        onConfirm={() => void confirmEnding()}
        onCancel={() => {
          if (!endingBusy) setEndingAction(null);
        }}
      />
    </div>
  );
}

function GroupSettingsForm({
  group,
  onSaved,
  onCancel,
}: {
  group: GroupDetail;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description ?? '');
  const [label, setLabel] = useState(group.label ?? '');
  const [isPublic, setIsPublic] = useState(group.is_public);
  const [showMemberList, setShowMemberList] = useState(group.show_member_list);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('A group needs a name.');
      return;
    }
    // Partial update: send only what changed (the contract leaves nulls alone).
    const changed: UpdateGroupSettingsInput = {};
    if (name.trim() !== group.name) changed.name = name.trim();
    if (description !== (group.description ?? '')) changed.description = description;
    if (label !== (group.label ?? '')) changed.label = label;
    if (isPublic !== group.is_public) changed.is_public = isPublic;
    if (showMemberList !== group.show_member_list) changed.show_member_list = showMemberList;
    if (Object.keys(changed).length === 0) {
      onCancel();
      return;
    }
    setSaving(true);
    try {
      await updateGroupSettings(group.id, changed);
      onSaved();
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
      data-testid="group-settings-form"
    >
      <h2 className="mb-4 text-lg font-semibold text-gray-800">Group settings</h2>

      <div className="mb-4">
        <label htmlFor="gs-name" className="mb-1 block text-sm font-medium text-gray-700">
          Group name
        </label>
        <input
          id="gs-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="gs-description" className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="gs-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="gs-label" className="mb-1 block text-sm font-medium text-gray-700">
          Label
        </label>
        <input
          id="gs-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-2 flex items-start gap-2">
        <input
          id="gs-is-public"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="mt-0.5"
        />
        <label htmlFor="gs-is-public" className="text-sm text-gray-700">
          Group visibility — anyone can find and open this group (unchecked: members only)
        </label>
      </div>
      <div className="mb-4 flex items-start gap-2">
        <input
          id="gs-show-members"
          type="checkbox"
          checked={showMemberList}
          onChange={(e) => setShowMemberList(e.target.checked)}
          className="mt-0.5"
        />
        <label htmlFor="gs-show-members" className="text-sm text-gray-700">
          Member-list visibility — non-members of a public group can see who is in it
        </label>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
