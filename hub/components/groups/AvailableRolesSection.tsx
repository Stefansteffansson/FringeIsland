'use client';

import { useEffect, useRef, useState } from 'react';
import {
  applyRoleTemplateUpdate,
  createGroupRole,
  fetchRoleCopyDiff,
} from '@/lib/groups/client';
import type { RoleCopyDiff, RoleEntry, RoleTemplateOption } from '@/lib/groups/queries';
import { availableRoleState, adoptedVersionLabel, versionMovement } from '@/lib/groups/available-roles';
import { permissionLabels } from '@/lib/groups/permission-label';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/**
 * RD-B FEAT-H044 STORY-1/2 — what is offered to THIS group, and the ceremony
 * that copies an update into it.
 *
 * RD-A taught three surfaces to tell the truth and gave none of them an
 * action. This is the action: the provenance line that says "v1, copied 12
 * Mar" while the catalogue serves v6 now has somewhere to go that is not
 * delete-and-re-adopt.
 *
 * The list is `get_available_role_templates(group_id)` — scope and retirement
 * both filtered server-side, so this component never filters (the RD-A
 * STORY-3 discipline: every Surface inherits the filter by calling the
 * contract). That read already rides the roles payload, so the section costs
 * NO request to open: the ADR-U043 placement the spec's performance budget is
 * drawn against, satisfied by consuming a read that already happened rather
 * than by deferring a new one. If this section is ever given its own fetch,
 * the deep-cold spot measurement becomes owed.
 *
 * The ceremony reads the diff on open — never per listed entry — and is
 * take-it-or-leave-it by design (RD-3). Per-permission choice would re-create
 * silent-merge's ambiguity one row at a time.
 */
