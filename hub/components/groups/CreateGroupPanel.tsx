'use client';

import { useState } from 'react';
import { createGroup } from '@/lib/groups/client';

/**
 * FEAT-H013 STORY-1 — the create-group flow on /groups (GRP-1).
 * Affordance → inline form. Name is required (defense-in-depth only — the
 * FEAT-PC010 contract is the enforcement); the two visibility toggles are
 * separate controls with copy naming what each governs (GRP-3). Success hands
 * the new id to the page (which navigates to the detail); failure is
 * non-destructive. No template picker in v1 (spec no-go).
 */
export function CreateGroupPanel({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [label, setLabel] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [showMemberList, setShowMemberList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          Create group
        </button>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('A group needs a name.');
      return;
    }
    setSubmitting(true);
    try {
      const id = await createGroup({
        name: name.trim(),
        description: description.trim() || null,
        label: label.trim() || null,
        is_public: isPublic,
        show_member_list: showMemberList,
      });
      onCreated(id);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="mb-6 rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
      data-testid="create-group-form"
    >
      <h2 className="mb-4 text-lg font-semibold text-gray-800">New group</h2>

      <div className="mb-4">
        <label htmlFor="cg-name" className="mb-1 block text-sm font-medium text-gray-700">
          Group name
        </label>
        <input
          id="cg-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="cg-description" className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          id="cg-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-4">
        <label htmlFor="cg-label" className="mb-1 block text-sm font-medium text-gray-700">
          Label
        </label>
        <input
          id="cg-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />
      </div>

      <div className="mb-2 flex items-start gap-2">
        <input
          id="cg-is-public"
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="mt-0.5"
        />
        <label htmlFor="cg-is-public" className="text-sm text-gray-700">
          Group visibility — anyone can find and open this group (unchecked: members only)
        </label>
      </div>
      <div className="mb-4 flex items-start gap-2">
        <input
          id="cg-show-members"
          type="checkbox"
          checked={showMemberList}
          onChange={(e) => setShowMemberList(e.target.checked)}
          className="mt-0.5"
        />
        <label htmlFor="cg-show-members" className="text-sm text-gray-700">
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
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
        >
          Create
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
