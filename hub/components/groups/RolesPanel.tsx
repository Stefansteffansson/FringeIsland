'use client';

import { useState } from 'react';
import { createGroupRole, deleteGroupRole, setGroupRolePermission } from '@/lib/groups/client';
import type { RoleEntry, RolesFabric, RoleTemplateOption } from '@/lib/groups/queries';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { AvailableRolesSection } from '@/components/groups/AvailableRolesSection';
import { permissionLabel } from '@/lib/groups/permission-label';

/**
 * RD-A FEAT-H043 STORY-1 — the provenance line.
 *
 * Replaces the binary "Template"/"Custom" chip. A template-derived role states
 * which version it was copied from and when; where the backfill could not
 * resolve a version unambiguously it says so plainly rather than inventing one
 * (RD-10). A custom role has no provenance to state and keeps saying "Custom".
 *
 * The copied-date is always shown for a template-derived role because
 * `created_at` is always honest — every instantiation door sets it at copy
 * time (dossier Finding 1), so it needs no backfill and can never be unknown.
 */
export function provenanceLabel(role: RoleEntry): string {
  if (!role.created_from_role_template_id) return 'Custom';
  const version =
    role.created_from_version_number === null
      ? 'version unknown'
      : `v${role.created_from_version_number}`;
  return `Template · ${version} · copied ${formatCopiedDate(role.created_at)}`;
}

/**
 * Postgres serialises timestamptz with a literal `+00:00`; parsing through
 * `Date` normalises that rather than slicing the string (the house rule — the
 * two shapes are not string-comparable).
 */
