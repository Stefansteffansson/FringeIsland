/**
 * Selection Model — Pure functions for B-ADMIN-013
 *
 * Controls the Users panel selection state:
 * toggle, range, select-all, deselect-all, cross-page persistence.
 */

/**
 * Toggle a single user in/out of the selection.
 * Returns a new Set (does not mutate the original).
 */
export function toggleSelection(selectedIds: Set<string>, userId: string): Set<string> {
  const next = new Set(selectedIds);
  if (next.has(userId)) {
    next.delete(userId);
  } else {
    next.add(userId);
  }
  return next;
}

/**
 * Select a contiguous range of rows (Shift+click).
 * Adds the range to the existing selection (does not replace).
 * Works in both forward and backward direction.
 */
export function rangeSelect(
  allVisibleIds: string[],
  selectedIds: Set<string>,
  anchorIndex: number,
  targetIndex: number,
): Set<string> {
  const next = new Set(selectedIds);
  const start = Math.min(anchorIndex, targetIndex);
  const end = Math.max(anchorIndex, targetIndex);
  for (let i = start; i <= end; i++) {
    next.add(allVisibleIds[i]);
  }
  return next;
}

/**
 * Add all visible row IDs to the selection (header checkbox → check).
 * Preserves cross-page selections.
 */
export function selectAllVisible(selectedIds: Set<string>, visibleIds: string[]): Set<string> {
  const next = new Set(selectedIds);
  for (const id of visibleIds) {
    next.add(id);
  }
  return next;
}

/**
 * Remove all visible row IDs from the selection (header checkbox → uncheck).
 * Preserves cross-page selections.
 */
export function deselectAllVisible(selectedIds: Set<string>, visibleIds: string[]): Set<string> {
  const next = new Set(selectedIds);
  for (const id of visibleIds) {
    next.delete(id);
  }
  return next;
}

/**
 * Check if all visible rows are currently selected.
 * Returns false for empty visible list.
 */
export function isAllVisibleSelected(selectedIds: Set<string>, visibleIds: string[]): boolean {
  if (visibleIds.length === 0) return false;
  return visibleIds.every((id) => selectedIds.has(id));
}

/**
 * Get the total count of selected users (across all pages).
 */
export function getSelectedCount(selectedIds: Set<string>): number {
  return selectedIds.size;
}
