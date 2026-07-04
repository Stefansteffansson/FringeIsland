'use client';

import { useState } from 'react';
import { updateGroupSettings } from '@/lib/groups/client';
import type { GroupDetail, UpdateGroupSettingsInput } from '@/lib/groups/queries';

/**
 * FEAT-H013 STORY-2/3/4 — the group detail panel (GRP-2/3/4/5).
 * Renders exactly what the FEAT-PC010 payload provides: fields, a
 * vocabulary-tolerant lifecycle badge (only when not active), the member
 * count, and the member list — with honest "hidden" copy when the contract
 * omits it (never a client-side guess). The settings editor exists iff the
 * viewer's capability flag says so (the Hub never computes permissions) and
 * sends only the changed fields (partial update); saves re-read via
 * onRefresh, failures are non-destructive.
 */

const STATUS_STYLES: Record<string, string> = {
  closed: 'bg-gray-200 text-gray-700',
  archived: 'bg-amber-100 text-amber-800',
  suspended: 'bg-red-100 text-red-700',
};

export function GroupDetailPanel({
  group,
  onRefresh,
}: {
  group: GroupDetail;
  onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);

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
        {group.members ? (
          <ul data-testid="member-list" className="space-y-2">
            {group.members.map((m, i) => (
              <li key={`${m.display_name}-${i}`} className="flex items-baseline justify-between">
                <span className="text-sm text-gray-800">{m.display_name}</span>
                <span className="text-xs text-gray-400">
                  since {new Date(m.joined_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Member list hidden by this group&apos;s settings.</p>
        )}
      </div>
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
