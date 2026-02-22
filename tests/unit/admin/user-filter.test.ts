/**
 * Unit Tests: User Filter Logic (B-ADMIN-002 revised)
 *
 * Tests the pure functions that control:
 * - Which users are visible based on filter state
 * - User count computation for the stat card
 * - Stat card label (always "Users", not "Active Users")
 *
 * Three filter toggles: showActive, showInactive, showDecommissioned.
 * Default: active + inactive visible, decommissioned hidden.
 */

import { describe, it, expect } from '@jest/globals';
import {
  filterUsers,
  computeUserCount,
  getUserStatLabel,
  DEFAULT_USER_FILTERS,
  type AdminUser,
  type UserFilters,
} from '@/lib/admin/user-filter';

// --- Test Data ---

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: overrides.id ?? 'user-1',
    personal_group_id: overrides.personal_group_id ?? 'pg-user-1',
    full_name: overrides.full_name ?? 'Test User',
    email: overrides.email ?? 'test@example.com',
    is_active: overrides.is_active ?? true,
    is_decommissioned: overrides.is_decommissioned ?? false,
    created_at: overrides.created_at ?? '2026-01-01T00:00:00Z',
  };
}

const activeUser = makeUser({ id: 'active-1', is_active: true, is_decommissioned: false });
const activeUser2 = makeUser({ id: 'active-2', is_active: true, is_decommissioned: false });
const inactiveUser = makeUser({ id: 'inactive-1', is_active: false, is_decommissioned: false });
const inactiveUser2 = makeUser({ id: 'inactive-2', is_active: false, is_decommissioned: false });
const decomUser = makeUser({ id: 'decom-1', is_active: false, is_decommissioned: true });
const decomUser2 = makeUser({ id: 'decom-2', is_active: false, is_decommissioned: true });

const allUsers = [activeUser, activeUser2, inactiveUser, inactiveUser2, decomUser, decomUser2];

// --- Tests ---

describe('B-ADMIN-002: User Filter Logic', () => {
  describe('getUserStatLabel', () => {
    it('returns "Users" (not "Active Users")', () => {
      expect(getUserStatLabel()).toBe('Users');
    });
  });

  describe('DEFAULT_USER_FILTERS', () => {
    it('defaults to active + inactive visible, decommissioned hidden', () => {
      expect(DEFAULT_USER_FILTERS).toEqual({
        showActive: true,
        showInactive: true,
        showDecommissioned: false,
      });
    });
  });

  describe('filterUsers — default filters (active + inactive, no decom)', () => {
    const filters: UserFilters = { showActive: true, showInactive: true, showDecommissioned: false };

    it('shows active users', () => {
      const result = filterUsers(allUsers, filters);
      expect(result).toContainEqual(activeUser);
      expect(result).toContainEqual(activeUser2);
    });

    it('shows inactive users (not decommissioned)', () => {
      const result = filterUsers(allUsers, filters);
      expect(result).toContainEqual(inactiveUser);
      expect(result).toContainEqual(inactiveUser2);
    });

    it('hides decommissioned users', () => {
      const result = filterUsers(allUsers, filters);
      const ids = result.map(u => u.id);
      expect(ids).not.toContain('decom-1');
      expect(ids).not.toContain('decom-2');
    });

    it('returns 4 users (2 active + 2 inactive, excludes 2 decommissioned)', () => {
      const result = filterUsers(allUsers, filters);
      expect(result).toHaveLength(4);
    });
  });

  describe('filterUsers — all three toggled ON', () => {
    const filters: UserFilters = { showActive: true, showInactive: true, showDecommissioned: true };

    it('shows all users including decommissioned', () => {
      const result = filterUsers(allUsers, filters);
      expect(result).toHaveLength(6);
    });

    it('includes decommissioned users', () => {
      const result = filterUsers(allUsers, filters);
      expect(result).toContainEqual(decomUser);
      expect(result).toContainEqual(decomUser2);
    });
  });

  describe('filterUsers — only active', () => {
    const filters: UserFilters = { showActive: true, showInactive: false, showDecommissioned: false };

    it('shows only active users', () => {
      const result = filterUsers(allUsers, filters);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(activeUser);
      expect(result).toContainEqual(activeUser2);
    });
  });

  describe('filterUsers — only inactive', () => {
    const filters: UserFilters = { showActive: false, showInactive: true, showDecommissioned: false };

    it('shows only inactive non-decommissioned users', () => {
      const result = filterUsers(allUsers, filters);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(inactiveUser);
      expect(result).toContainEqual(inactiveUser2);
    });
  });

  describe('filterUsers — only decommissioned', () => {
    const filters: UserFilters = { showActive: false, showInactive: false, showDecommissioned: true };

    it('shows only decommissioned users', () => {
      const result = filterUsers(allUsers, filters);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(decomUser);
      expect(result).toContainEqual(decomUser2);
    });
  });

  describe('filterUsers — all toggled OFF', () => {
    const filters: UserFilters = { showActive: false, showInactive: false, showDecommissioned: false };

    it('returns empty array', () => {
      const result = filterUsers(allUsers, filters);
      expect(result).toHaveLength(0);
    });
  });

  describe('filterUsers — edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(filterUsers([], DEFAULT_USER_FILTERS)).toHaveLength(0);
    });

    it('returns empty array when all users are decommissioned and toggle is off', () => {
      const result = filterUsers([decomUser, decomUser2], DEFAULT_USER_FILTERS);
      expect(result).toHaveLength(0);
    });

    it('returns all when no users are decommissioned regardless of toggle', () => {
      const nonDecom = [activeUser, inactiveUser];
      expect(filterUsers(nonDecom, DEFAULT_USER_FILTERS)).toHaveLength(2);
      expect(filterUsers(nonDecom, { showActive: true, showInactive: true, showDecommissioned: true })).toHaveLength(2);
    });
  });

  describe('computeUserCount', () => {
    it('counts only visible users (default: excludes decommissioned)', () => {
      expect(computeUserCount(allUsers, DEFAULT_USER_FILTERS)).toBe(4);
    });

    it('counts all users when all toggles are on', () => {
      expect(computeUserCount(allUsers, { showActive: true, showInactive: true, showDecommissioned: true })).toBe(6);
    });

    it('counts only active when inactive and decom are off', () => {
      expect(computeUserCount(allUsers, { showActive: true, showInactive: false, showDecommissioned: false })).toBe(2);
    });

    it('returns 0 for empty list', () => {
      expect(computeUserCount([], DEFAULT_USER_FILTERS)).toBe(0);
    });
  });
});
