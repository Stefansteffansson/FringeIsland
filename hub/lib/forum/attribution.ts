import type { AuthorDisplay } from '@/lib/forum/queries';

/**
 * FEAT-H026 COM-14 — presentation of the platform-resolved attribution ladder.
 * The client NEVER computes membership; it only styles what the platform said.
 * A 'former' or 'unknown' author renders muted + italic and is never a link;
 * an unrecognised attribution value is treated as unknown-shaped (safe default,
 * extensibility rule — a new attribution kind must not crash the render).
 */
export function isResolvedAuthor(author: AuthorDisplay): boolean {
  return author.attribution === 'active';
}

export function authorClassName(author: AuthorDisplay): string {
  return isResolvedAuthor(author)
    ? 'font-medium text-gray-800'
    : 'italic text-gray-400';
}

/**
 * FEAT-H046 STORY-3 (ADR-U041 §5) — the `kind` badge label, or null for no
 * badge. `'group'` badges "Group"; `'person'` and an absent kind badge
 * nothing (tolerant reader — pre-PD019 payloads carry no kind); an unknown
 * kind renders its raw value (open set — visible for what it is, never a
 * crash). The badge never overrides the ladder: attribution styling above is
 * untouched by kind.
 */
export function authorKindBadge(author: AuthorDisplay): string | null {
  const kind = author.kind;
  if (kind === undefined || kind === 'person') return null;
  if (kind === 'group') return 'Group';
  return kind;
}
