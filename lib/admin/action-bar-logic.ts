/**
 * Action Bar Logic — Pure functions for B-ADMIN-014
 *
 * Controls action bar visibility, context-sensitive disabling,
 * destructive action identification, and selection-clearing behavior.
 */

import type { AdminUser } from './user-filter';

export type ActionName =
  | 'message'
  | 'notify'
  | 'deactivate'
  | 'activate'
  | 'delete_soft'
  | 'delete_hard'
  | 'logout'
  | 'invite'
  | 'join'
  | 'remove';

export interface ActionState {
  disabled: boolean;
  reason?: string;
}

export type ActionStates = Record<ActionName, ActionState>;

/** Action bar is visible when 1+ users are selected. */
export function isActionBarVisible(selectedCount: number): boolean {
  return selectedCount > 0;
}

/**
 * Compute which actions are disabled based on the selected users' state.
 *
 * Rules from B-ADMIN-014:
 * - "Activate" disabled if all selected are already active
 * - "Activate" disabled if any selected user is decommissioned
 * - "Deactivate" disabled if all selected are already inactive
 * - "Delete (soft)" disabled if all selected are already decommissioned
 * - "Remove (from group)" disabled if selected users share no common engagement groups
 */
export function computeActionStates(
  selectedUsers: AdminUser[],
  commonGroupCount: number = 0,
): ActionStates {
  const allActive = selectedUsers.every((u) => u.is_active && !u.is_decommissioned);
  const allInactive = selectedUsers.every((u) => !u.is_active && !u.is_decommissioned);
  const allDecommissioned = selectedUsers.every((u) => u.is_decommissioned);
  const anyDecommissioned = selectedUsers.some((u) => u.is_decommissioned);

  return {
    message: { disabled: false },
    notify: { disabled: false },
    deactivate: {
      disabled: allInactive || allDecommissioned,
      reason: allDecommissioned
        ? 'All selected users are decommissioned'
        : allInactive
          ? 'All selected users are already inactive'
          : undefined,
    },
    activate: {
      disabled: allActive || anyDecommissioned,
      reason: anyDecommissioned
        ? 'Cannot activate decommissioned users'
        : allActive
          ? 'All selected users are already active'
          : undefined,
    },
    delete_soft: {
      disabled: allDecommissioned,
      reason: allDecommissioned
        ? 'All selected users are already decommissioned'
        : undefined,
    },
    delete_hard: { disabled: false },
    logout: { disabled: false },
    invite: { disabled: false },
    join: { disabled: false },
    remove: {
      disabled: commonGroupCount === 0,
      reason: commonGroupCount === 0
        ? 'Selected users share no common groups'
        : undefined,
    },
  };
}

/** Action categories for grouping in the UI. */
export const ACTION_CATEGORIES: Record<string, ActionName[]> = {
  communication: ['message', 'notify'],
  account: ['deactivate', 'activate', 'delete_soft', 'delete_hard', 'logout'],
  group: ['invite', 'join', 'remove'],
};

/** Actions that require ConfirmModal before execution. */
export const DESTRUCTIVE_ACTIONS: ActionName[] = [
  'deactivate',
  'delete_soft',
  'delete_hard',
  'logout',
  'remove',
];

/** Actions that clear the selection after execution (user state changes). */
export const SELECTION_CLEARING_ACTIONS: ActionName[] = [
  'deactivate',
  'delete_soft',
  'delete_hard',
];

/** Check if an action requires ConfirmModal. */
export function isDestructiveAction(action: ActionName): boolean {
  return DESTRUCTIVE_ACTIONS.includes(action);
}

/** Check if an action should clear the selection after execution. */
export function clearsSelectionAfterAction(action: ActionName): boolean {
  return SELECTION_CLEARING_ACTIONS.includes(action);
}
