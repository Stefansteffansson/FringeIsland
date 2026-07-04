'use client';

import { useState } from 'react';
import { assignMemberRole, removeMemberRole, updateGroupSettings } from '@/lib/groups/client';
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
 */

const STATUS_STYLES: Record<string, string> = {
  closed: 'bg-gray-200 text-gray-700',
  archived: 'bg-amber-100 text-amber-800',
  suspended: 'bg-red-100 text-red-700',
};

export function GroupDetailPanel({
  group,
  fabric = null,
  onRefresh,
}: {
  group: GroupDetail;
  /** FEAT-H014: the role fabric — picker options + assign/remove flags. */
  fabric?: RolesFabric | null;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{
    member: GroupMemberEntry;
    roleId: string;
    roleName: string;
  } | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const canAssign = fabric?.viewer.can_assign_roles ?? false;
  const canRemove = fabric?.viewer.can_remove_roles ?? false;
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

        {group.viewer.can_manage_settings && !editing && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-4 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Edit settings
          </button>
        )}
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
