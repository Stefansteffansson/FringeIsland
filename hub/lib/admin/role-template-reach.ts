import type { RoleTemplatePublication } from '@/lib/admin/roles';

/**
 * RD-B FEAT-H044 STORY-3 — current reach, in words.
 *
 * Reach is data (RD-8): one publication row per reach, with a NULL `group_id`
 * meaning platform-wide. That makes "all groups" a row rather than a special
 * code path — and it means the surface reads reach, never computes it.
 *
 * These are rendering decisions over the payload, not rules. The platform
 * decides who may publish and what publishing does; this only decides how the
 * resulting rows read to an admin.
 */
type Publications = readonly RoleTemplatePublication[] | null | undefined;

/** A platform-wide row is the NULL-group_id row (RD-8). */
export function isPlatformWide(publications: Publications): boolean {
  return (publications ?? []).some((p) => p.group_id === null);
}

/** The named rows only — the platform-wide row names no group by construction. */
export function namedPublications(publications: Publications): RoleTemplatePublication[] {
  return (publications ?? []).filter((p) => p.group_id !== null);
}

/**
 * "Published to all groups" / "Published to 3 groups" / "Not published".
 *
 * Platform-wide wins when both kinds of row exist: publishing platform-wide
 * does not delete targeted rows (reach survives as data, RDB-6), so the
 * broadest reach is the true statement of who is currently offered the
 * template.
 */
export function reachSummary(publications: Publications): string {
  const rows = publications ?? [];
  if (rows.length === 0) return 'Not published';
  if (isPlatformWide(rows)) return 'Published to all groups';
  const n = namedPublications(rows).length;
  return `Published to ${n} ${n === 1 ? 'group' : 'groups'}`;
}

/**
 * Why publishing is unavailable, or null when it is available.
 *
 * A system template returns null because it has no reach section at all —
 * there is no blocked action to explain. Only retirement blocks an otherwise
 * publishable template, and the surface states it rather than silently
 * dropping the affordance.
 */
export function publishBlockedReason(template: {
  is_system: boolean;
  retired_at: string | null;
}): string | null {
  if (template.is_system) return null;
  if (template.retired_at) {
    return 'This template is retired — the catalogue has stopped offering it, so it cannot be published. Unretire it first.';
  }
  return null;
}
