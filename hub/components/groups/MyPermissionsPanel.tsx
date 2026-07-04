'use client';

/**
 * FEAT-H014 STORY-4 — "What I can do here" (GRP-8).
 * The caller's effective permission names as readable chips — data from the
 * existing published `get_user_permissions` read, gated nowhere client-side.
 * The act-as selector is HONESTLY v1: a real control with exactly one context
 * ("Myself") and copy naming when further contexts arrive (group-as-actor is
 * unresolved governance — PC011 Open Q1 → Cycle G-F). Never a mocked dropdown.
 */
export function MyPermissionsPanel({
  permissions,
  error,
  onReload,
}: {
  permissions: string[] | null;
  error: string | null;
  onReload: () => void;
}) {
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
          value="myself"
          onChange={() => onReload()}
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        >
          <option value="myself">Myself</option>
        </select>
        <p className="mt-1 text-xs text-gray-400">
          Acting as a group arrives when group-of-groups lands.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : permissions === null ? (
        <p className="text-sm text-gray-500">Loading your permissions...</p>
      ) : permissions.length === 0 ? (
        <p className="text-sm text-gray-500">You can view this group.</p>
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
