/**
 * User Filter Logic — Pure functions for B-ADMIN-002 (revised)
 *
 * Controls which users are visible in the admin Users panel
 * and what the stat card displays.
 */

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  is_decommissioned: boolean;
  created_at: string;
}

export interface UserFilterOptions {
  showDecommissioned: boolean;
}

/**
 * Filter users based on current toggle state.
 * Default: active + inactive visible, decommissioned hidden.
 */
export function filterUsers(users: AdminUser[], options: UserFilterOptions): AdminUser[] {
  return users.filter((user) => {
    if (!options.showDecommissioned && user.is_decommissioned) return false;
    return true;
  });
}

/**
 * Count of visible users based on filter state.
 * Used for the stat card value.
 */
export function computeUserCount(users: AdminUser[], options: UserFilterOptions): number {
  return filterUsers(users, options).length;
}

/**
 * Stat card label — always "Users" (not "Active Users").
 */
export function getUserStatLabel(): string {
  return 'Users';
}
