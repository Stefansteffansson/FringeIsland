'use client';

import { useState } from 'react';
import {
  activateMember,
  assignMemberRole,
  leaveGroup,
  pauseMember,
  removeGroupMember,
  removeMemberRole,
  updateGroupSettings,
} from '@/lib/groups/client';
import type { GroupDetail, GroupMemberEntry, RolesFabric, UpdateGroupSettingsInput } from '@/lib/groups/queries';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

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
  suspended: 'bg-red-100 text-red-700',
};

export function GroupDetailPanel({
  group,
  fabric = null,
  permissions = null,
  onRefresh,
  onLeft,
}: {
  group: GroupDetail;
  /** FEAT-H014: the role fabric — picker options + assign/remove flags. */
  fabric?: RolesFabric | null;
  /** FEAT-H016: the caller's effective permissions — lifecycle-affordance gating. */
  permissions?: string[] | null;
  onRefresh: () => void;
  /** FEAT-H016: the page's navigation after a successful leave. */
  onLeft?: () => void;
}) {
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
  // page (onLeft); the honest G-E refusal copy renders in place.
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
    } finally {
      setLeaveBusy(false);
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
                {group.status}
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

        <p className="mt-4 text-xs text-gray-500">
          {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
        </p>

        {leaveError && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {leaveError}
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
        </div>
      </div>

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
