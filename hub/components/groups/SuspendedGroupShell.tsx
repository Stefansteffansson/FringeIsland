'use client';

import type { GroupDetailShell } from '@/lib/groups/queries';

/**
 * FEAT-H038 STORY-5 (FEAT-PC023 STORY-7) — the suspended found-but-that's-it
 * shell. Renders exactly what the minimal payload provides: the name and the
 * "Suspended" label. No content, no actions, not even Leave. The shell is the
 * whole page body for every non-admin viewer, `rest_group` holders included.
 * FEAT-H049 STORY-3 (DB-4): the WHY — the payload's `hold_reason` (present for
 * members only; the platform decides) renders beneath the sentence; null
 * renders the shell exactly as before.
 */
export function SuspendedGroupShell({ group }: { group: GroupDetailShell }) {
  return (
    <div
      data-testid="suspended-group-shell"
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
        <span className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
          Suspended
        </span>
      </div>
      <p className="mt-3 text-sm text-gray-600">
        This group is suspended. Its content is unavailable while the suspension stands.
      </p>
      {group.hold_reason && (
        <p data-testid="hold-reason" className="mt-2 text-sm text-gray-800">
          Reason given: {group.hold_reason}
        </p>
      )}
    </div>
  );
}
