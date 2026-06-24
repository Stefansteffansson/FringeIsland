/**
 * User Filter Logic — Pure functions for B-ADMIN-002 (revised)
 *
 * Controls which users are visible in the admin Users panel
 * and what the stat card displays.
 */

export interface AdminUser {
  id: string;
  personal_group_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  is_decommissioned: boolean;
  created_at: string;
}

export interface UserFilters {
  showActive: boolean;
  showInactive: boolean;
  showDecommissioned: boolean;
}

export const DEFAULT_USER_FILTERS: UserFilters = {
  showActive: true,
  showInactive: true,
  showDecommissioned: false,
};

/**
 * Filter users based on current toggle state.
 * Default: active + inactive visible, decommissioned hidden.
 */
export function filterUsers(users: AdminUser[], filters: UserFilters): AdminUser[] {
  return users.filter((user) => {
    if (user.is_decommissioned) return filters.showDecommissioned;
    if (!user.is_active) return filters.showInactive;
    return filters.showActive;
  });
}

/**
 * Count of visible users based on filter state.
 * Used for the stat card value.
 */
export function computeUserCount(users: AdminUser[], filters: UserFilters): number {
  return filterUsers(users, filters).length;
}

/**
 * Stat card label — always "Users" (not "Active Users").
 */
export function getUserStatLabel(): string {
  return 'Users';
}

/**
 * Build PostgREST .or() filter string from the three status toggles.
 * Returns null if all three are ON (no filter needed) or empty string if all OFF.
 */
export function buildStatusFilterString(filters: UserFilters): string | null {
  if (filters.showActive && filters.showInactive && filters.showDecommissioned) return null;

  const conditions: string[] = [];
  if (filters.showActive) conditions.push('and(is_active.eq.true,is_decommissioned.eq.false)');
  if (filters.showInactive) conditions.push('and(is_active.eq.false,is_decommissioned.eq.false)');
  if (filters.showDecommissioned) conditions.push('is_decommissioned.eq.true');

  if (conditions.length === 0) return '';
  return conditions.join(',');
}