function formatCopiedDate(value: string): string {
  const at = new Date(value);
  if (Number.isNaN(at.getTime())) return 'date unknown';
  return at.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * RD-A FEAT-H043 STORY-4 — the removal ceremony's copy.
 *
 * Two consequences, both stated before the click: removal is permanent for
 * this group and does not touch the source template (retiring a template is a
 * separate, central act — RD-2), and a held role must have its holders
 * stripped first. The held sentence quotes the substrate's own refusal wording
 * so the pre-click warning and the post-click refusal read as one voice.
 */
function removalMessage(role: RoleEntry | null): string {
  if (!role) return '';
  const held =
    role.holder_count > 0
      ? ` It is currently held by ${role.holder_count} ${
          role.holder_count === 1 ? 'member' : 'members'
        } — remove the role from all holders first.`
      : '';
  return (
    `Remove "${role.name}" from this group? This is permanent for this group ` +
    `and does not affect the source template.${held}`
  );
}

/**
 * FEAT-H014 STORY-1/2 — the roles panel (GRP-6).
 * Renders exactly what the FEAT-PC011 fabric payload provides; management
 * affordances exist iff the viewer's capability flags say so (the Hub never
 * computes permissions). Both anti-escalation walls live substrate-side —
 * refusals surface verbatim, forms keep their state. Template-derived roles
 * carry no delete affordance (payload-categorical: the contract refuses
 * regardless); held-role refusals are state-dependent and surface in place.
 * Every mutation re-reads via onMutated (the page's one refresh path).
 */
export function RolesPanel({
  groupId,
  fabric,
  templates,
  error,
  onMutated,
  focusAvailableRoles = false,
}: {
  groupId: string;
  fabric: RolesFabric | null;
  templates: RoleTemplateOption[];
  error: string | null;
  onMutated: () => void;
  /** RD-B walk fix W-1: `?focus=roles` landed here from a roles notice. */
  focusAvailableRoles?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleEntry | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canManage = fabric?.viewer.can_manage_roles ?? false;

  const flipGrant = async (role: RoleEntry, permission: string, granted: boolean) => {
    setActionError(null);
    try {
      await setGroupRolePermission(groupId, role.id, permission, granted);
      onMutated();
    } catch (err) {
      setActionError((err as Error).message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setActionError(null);
    try {
      await deleteGroupRole(groupId, deleteTarget.id);
      setDeleteTarget(null);
      onMutated();
    } catch (err) {
      setActionError((err as Error).message);
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="roles-panel" className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">Roles</h2>
        {canManage && !adding && (
          <button
            type="button"
            data-testid="add-role-button"
            onClick={() => {
              setAdding(true);
              setActionError(null);
            }}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          >
            Add role
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {actionError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {adding && fabric && (
        <AddRoleForm
          groupId={groupId}
          templates={templates}
          catalog={fabric.available_permissions}
          onDone={() => {
            setAdding(false);
            onMutated();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {fabric && (
        <ul className="space-y-3">
          {fabric.roles.map((role) => (
            <li
              key={role.id}
              data-testid="role-card"
              className="rounded-lg border border-gray-100 p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{role.name}</span>
                  <span
                    data-testid="role-badge"
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      role.created_from_role_template_id
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'bg-emerald-50 text-emerald-700'
                    }`}
                  >
                    {provenanceLabel(role)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {role.holder_count} {Number(role.holder_count) === 1 ? 'holder' : 'holders'}
                  </span>
                  {canManage && (
                    <button
                      type="button"
                      data-testid="edit-grants-button"
                      onClick={() =>
                        setExpandedRoleId(expandedRoleId === role.id ? null : role.id)
                      }
                      className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Edit grants
                    </button>
                  )}
                  {canManage && (
                    <button
                      type="button"
                      data-testid="delete-role-button"
                      onClick={() => setDeleteTarget(role)}
                      className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {role.description && (
                <p className="mt-1 text-xs text-gray-500">{role.description}</p>
              )}

              {role.permissions.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {role.permissions.map((p) => (
                    <span
                      key={p}
                      className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600"
                    >
                      {permissionLabel(p)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">No permissions granted.</p>
              )}

              {canManage && expandedRoleId === role.id && (
                <div className="mt-3 space-y-1 border-t border-gray-100 pt-3">
                  {fabric.available_permissions.map((p) => (
                    <label key={p.name} className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        data-testid={`grant-toggle-${p.name}`}
                        checked={role.permissions.includes(p.name)}
                        onChange={(e) => void flipGrant(role, p.name, e.target.checked)}
                      />
                      <span>{permissionLabel(p.name)}</span>
                      <span className="text-gray-400">({p.category})</span>
                    </label>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* RD-B FEAT-H044 STORY-1/2: what is offered to THIS group, and the
          ceremony that copies an update in. Behind an affordance and fed by
          the scoped catalogue that already rides the roles payload, so it
          adds no request to the group-detail first paint (the spec's
          ADR-U043 placement). */}
      {fabric && (
        <AvailableRolesSection
          groupId={groupId}
          templates={templates}
          roles={fabric.roles}
          canManage={canManage}
          onMutated={onMutated}
          focus={focusAvailableRoles}
        />
      )}

      {/* RD-A FEAT-H043 STORY-4: the ceremony states its consequences BEFORE
          the click. holder_count already rides the fabric, so a held role's
          obstacle is named up front rather than discovered as a refusal. */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Remove role"
        message={removalMessage(deleteTarget)}
        confirmText="Remove"
        variant="danger"
        busy={busy}
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!busy) setDeleteTarget(null);
        }}
      />
    </div>
  );
}

function AddRoleForm({
  groupId,
  templates,
  catalog,
  onDone,
  onCancel,
}: {
  groupId: string;
  templates: RoleTemplateOption[];
  catalog: Array<{ name: string; category: string }>;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<string>('custom');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseMode = (value: string) => {
    setMode(value);
    if (value !== 'custom') {
      const template = templates.find((t) => t.id === value);
      // Prefill with the template's short name; the instance name stays editable.
      setName(template ? template.name.replace(/ Role Template$/, '') : '');
    }
  };

  const toggle = (permission: string, on: boolean) => {
    const next = new Set(ticked);
    if (on) next.add(permission);
    else next.delete(permission);
    setTicked(next);
  };

  const categories = [...new Set(catalog.map((p) => p.category))];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('A role needs a name.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await createGroupRole(
        groupId,
        mode === 'custom'
          ? { name: name.trim(), description: description || null, permissions: [...ticked] }
          : { name: name.trim(), description: description || null, role_template_id: mode },
      );
      onDone();
    } catch (err) {
      // The wall's message, verbatim; the form keeps its state.
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      data-testid="add-role-form"
      className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-4"
    >
      <div className="mb-3">
        <label htmlFor="add-role-mode" className="mb-1 block text-xs font-medium text-gray-700">
          Start from
        </label>
        <select
          id="add-role-mode"
          data-testid="add-role-mode"
          value={mode}
          onChange={(e) => chooseMode(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        >
          <option value="custom">Custom role</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-3">
        <label htmlFor="add-role-name" className="mb-1 block text-xs font-medium text-gray-700">
          Role name
        </label>
        <input
          id="add-role-name"
          data-testid="role-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        />
      </div>

      <div className="mb-3">
        <label
          htmlFor="add-role-description"
          className="mb-1 block text-xs font-medium text-gray-700"
        >
          Description
        </label>
        <input
          id="add-role-description"
          data-testid="role-description-input"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm"
        />
      </div>

      {mode === 'custom' && (
        <div className="mb-3 space-y-2">
          {categories.map((category) => (
            <fieldset key={category}>
              <legend className="text-xs font-medium text-gray-500">{category}</legend>
              <div className="mt-1 space-y-1">
                {catalog
                  .filter((p) => p.category === category)
                  .map((p) => (
                    <label key={p.name} className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        data-testid={`perm-checkbox-${p.name}`}
                        checked={ticked.has(p.name)}
                        onChange={(e) => toggle(p.name, e.target.checked)}
                      />
                      <span>{permissionLabel(p.name)}</span>
                    </label>
                  ))}
              </div>
            </fieldset>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          data-testid="add-role-submit"
          disabled={saving}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          Create role
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
