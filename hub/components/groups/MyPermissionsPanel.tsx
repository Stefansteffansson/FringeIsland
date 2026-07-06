'use client';

/**
 * FEAT-H014 STORY-4 — "What I can do here" (GRP-8).
 * The effective permission names as readable chips — data from the published
 * `get_user_permissions` read, gated nowhere client-side.
 *
 * FEAT-H018 STORY-1 (ADR-U041 §1-2a): the act-as selector is now REAL —
 * "Myself" plus every group from the acting-contexts read (direct
 * empowerments only, §2d). Selecting a group re-scopes the panel to that
 * group's effective set (pure substitution), with copy naming it. With no
 * contexts the selector honestly offers "Myself" alone.
 */

export interface ActingContextOption {
  group_id: string;
  name: string;
}

export function MyPermissionsPanel({
  permissions,
  error,
  onReload,
  actingContexts = [],
  actingAs = 'myself',
  onActAsChange,
}: {
  permissions: string[] | null;
  error: string | null;
  onReload: () => void;
  /** FEAT-H018: the wieldable groups (the acting-contexts read). */
  actingContexts?: ActingContextOption[];
  /** 'myself' or a wieldable group's id. */
  actingAs?: string;
  onActAsChange?: (value: string) => void;
}) {
  const actingGroup = actingContexts.find((c) => c.group_id === actingAs) ?? null;

  return (
    <div
      data-testid="my-permissions-panel"
      className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm"
    >
      <h2 className="mb-3 text-lg font-semibold text-gray-800">What I can do here</h2>

      <div className="mb-4">
        <label htmlFor="act-as-select" className="mb-1 block text-xs font-medium text-gray-700">
          Acting as
        </label>
        <select
          id="act-as-select"
          data-testid="act-as-select"
          value={actingAs}
          onChange={(e) => {
            if (onActAsChange) onActAsChange(e.target.value);
            else onReload();
          }}
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        >
          <option value="myself">Myself</option>
          {actingContexts.map((c) => (
            <option key={c.group_id} value={c.group_id}>
              {c.name}
            </option>
          ))}
        </select>
        {actingGroup ? (
          // ADR-U041 §2a — substitution, named honestly: these are the
          // group's powers, nothing of the member's own standing mixes in.
          <p className="mt-1 text-xs text-indigo-600">
            Acting as {actingGroup.name} — these are {actingGroup.name}&apos;s powers here.
          </p>
        ) : actingContexts.length === 0 ? (
          <p className="mt-1 text-xs text-gray-400">
            Groups that empower you to act for them will appear here.
          </p>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : permissions === null ? (
        <p className="text-sm text-gray-500">Loading your permissions...</p>
      ) : permissions.length === 0 ? (
        // Post-6-done fix: report what the substrate returned, never an
        // invented floor. "You can view" stays true by construction for
        // Myself (the page rendered); an acting group gets the plain fact.
        <p className="text-sm text-gray-500">
          {actingGroup
            ? `${actingGroup.name} is a member here but holds no permission grants.`
            : 'You can view this group.'}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-1">
          {permissions.map((p) => (
            <li key={p} className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
              {p}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
