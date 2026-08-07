import type { RoleTemplateOption } from '@/lib/groups/queries';

/**
 * RD-B FEAT-H044 STORY-1 — the three-state render logic.
 *
 * `get_available_role_templates` carries adoption state on every entry (the
 * payload walk's first finding), so each entry resolves to one of three states
 * without a second call:
 *
 *   not-adopted  — the group holds no copy; offer Copy
 *   current      — the copy matches the catalogue; state it, offer nothing
 *   behind       — the copy differs from the catalogue; offer Review update
 *
 * "behind" means *differs from the catalogue's current default*, not merely
 * "lower version number". A rolled-back default leaves the copy ahead, and the
 * grant sets still differ — calling that "current" would hide a divergence the
 * provenance line is already showing.
 */
export type AvailableRoleState = 'not-adopted' | 'current' | 'behind';

export function availableRoleState(entry: RoleTemplateOption): AvailableRoleState {
  if (!entry.adopted_group_role_id) return 'not-adopted';

  // Nothing to move to: a diff against no default version is not computable,
  // so the honest render is "no action" rather than a Review update that would
  // open a ceremony only to refuse.
  if (entry.current_version_number === null) return 'current';

  // RD-10: an unknown adopted version blocks the LABEL, never the comparison.
  // The diff is computed from grants, so the update stays offerable — refusing
  // to offer it would strand the copy on an unknown version forever.
  if (entry.adopted_version_number === null) return 'behind';

  return entry.adopted_version_number === entry.current_version_number ? 'current' : 'behind';
}

/** The adopted side of the movement — never a guess where provenance is null. */
export function adoptedVersionLabel(version: number | null): string {
  return version === null ? 'version unknown' : `v${version}`;
}

/**
 * "v1 → v3", or "version unknown → v3" where provenance is null. Empty for an
 * unadopted entry, which has no movement to name.
 */
export function versionMovement(entry: RoleTemplateOption): string {
  if (!entry.adopted_group_role_id || entry.current_version_number === null) return '';
  return `${adoptedVersionLabel(entry.adopted_version_number)} → v${entry.current_version_number}`;
}
