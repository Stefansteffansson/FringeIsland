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
