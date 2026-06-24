/**
 * Unit Tests: Selection Model (B-ADMIN-013)
 *
 * Tests the pure functions that control:
 * - Toggle selection (click row)
 * - Range selection (Shift+click)
 * - Select/deselect all visible rows (header checkbox)
 * - Cross-page persistence (selection survives page changes)
 * - Selected count
 */

import { describe, it, expect } from '@jest/globals';
import {
  toggleSelection,
  rangeSelect,
  selectAllVisible,
  deselectAllVisible,
  isAllVisibleSelected,
  getSelectedCount,
} from '@/lib/admin/selection-model';

// --- Tests ---

describe('B-ADMIN-013: Selection Model', () => {
  describe('toggleSelection', () => {
    it('adds an unselected user to the selection', () => {
      const selected = new Set<string>();
      const result = toggleSelection(selected, 'user-1');
      expect(result.has('user-1')).toBe(true);
      expect(result.size).toBe(1);
    });

    it('removes a selected user from the selection', () => {
      const selected = new Set(['user-1', 'user-2']);
      const result = toggleSelection(selected, 'user-1');
      expect(result.has('user-1')).toBe(false);
      expect(result.has('user-2')).toBe(true);
      expect(result.size).toBe(1);
    });

    it('does not mutate the original set', () => {
      const selected = new Set(['user-1']);
      const result = toggleSelection(selected, 'user-2');
      expect(selected.size).toBe(1); // original unchanged
      expect(result.size).toBe(2); // new set has both
    });

    it('works on empty selection', () => {
      const result = toggleSelection(new Set(), 'user-1');
      expect(result.size).toBe(1);
    });
  });

  describe('rangeSelect', () => {
    const visibleIds = ['a', 'b', 'c', 'd', 'e'];

    it('selects a contiguous range (forward)', () => {
      const selected = new Set<string>();
      const result = rangeSelect(visibleIds, selected, 1, 3); // b, c, d
      expect(result.has('b')).toBe(true);
      expect(result.has('c')).toBe(true);
      expect(result.has('d')).toBe(true);
      expect(result.size).toBe(3);
    });

    it('selects a contiguous range (backward)', () => {
      const selected = new Set<string>();
      const result = rangeSelect(visibleIds, selected, 3, 1); // b, c, d
      expect(result.has('b')).toBe(true);
      expect(result.has('c')).toBe(true);
      expect(result.has('d')).toBe(true);
      expect(result.size).toBe(3);
    });

    it('adds range to existing selection (does not replace)', () => {
      const selected = new Set(['x']); // cross-page selection
      const result = rangeSelect(visibleIds, selected, 0, 1); // a, b
      expect(result.has('x')).toBe(true); // preserved
      expect(result.has('a')).toBe(true);
      expect(result.has('b')).toBe(true);
      expect(result.size).toBe(3);
    });

    it('selects single row when anchor equals target', () => {
      const result = rangeSelect(visibleIds, new Set(), 2, 2);
      expect(result.has('c')).toBe(true);
      expect(result.size).toBe(1);
    });

    it('selects entire visible list when range covers all', () => {
      const result = rangeSelect(visibleIds, new Set(), 0, 4);
      expect(result.size).toBe(5);
    });

    it('does not mutate the original set', () => {
      const selected = new Set(['x']);
      rangeSelect(visibleIds, selected, 0, 2);
      expect(selected.size).toBe(1); // original unchanged
    });
  });

  describe('selectAllVisible', () => {
    it('adds all visible IDs to selection', () => {
      const selected = new Set<string>();
      const visibleIds = ['a', 'b', 'c'];
      const result = selectAllVisible(selected, visibleIds);
      expect(result.size).toBe(3);
      expect(result.has('a')).toBe(true);
      expect(result.has('b')).toBe(true);
      expect(result.has('c')).toBe(true);
    });

    it('preserves cross-page selections', () => {
      const selected = new Set(['page1-user']); // from another page
      const visibleIds = ['a', 'b'];
      const result = selectAllVisible(selected, visibleIds);
      expect(result.size).toBe(3);
      expect(result.has('page1-user')).toBe(true);
    });

    it('is idempotent (selecting already-selected IDs is fine)', () => {
      const selected = new Set(['a', 'b']);
      const result = selectAllVisible(selected, ['a', 'b', 'c']);
      expect(result.size).toBe(3);
    });

    it('does not mutate the original set', () => {
      const selected = new Set<string>();
      selectAllVisible(selected, ['a']);
      expect(selected.size).toBe(0);
    });
  });

  describe('deselectAllVisible', () => {
    it('removes all visible IDs from selection', () => {
      const selected = new Set(['a', 'b', 'c']);
      const result = deselectAllVisible(selected, ['a', 'b', 'c']);
      expect(result.size).toBe(0);
    });

    it('preserves cross-page selections', () => {
      const selected = new Set(['a', 'b', 'page2-user']);
      const result = deselectAllVisible(selected, ['a', 'b']);
      expect(result.size).toBe(1);
      expect(result.has('page2-user')).toBe(true);
    });

    it('ignores IDs not in selection', () => {
      const selected = new Set(['a']);
      const result = deselectAllVisible(selected, ['a', 'b', 'c']);
      expect(result.size).toBe(0);
    });

    it('does not mutate the original set', () => {
      const selected = new Set(['a', 'b']);
      deselectAllVisible(selected, ['a']);
      expect(selected.size).toBe(2);
    });
  });

  describe('isAllVisibleSelected', () => {
    it('returns true when all visible IDs are in selection', () => {
      const selected = new Set(['a', 'b', 'c', 'extra']);
      expect(isAllVisibleSelected(selected, ['a', 'b', 'c'])).toBe(true);
    });

    it('returns false when some visible IDs are not selected', () => {
      const selected = new Set(['a']);
      expect(isAllVisibleSelected(selected, ['a', 'b'])).toBe(false);
    });

    it('returns false when no visible IDs are selected', () => {
      expect(isAllVisibleSelected(new Set(), ['a', 'b'])).toBe(false);
    });

    it('returns false for empty visible list', () => {
      expect(isAllVisibleSelected(new Set(['a']), [])).toBe(false);
    });
  });

  describe('getSelectedCount', () => {
    it('returns 0 for empty selection', () => {
      expect(getSelectedCount(new Set())).toBe(0);
    });

    it('returns correct count', () => {
      expect(getSelectedCount(new Set(['a', 'b', 'c']))).toBe(3);
    });
  });

  describe('cross-page persistence scenario', () => {
    it('maintains selection across simulated page changes', () => {
      // Page 1: select users a, b
      let selected = new Set<string>();
      selected = toggleSelection(selected, 'a');
      selected = toggleSelection(selected, 'b');
      expect(selected.size).toBe(2);

      // Navigate to page 2 (different visible IDs, selection persists)
      const page2Visible = ['c', 'd', 'e'];
      // Selection still has a, b from page 1
      expect(selected.has('a')).toBe(true);
      expect(selected.has('b')).toBe(true);

      // Select c on page 2
      selected = toggleSelection(selected, 'c');
      expect(selected.size).toBe(3);

      // Select all on page 2
      selected = selectAllVisible(selected, page2Visible);
      expect(selected.size).toBe(5); // a, b from page 1 + c, d, e from page 2

      // Deselect all on page 2 — page 1 selections preserved
      selected = deselectAllVisible(selected, page2Visible);
      expect(selected.size).toBe(2);
      expect(selected.has('a')).toBe(true);
      expect(selected.has('b')).toBe(true);
    });
  });

  describe('search/filter does not clear selection', () => {
    it('selection persists when visible set changes (simulating filter)', () => {
      // Select users on unfiltered view
      let selected = new Set(['a', 'b', 'c']);

      // Filter reduces visible set (users b and c become hidden)
      const filteredVisible = ['a', 'd'];

      // Selection should still contain b and c (hidden but selected)
      expect(selected.has('b')).toBe(true);
      expect(selected.has('c')).toBe(true);
      expect(getSelectedCount(selected)).toBe(3);

      // Header checkbox should NOT show as "all selected" (d is visible but not selected)
      expect(isAllVisibleSelected(selected, filteredVisible)).toBe(false);
    });
  });
});
