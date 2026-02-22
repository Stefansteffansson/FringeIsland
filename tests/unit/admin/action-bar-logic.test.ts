/**
 * Unit Tests: Action Bar Logic (B-ADMIN-014)
 *
 * Tests the pure functions that control:
 * - Action bar visibility (hidden when 0 selected)
 * - Context-sensitive action disabling
 * - Action categories (Communication, Account, Group)
 * - Destructive action identification (requires ConfirmModal)
 * - Selection-clearing behavior after actions
 */

import { describe, it, expect } from '@jest/globals';
import {
  isActionBarVisible,
  computeActionStates,
  isDestructiveAction,
  clearsSelectionAfterAction,
  ACTION_CATEGORIES,
  DESTRUCTIVE_ACTIONS,
  SELECTION_CLEARING_ACTIONS,
  type ActionName,
} from '@/lib/admin/action-bar-logic';
import type { AdminUser } from '@/lib/admin/user-filter';

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

const activeUser = makeUser({ id: 'a1', is_active: true, is_decommissioned: false });
const activeUser2 = makeUser({ id: 'a2', is_active: true, is_decommissioned: false });
const inactiveUser = makeUser({ id: 'i1', is_active: false, is_decommissioned: false });
const inactiveUser2 = makeUser({ id: 'i2', is_active: false, is_decommissioned: false });
const decomUser = makeUser({ id: 'd1', is_active: false, is_decommissioned: true });
const decomUser2 = makeUser({ id: 'd2', is_active: false, is_decommissioned: true });

// --- Tests ---

