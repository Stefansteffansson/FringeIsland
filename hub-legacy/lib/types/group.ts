// Group-related TypeScript types for FringeIsland (D15 Universal Group Pattern)

/** Full group data from the `groups` table */
export interface GroupData {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  is_public: boolean;
  show_member_list: boolean;
  created_at: string;
  created_by_group_id: string | null;
}

/** Group summary for list displays */
export interface Group {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  is_public: boolean;
  created_at: string;
  member_count?: number;
}

/** Group member with role information */
export interface Member {
  id: string;
  member_group_id: string;
  full_name: string;
  avatar_url: string | null;
  roles: string[];
  roleData: RoleData[];
  added_at: string;
}

/** Role assignment data (for role management UI) */
export interface RoleData {
  user_group_role_id: string;
  role_id: string;
  role_name: string;
}

/** Minimal role info for current user display */
export interface UserRole {
  role_name: string;
}

/** Group role (simple — for dropdowns/selection) */
export interface GroupRole {
  id: string;
  name: string;
}

/** Group role (full — for role management section) */
export interface GroupRoleFull {
  id: string;
  name: string;
  description: string | null;
  created_from_role_template_id: string | null;
  permissionIds: string[];
  permissionNames: string[];
  memberCount: number;
}

/** Permission definition */
export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

/** Pending invitation */
export interface Invitation {
  id: string;
  group_id: string;
  group_name: string;
  invited_by_name: string;
  invited_at: string;
  group_label: string | null;
}
