/**
 * RD-B FEAT-H044 STORY-2 — permission display names.
 *
 * The substrate has no display-name column. `public.permissions` is
 * `(id, name, description, category, created_at)`; `get_role_copy_diff`,
 * `get_group_roles` and every other read serve `p.name` — the internal key
 * (`manage_roles`). `description` exists but is a full sentence, far too long
 * for a diff list or a grant checkbox.
 *
 * STORY-2 requires display names, so the mapping is presentation and lives
 * Surface-side. ADR-U038 permits exactly this in a Surface: it is a label, not
 * a business rule, an authorization decision, or a lifecycle invariant, so a
 * sibling Surface rendering the same payload differently loses nothing.
 *
 * Deliberately a pure transform rather than a lookup table. A hand-written map
 * renders the raw key for every permission seeded after it was written — the
 * open-registry failure mode `NotificationItem`'s category-icon map already
 * carries (a missing key falls back rather than failing, so it ships
 * unnoticed). Humanising the key is total by construction: a permission added
 * tomorrow reads as words today.
 */
export function permissionLabel(name: string): string {
  if (!name) return name;
  const words = name.replace(/_/g, ' ').trim();
  if (!words) return '';
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

/** The list form, order-preserving — the contract already sorts, so the
 *  surface must not re-sort and silently disagree with the server's order. */
export function permissionLabels(names: readonly string[] | null | undefined): string[] {
  return (names ?? []).map(permissionLabel);
}