export function AvailableRolesSection({
  groupId,
  templates,
  roles,
  canManage,
  onMutated,
  focus = false,
}: {
  groupId: string;
  templates: RoleTemplateOption[];
  roles: RoleEntry[];
  canManage: boolean;
  onMutated: () => void;
  /** RD-B walk fix W-1: the landing hint from a roles notice
   *  (`?focus=roles`). Expands the section, scrolls it into view and rings it
   *  once — the WS-4 mechanism, pointed at a new destination. */
  focus?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [ceremony, setCeremony] = useState<CeremonyState | null>(null);
  const [highlight, setHighlight] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const focusFired = useRef(false);

  // Fire once per focused landing. Expanding is part of the fix, not a bonus:
  // scrolling to a collapsed disclosure would land the member on the section
  // and still show them no roles — half-solving the very complaint.
  useEffect(() => {
    if (!focus || focusFired.current || !canManage) return;
    focusFired.current = true;
    setExpanded(true);
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHighlight(true);
    const t = setTimeout(() => setHighlight(false), 2500);
    return () => clearTimeout(t);
  }, [focus, canManage]);

  // Not rendered at all — not rendered-and-disabled. The section offers acts a
  // member without `manage_roles` cannot perform, and showing them a list of
  // things they may not do is worse than silence.
  if (!canManage) return null;

  const copy = async (entry: RoleTemplateOption) => {
    setActionError(null);
    setCopyingId(entry.id);
    try {
      await createGroupRole(groupId, {
        // The instance name drops the template suffix, matching the add-role
        // form's prefill so both doors produce the same name for the same
        // template.
        name: entry.name.replace(/ Role Template$/, ''),
        description: null,
        role_template_id: entry.id,
      });
      onMutated();
    } catch (err) {
      // The contract's message, verbatim.
      setActionError((err as Error).message);
    } finally {
      setCopyingId(null);
    }
  };

  const openCeremony = async (entry: RoleTemplateOption) => {
    const roleId = entry.adopted_group_role_id;
    if (!roleId) return;
    setActionError(null);
    setCeremony({ entry, roleId, diff: null, error: null, busy: false });
    try {
      const diff = await fetchRoleCopyDiff(groupId, roleId);
      setCeremony((c) => (c && c.roleId === roleId ? { ...c, diff } : c));
    } catch (err) {
      // Surfaced inside the ceremony, which then offers no act — there is
      // nothing to confirm over a diff we could not read.
      setCeremony((c) =>
        c && c.roleId === roleId ? { ...c, error: (err as Error).message } : c,
      );
    }
  };

  const confirmApply = async () => {
    if (!ceremony) return;
    setCeremony({ ...ceremony, busy: true, error: null });
    try {
      await applyRoleTemplateUpdate(groupId, ceremony.roleId);
      setCeremony(null);
      onMutated();
    } catch (err) {
      // RD-3: the ceremony stays open with the refusal's own words and the
      // panel is untouched. The Steward decides what to do next.
      setCeremony((c) => (c ? { ...c, busy: false, error: (err as Error).message } : c));
    }
  };

  const holderCount = ceremony
    ? (roles.find((r) => r.id === ceremony.roleId)?.holder_count ?? 0)
    : 0;

  // RD-B walk fix W-3 (ruled 2026-08-08): only what can be ACTED on. A settled
  // group is offered the four system templates unconditionally and has already
  // adopted all four, so listing adopted-and-current entries meant the section
  // opened with four rows of nothing-to-do and the "nothing new" line was
  // unreachable. Hiding them makes that line the normal resting state.
  //
  // Nothing is lost: "Guide is current" still reads on the role card above, in
  // the provenance line RD-A put there. This section is about what is on
  // offer, not an inventory of what the group holds.
  const offers = templates.filter((t) => availableRoleState(t) !== 'current');

  return (
    <div
      ref={sectionRef}
      data-testid="available-roles-section"
      className={`mt-6 border-t border-gray-100 pt-4 ${
        highlight ? 'rounded-lg ring-2 ring-indigo-400 ring-offset-2 transition-shadow' : ''
      }`}
    >
      <button
        type="button"
        data-testid="available-roles-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((v) => !v)}
        className="text-sm font-medium text-indigo-700 hover:underline"
      >
        {expanded ? 'Hide available roles' : 'Show available roles'}
      </button>

      {actionError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {actionError}
        </p>
      )}

      {expanded && (
        <div className="mt-3">
          {offers.length === 0 ? (
            <p data-testid="available-roles-empty" className="text-sm text-gray-500">
              Nothing new is offered to this group right now.
            </p>
          ) : (
            <ul className="space-y-2">
              {offers.map((entry) => {
                const state = availableRoleState(entry);
                return (
                  <li
                    key={entry.id}
                    data-testid="available-role-entry"
                    className="flex items-start justify-between gap-3 rounded-lg border border-gray-100 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{entry.name}</p>
                      {entry.description && (
                        <p className="text-xs text-gray-500">{entry.description}</p>
                      )}
                      {state === 'behind' && (
                        <p className="mt-1 text-xs text-amber-700">{versionMovement(entry)}</p>
                      )}
                    </div>

                    {/* RD-B walk fix W-2 (ruled 2026-08-08): NO availability
                        gating. Add role, Edit grants and Delete sit beside this
                        section gated on `canManage` alone, and the substrate
                        genuinely permits them in a resting group — a
                        `rest_group` holder may write, which the Steward
                        template grants. Withholding Copy here made one panel
                        take two postures on the same permission. The substrate
                        remains the enforcement point and refuses verbatim. */}
                    {state === 'not-adopted' && (
                      <button
                        type="button"
                        disabled={copyingId === entry.id}
                        onClick={() => void copy(entry)}
                        className="shrink-0 rounded border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Copy
                      </button>
                    )}
                    {state === 'behind' && (
                      <button
                        type="button"
                        onClick={() => void openCeremony(entry)}
                        className="shrink-0 rounded border border-amber-200 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50"
                      >
                        Review update
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={ceremony !== null}
        title="Review update"
        message={
          ceremony ? (
            <CeremonyBody ceremony={ceremony} holderCount={holderCount} />
          ) : (
            ''
          )
        }
        confirmText="Apply update"
        cancelText={applyOffered(ceremony) ? 'Cancel' : 'Close'}
        // Nothing to apply, or a diff we could not read: the dialog states the
        // situation and offers only its dismissal, rather than showing an act
        // and then refusing it.
        hideConfirm={!applyOffered(ceremony)}
        busy={ceremony?.busy ?? false}
        onConfirm={() => void confirmApply()}
        onCancel={() => {
          // Cancel makes no contract call — the diff read already happened on
          // open, and nothing is written until Apply.
          if (!ceremony?.busy) setCeremony(null);
        }}
      />
    </div>
  );
}

interface CeremonyState {
  entry: RoleTemplateOption;
  roleId: string;
  diff: RoleCopyDiff | null;
  error: string | null;
  busy: boolean;
}

/** Apply is offered only over a diff that was read and has something in it. */
function applyOffered(ceremony: CeremonyState | null): boolean {
  if (!ceremony || !ceremony.diff) return false;
  return ceremony.diff.added.length > 0 || ceremony.diff.removed.length > 0;
}

function CeremonyBody({
  ceremony,
  holderCount,
}: {
  ceremony: CeremonyState;
  holderCount: number;
}) {
  const { diff, error } = ceremony;
  const added = permissionLabels(diff?.added);
  const removed = permissionLabels(diff?.removed);

  return (
    <div className="text-left text-sm">
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {!diff && !error && <p>Reading the update...</p>}

      {diff && (
        <>
          <p className="mb-3 text-xs text-gray-500">
            {ceremony.entry.name} · {adoptedVersionLabel(diff.from_version)} → v{diff.to_version}
          </p>

          {added.length === 0 && removed.length === 0 ? (
            <p data-testid="diff-empty">
              There is nothing to apply — this role already matches the template.
            </p>
          ) : (
            <>
              {added.length > 0 && (
                <div data-testid="diff-added" className="mb-3">
                  <p className="font-medium text-gray-800">Will be added</p>
                  <ul className="ml-4 list-disc">
                    {added.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                  {/* THE RD-3 SENTENCE. This is the moment a silent merge would
                      have escalated permissions invisibly — made visible, and
                      refusable. Rendered verbatim; pinned by its own copy-check
                      cell (the payload walk traces keys, not rendered copy). */}
                  <p data-testid="diff-added-statement" className="mt-1 text-xs text-gray-600">
                    This will restore permissions you removed from this role.
                  </p>
                </div>
              )}

              {removed.length > 0 && (
                <div data-testid="diff-removed" className="mb-3">
                  <p className="font-medium text-gray-800">Will be removed</p>
                  <ul className="ml-4 list-disc">
                    {removed.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                  <p data-testid="diff-removed-statement" className="mt-1 text-xs text-gray-600">
                    These were added to this role in your group and will be taken away.
                  </p>
                </div>
              )}

              {/* The consequence stated before the click, not discovered after.
                  W-4: at zero there is no "they" to reassure, so the sentence
                  says the true thing instead of a grammatically odd one. */}
              <p data-testid="diff-holders" className="text-xs text-gray-600">
                {holderCount === 0
                  ? 'No one holds this role yet, so no member’s permissions change.'
                  : `${holderCount === 1 ? '1 member holds' : `${holderCount} members hold`} this role. They keep the role, and their permissions change with it.`}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