describe('B-ADMIN-014: Action Bar Logic', () => {
  describe('isActionBarVisible', () => {
    it('returns false when 0 users selected', () => {
      expect(isActionBarVisible(0)).toBe(false);
    });

    it('returns true when 1 user selected', () => {
      expect(isActionBarVisible(1)).toBe(true);
    });

    it('returns true when many users selected', () => {
      expect(isActionBarVisible(50)).toBe(true);
    });
  });

  describe('ACTION_CATEGORIES', () => {
    it('has 3 categories: communication, account, group', () => {
      expect(Object.keys(ACTION_CATEGORIES)).toHaveLength(3);
      expect(ACTION_CATEGORIES).toHaveProperty('communication');
      expect(ACTION_CATEGORIES).toHaveProperty('account');
      expect(ACTION_CATEGORIES).toHaveProperty('group');
    });

    it('communication contains message and notify', () => {
      expect(ACTION_CATEGORIES.communication).toEqual(['message', 'notify']);
    });

    it('account contains deactivate, activate, delete_soft, delete_hard, logout', () => {
      expect(ACTION_CATEGORIES.account).toEqual([
        'deactivate', 'activate', 'delete_soft', 'delete_hard', 'logout',
      ]);
    });

    it('group contains invite, join, remove', () => {
      expect(ACTION_CATEGORIES.group).toEqual(['invite', 'join', 'remove']);
    });

    it('all categories together contain exactly 10 actions', () => {
      const allActions = [
        ...ACTION_CATEGORIES.communication,
        ...ACTION_CATEGORIES.account,
        ...ACTION_CATEGORIES.group,
      ];
      expect(allActions).toHaveLength(10);
    });
  });

  describe('computeActionStates — all active users', () => {
    const states = computeActionStates([activeUser, activeUser2]);

    it('disables "activate" (all already active)', () => {
      expect(states.activate.disabled).toBe(true);
    });

    it('enables "deactivate"', () => {
      expect(states.deactivate.disabled).toBe(false);
    });

    it('enables "delete_soft"', () => {
      expect(states.delete_soft.disabled).toBe(false);
    });

    it('enables "delete_hard"', () => {
      expect(states.delete_hard.disabled).toBe(false);
    });

    it('enables communication actions', () => {
      expect(states.message.disabled).toBe(false);
      expect(states.notify.disabled).toBe(false);
    });
  });

  describe('computeActionStates — all inactive users', () => {
    const states = computeActionStates([inactiveUser, inactiveUser2]);

    it('disables "deactivate" (all already inactive)', () => {
      expect(states.deactivate.disabled).toBe(true);
    });

    it('enables "activate"', () => {
      expect(states.activate.disabled).toBe(false);
    });

    it('enables "delete_soft"', () => {
      expect(states.delete_soft.disabled).toBe(false);
    });
  });

  describe('computeActionStates — all decommissioned users', () => {
    const states = computeActionStates([decomUser, decomUser2]);

    it('disables "activate" (decommissioned cannot be reactivated)', () => {
      expect(states.activate.disabled).toBe(true);
    });

    it('disables "deactivate" (decommissioned are already permanently removed)', () => {
      expect(states.deactivate.disabled).toBe(true);
    });

    it('disables "delete_soft" (all already decommissioned)', () => {
      expect(states.delete_soft.disabled).toBe(true);
    });

    it('enables "delete_hard" (can always hard-delete)', () => {
      expect(states.delete_hard.disabled).toBe(false);
    });

    it('enables communication actions (can still message/notify)', () => {
      expect(states.message.disabled).toBe(false);
      expect(states.notify.disabled).toBe(false);
    });
  });

  describe('computeActionStates — mixed active + inactive', () => {
    const states = computeActionStates([activeUser, inactiveUser]);

    it('enables "activate" (some are inactive)', () => {
      expect(states.activate.disabled).toBe(false);
    });

    it('enables "deactivate" (some are active)', () => {
      expect(states.deactivate.disabled).toBe(false);
    });
  });

  describe('computeActionStates — mixed with decommissioned', () => {
    it('disables "activate" when ANY selected user is decommissioned', () => {
      const states = computeActionStates([inactiveUser, decomUser]);
      expect(states.activate.disabled).toBe(true);
    });

    it('enables "deactivate" if not all are inactive/decommissioned', () => {
      const states = computeActionStates([activeUser, decomUser]);
      expect(states.deactivate.disabled).toBe(false);
    });

    it('enables "delete_soft" if not all are decommissioned', () => {
      const states = computeActionStates([activeUser, decomUser]);
      expect(states.delete_soft.disabled).toBe(false);
    });
  });

  describe('computeActionStates — group actions with commonGroupCount', () => {
    it('disables "remove" when commonGroupCount is 0', () => {
      const states = computeActionStates([activeUser], 0);
      expect(states.remove.disabled).toBe(true);
    });

    it('enables "remove" when commonGroupCount > 0', () => {
      const states = computeActionStates([activeUser], 2);
      expect(states.remove.disabled).toBe(false);
    });

    it('"invite" is always enabled regardless of commonGroupCount', () => {
      expect(computeActionStates([activeUser], 0).invite.disabled).toBe(false);
      expect(computeActionStates([activeUser], 5).invite.disabled).toBe(false);
    });

    it('"join" is always enabled regardless of commonGroupCount', () => {
      expect(computeActionStates([activeUser], 0).join.disabled).toBe(false);
      expect(computeActionStates([activeUser], 5).join.disabled).toBe(false);
    });
  });

  describe('computeActionStates — reasons', () => {
    it('provides reason when "activate" is disabled due to all active', () => {
      const states = computeActionStates([activeUser]);
      expect(states.activate.reason).toBeDefined();
    });

    it('provides reason when "activate" is disabled due to decommissioned', () => {
      const states = computeActionStates([decomUser]);
      expect(states.activate.reason).toBeDefined();
    });

    it('provides reason when "deactivate" is disabled', () => {
      const states = computeActionStates([inactiveUser]);
      expect(states.deactivate.reason).toBeDefined();
    });

    it('provides reason when "delete_soft" is disabled', () => {
      const states = computeActionStates([decomUser]);
      expect(states.delete_soft.reason).toBeDefined();
    });

    it('provides reason when "remove" is disabled', () => {
      const states = computeActionStates([activeUser], 0);
      expect(states.remove.reason).toBeDefined();
    });

    it('has no reason when action is enabled', () => {
      const states = computeActionStates([activeUser, inactiveUser], 2);
      expect(states.deactivate.reason).toBeUndefined();
      expect(states.activate.reason).toBeUndefined();
      expect(states.remove.reason).toBeUndefined();
    });
  });

  describe('isDestructiveAction', () => {
    it('returns true for deactivate', () => {
      expect(isDestructiveAction('deactivate')).toBe(true);
    });

    it('returns true for delete_soft', () => {
      expect(isDestructiveAction('delete_soft')).toBe(true);
    });

    it('returns true for delete_hard', () => {
      expect(isDestructiveAction('delete_hard')).toBe(true);
    });

    it('returns true for logout', () => {
      expect(isDestructiveAction('logout')).toBe(true);
    });

    it('returns true for remove', () => {
      expect(isDestructiveAction('remove')).toBe(true);
    });

    it('returns false for activate (non-destructive)', () => {
      expect(isDestructiveAction('activate')).toBe(false);
    });

    it('returns false for message (non-destructive)', () => {
      expect(isDestructiveAction('message')).toBe(false);
    });

    it('returns false for notify (non-destructive)', () => {
      expect(isDestructiveAction('notify')).toBe(false);
    });

    it('returns false for invite (non-destructive)', () => {
      expect(isDestructiveAction('invite')).toBe(false);
    });

    it('returns false for join (non-destructive)', () => {
      expect(isDestructiveAction('join')).toBe(false);
    });
  });

  describe('clearsSelectionAfterAction', () => {
    it('returns true for deactivate (destructive, changes user state)', () => {
      expect(clearsSelectionAfterAction('deactivate')).toBe(true);
    });

    it('returns true for delete_soft (destructive, changes user state)', () => {
      expect(clearsSelectionAfterAction('delete_soft')).toBe(true);
    });

    it('returns true for delete_hard (destructive, removes user)', () => {
      expect(clearsSelectionAfterAction('delete_hard')).toBe(true);
    });

    it('returns false for activate (user may want to take further actions)', () => {
      expect(clearsSelectionAfterAction('activate')).toBe(false);
    });

    it('returns false for message (user may want to take further actions)', () => {
      expect(clearsSelectionAfterAction('message')).toBe(false);
    });

    it('returns false for notify (user may want to take further actions)', () => {
      expect(clearsSelectionAfterAction('notify')).toBe(false);
    });

    it('returns false for invite (user may want to take further actions)', () => {
      expect(clearsSelectionAfterAction('invite')).toBe(false);
    });

    it('returns false for logout (session invalidation, user still exists)', () => {
      expect(clearsSelectionAfterAction('logout')).toBe(false);
    });
  });

  describe('DESTRUCTIVE_ACTIONS list', () => {
    it('contains exactly 5 actions', () => {
      expect(DESTRUCTIVE_ACTIONS).toHaveLength(5);
    });

    it('includes deactivate, delete_soft, delete_hard, logout, remove', () => {
      expect(DESTRUCTIVE_ACTIONS).toContain('deactivate');
      expect(DESTRUCTIVE_ACTIONS).toContain('delete_soft');
      expect(DESTRUCTIVE_ACTIONS).toContain('delete_hard');
      expect(DESTRUCTIVE_ACTIONS).toContain('logout');
      expect(DESTRUCTIVE_ACTIONS).toContain('remove');
    });

    it('does NOT include activate, message, notify, invite, join', () => {
      expect(DESTRUCTIVE_ACTIONS).not.toContain('activate');
      expect(DESTRUCTIVE_ACTIONS).not.toContain('message');
      expect(DESTRUCTIVE_ACTIONS).not.toContain('notify');
      expect(DESTRUCTIVE_ACTIONS).not.toContain('invite');
      expect(DESTRUCTIVE_ACTIONS).not.toContain('join');
    });
  });

  describe('SELECTION_CLEARING_ACTIONS list', () => {
    it('contains exactly 3 actions', () => {
      expect(SELECTION_CLEARING_ACTIONS).toHaveLength(3);
    });

    it('includes deactivate, delete_soft, delete_hard', () => {
      expect(SELECTION_CLEARING_ACTIONS).toContain('deactivate');
      expect(SELECTION_CLEARING_ACTIONS).toContain('delete_soft');
      expect(SELECTION_CLEARING_ACTIONS).toContain('delete_hard');
    });

    it('does NOT include non-state-changing actions', () => {
      expect(SELECTION_CLEARING_ACTIONS).not.toContain('message');
      expect(SELECTION_CLEARING_ACTIONS).not.toContain('notify');
      expect(SELECTION_CLEARING_ACTIONS).not.toContain('logout');
      expect(SELECTION_CLEARING_ACTIONS).not.toContain('activate');
    });
  });
});
