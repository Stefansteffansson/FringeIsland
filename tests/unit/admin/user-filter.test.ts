/**
 * Unit Tests: User Filter Logic (B-ADMIN-002 revised)
 *
 * Tests the pure functions that control:
 * - Which users are visible based on filter state
 * - User count computation for the stat card
 * - Stat card label (always "Users", not "Active Users")
 *
 * Default filter: active + inactive visible, decommissioned hidden.
 * Toggle controls decommissioned visibility.
 */

import { describe, it, expect } from '@jest/globals';
import {
  filterUsers,
  computeUserCount,
  getUserStatLabel,
  type AdminUser,
  type UserFilterOptions,
} from '@/lib/admin/user-filter';

// --- Test Data ---

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: overrides.id ?? 'user-1',
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

  describe('filterUsers — default (showDecommissioned: false)', () => {
    const opts: UserFilterOptions = { showDecommissioned: false };

    it('shows active users', () => {
      const result = filterUsers(allUsers, opts);
      expect(result).toContainEqual(activeUser);
      expect(result).toContainEqual(activeUser2);
    });

    it('shows inactive users (not decommissioned)', () => {
      const result = filterUsers(allUsers, opts);
      expect(result).toContainEqual(inactiveUser);
      expect(result).toContainEqual(inactiveUser2);
    });

    it('hides decommissioned users', () => {
      const result = filterUsers(allUsers, opts);
      const ids = result.map(u => u.id);
      expect(ids).not.toContain('decom-1');
      expect(ids).not.toContain('decom-2');
    });

    it('returns 4 users (2 active + 2 inactive, excludes 2 decommissioned)', () => {
      const result = filterUsers(allUsers, opts);
      expect(result).toHaveLength(4);
    });
  });

  describe('filterUsers — showDecommissioned: true', () => {
    const opts: UserFilterOptions = { showDecommissioned: true };

    it('shows all users including decommissioned', () => {
      const result = filterUsers(allUsers, opts);
      expect(result).toHaveLength(6);
    });

    it('includes decommissioned users', () => {
      const result = filterUsers(allUsers, opts);
      expect(result).toContainEqual(decomUser);
      expect(result).toContainEqual(decomUser2);
    });
  });

  describe('filterUsers — edge cases', () => {
    it('returns empty array for empty input', () => {
      expect(filterUsers([], { showDecommissioned: false })).toHaveLength(0);
    });

    it('returns empty array when all users are decommissioned and toggle is off', () => {
      const result = filterUsers([decomUser, decomUser2], { showDecommissioned: false });
      expect(result).toHaveLength(0);
    });

    it('returns all when no users are decommissioned regardless of toggle', () => {
      const nonDecom = [activeUser, inactiveUser];
      expect(filterUsers(nonDecom, { showDecommissioned: false })).toHaveLength(2);
      expect(filterUsers(nonDecom, { showDecommissioned: true })).toHaveLength(2);
    });
  });

  describe('computeUserCount', () => {
    it('counts only visible users (default: excludes decommissioned)', () => {
      expect(computeUserCount(allUsers, { showDecommissioned: false })).toBe(4);
    });

    it('counts all users when decommissioned toggle is on', () => {
      expect(computeUserCount(allUsers, { showDecommissioned: true })).toBe(6);
    });

    it('returns 0 for empty list', () => {
      expect(computeUserCount([], { showDecommissioned: false })).toBe(0);
    });
  });
});
