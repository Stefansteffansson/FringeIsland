/**
 * GRP-4 read path — the member's group list, via the platform contract
 * `get_member_groups()` (ADR-U038 F2 — the 4-step composition lives in the
 * substrate, not in Hub code; a sibling Surface calls the same RPC). The RPC
 * self-scopes by the caller's personal group and returns each active engagement
 * group with its live active-member count. Run by the /api/groups route and
 * exercised directly by the integration tests.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface GroupSummary {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  is_public: boolean;
  created_at: string;
  member_count: number;
}

export async function fetchMemberGroups(supabase: SupabaseClient): Promise<GroupSummary[]> {
  const { data, error } = await supabase.rpc('get_member_groups');
  if (error) throw error;

  return (data ?? []).map((g: Record<string, unknown>) => ({
    id: g.id as string,
    name: g.name as string,
    description: (g.description as string | null) ?? null,
    label: (g.label as string | null) ?? null,
    is_public: g.is_public as boolean,
    created_at: g.created_at as string,
    member_count: Number(g.member_count),
  }));
}

/**
 * FEAT-H013 — the Cycle G-A contracts (FEAT-PC010). All three self-gate in the
 * substrate (FIM-only, permission keys, P0002 no-existence-leak); these
 * wrappers only shape the calls and rethrow the SQLSTATE-carrying errors for
 * the routes to map.
 */

export interface GroupMemberEntry {
  /** Resolves from the member's (personal) group name — never full_name. */
  display_name: string;
  joined_at: string;
  /** FEAT-PC011 additive keys: the assignment surface's opaque handle + role chips. */
  member_group_id: string;
  roles: string[];
  /**
   * FEAT-PC013 additive key: 'active' | 'paused'. Paused rows appear only for
   * management-permission viewers (the contract decided — Open Q3); optional
   * for tolerance, treated as 'active' when absent.
   */
  membership_status?: string;
}

export interface GroupViewer {
  is_member: boolean;
  joined_at: string | null;
  /** The capability flag the Surface gates its edit affordances on. */
  can_manage_settings: boolean;
}

export interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  status: string;
  is_public: boolean;
  show_member_list: boolean;
  created_at: string;
  member_count: number;
  viewer: GroupViewer;
  /** Present iff the contract decided the caller may see it. */
  members?: GroupMemberEntry[];
}

export interface CreateGroupInput {
  name: string;
  description?: string | null;
  label?: string | null;
  is_public?: boolean;
  show_member_list?: boolean;
}

export interface UpdateGroupSettingsInput {
  name?: string;
  description?: string;
  label?: string;
  is_public?: boolean;
  show_member_list?: boolean;
}

/** GRP-1: atomic stewarded bootstrap; returns the new group's id. */
export async function createEngagementGroup(
  supabase: SupabaseClient,
  input: CreateGroupInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_engagement_group', {
    p_name: input.name,
    p_description: input.description ?? null,
    p_label: input.label ?? null,
    p_is_public: input.is_public ?? false,
    p_show_member_list: input.show_member_list ?? true,
  });
  if (error) throw error;
  return data as string;
}

/** GRP-4/GRP-5: the visibility-honest detail read. */
export async function fetchGroupDetail(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupDetail> {
  const { data, error } = await supabase.rpc('get_group_detail', { p_group_id: groupId });
  if (error) throw error;
  return data as GroupDetail;
}

/**
 * FEAT-H014 — the Cycle G-B role contracts (FEAT-PC011). All self-gate in the
 * substrate (permission keys, two anti-escalation walls, P0002 no-leak, the
 * last-Steward/last-DeusEx invariants); these wrappers only shape the calls
 * and rethrow the SQLSTATE-carrying errors for the routes to map.
 */

export interface RoleEntry {
  id: string;
  name: string;
  description: string | null;
  /** null = custom role; set = template-derived instance. */
  created_from_role_template_id: string | null;
  holder_count: number;
  /** Granted permission names. */
  permissions: string[];
}

export interface RolesViewer {
  can_manage_roles: boolean;
  can_assign_roles: boolean;
  can_remove_roles: boolean;
}

export interface RolesFabric {
  group_id: string;
  roles: RoleEntry[];
  viewer: RolesViewer;
  /** The permission catalog riding the payload — the checklist's source. */
  available_permissions: Array<{ name: string; category: string }>;
}

export interface RoleTemplateOption {
  id: string;
  name: string;
  description: string | null;
}

/**
 * The foundational role templates — platform vocabulary, RLS-readable by any
 * authenticated client (`auth_read_role_templates`, qual TRUE). The BFF
 * composes this into the fabric response so the add-from-template picker
 * needs no extra round-trip; a sibling Surface reads the same table.
 */
export async function fetchRoleTemplates(
  supabase: SupabaseClient,
): Promise<RoleTemplateOption[]> {
  const { data, error } = await supabase
    .from('role_templates')
    .select('id, name, description')
    .order('name');
  if (error) throw error;
  return (data ?? []) as RoleTemplateOption[];
}

export interface CreateGroupRoleInput {
  name: string;
  description?: string | null;
  /** Template path: grants are trigger-copied; `permissions` must be absent. */
  role_template_id?: string | null;
  /** Custom path: explicit grants, definition-time anti-escalation applies. */
  permissions?: string[] | null;
}

/** GRP-6/7 read: the group's role fabric for a permitted viewer. */
export async function fetchGroupRoles(
  supabase: SupabaseClient,
  groupId: string,
): Promise<RolesFabric> {
  const { data, error } = await supabase.rpc('get_group_roles', { p_group_id: groupId });
  if (error) throw error;
  return data as RolesFabric;
}

/** GRP-6: template instantiation or custom definition; returns the new role's id. */
export async function createGroupRole(
  supabase: SupabaseClient,
  groupId: string,
  input: CreateGroupRoleInput,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_group_role', {
    p_group_id: groupId,
    p_name: input.name,
    p_description: input.description ?? null,
    p_role_template_id: input.role_template_id ?? null,
    p_permissions: input.permissions ?? null,
  });
  if (error) throw error;
  return data as string;
}

/** GRP-6: partial rename/describe; returns the fresh role entry. */
export async function updateGroupRole(
  supabase: SupabaseClient,
  roleId: string,
  input: { name?: string; description?: string },
): Promise<RoleEntry> {
  const { data, error } = await supabase.rpc('update_group_role', {
    p_group_role_id: roleId,
    p_name: input.name ?? null,
    p_description: input.description ?? null,
  });
  if (error) throw error;
  return data as RoleEntry;
}

/** GRP-6: flip one grant (anti-escalation on grant); returns the fresh entry. */
export async function setGroupRolePermission(
  supabase: SupabaseClient,
  roleId: string,
  permissionName: string,
  granted: boolean,
): Promise<RoleEntry> {
  const { data, error } = await supabase.rpc('set_group_role_permission', {
    p_group_role_id: roleId,
    p_permission_name: permissionName,
    p_granted: granted,
  });
  if (error) throw error;
  return data as RoleEntry;
}

/** GRP-6: delete a custom, unheld role (the contract refuses otherwise). */
export async function deleteGroupRole(supabase: SupabaseClient, roleId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_group_role', { p_group_role_id: roleId });
  if (error) throw error;
}

/** GRP-7: assign through the anti-escalation wall; notification rides substrate-side. */
export async function assignMemberRole(
  supabase: SupabaseClient,
  groupId: string,
  memberGroupId: string,
  roleId: string,
): Promise<void> {
  const { error } = await supabase.rpc('assign_member_role', {
    p_group_id: groupId,
    p_member_group_id: memberGroupId,
    p_group_role_id: roleId,
  });
  if (error) throw error;
}

/** GRP-7: remove a binding, riding the last-Steward/last-DeusEx invariants. */
export async function removeMemberRole(
  supabase: SupabaseClient,
  groupId: string,
  memberGroupId: string,
  roleId: string,
): Promise<void> {
  const { error } = await supabase.rpc('remove_member_role', {
    p_group_id: groupId,
    p_member_group_id: memberGroupId,
    p_group_role_id: roleId,
  });
  if (error) throw error;
}

/**
 * FEAT-H016 — the Cycle G-D membership lifecycle contracts (FEAT-PC013). All
 * self-gate in the substrate (three independent permission keys, the
 * last-active-Steward guards, P0002 no-leak, the honest G-E refusals); these
 * wrappers only shape the calls and rethrow the SQLSTATE-carrying errors for
 * the routes to map.
 */

/** MEM-4: pause a member's participation (active→paused; roles preserved). */
export async function pauseMember(
  supabase: SupabaseClient,
  groupId: string,
  memberGroupId: string,
): Promise<void> {
  const { error } = await supabase.rpc('pause_member', {
    p_group_id: groupId,
    p_member_group_id: memberGroupId,
  });
  if (error) throw error;
}

/** MEM-4: reactivate a paused member (paused→active; preserved roles resume). */
export async function activateMember(
  supabase: SupabaseClient,
  groupId: string,
  memberGroupId: string,
): Promise<void> {
  const { error } = await supabase.rpc('activate_member', {
    p_group_id: groupId,
    p_member_group_id: memberGroupId,
  });
  if (error) throw error;
}

/** MEM-5: remove a member — the composed cascade lives in the contract. */
export async function removeGroupMember(
  supabase: SupabaseClient,
  groupId: string,
  memberGroupId: string,
): Promise<void> {
  const { error } = await supabase.rpc('remove_member', {
    p_group_id: groupId,
    p_member_group_id: memberGroupId,
  });
  if (error) throw error;
}

export interface LeaveGroupResult {
  group_id: string;
  group_name: string;
}

/** MEM-6: the caller's own regular exit (sole-Steward/last-member refused). */
export async function leaveGroup(
  supabase: SupabaseClient,
  groupId: string,
): Promise<LeaveGroupResult> {
  const { data, error } = await supabase.rpc('leave_group', { p_group_id: groupId });
  if (error) throw error;
  return data as LeaveGroupResult;
}

/**
 * GRP-8: the caller's effective permissions in a group context — the existing
 * published `get_user_permissions(acting, context)` with the caller's personal
 * group as the actor (P-O1). No new contract (FEAT-PC011 STORY-5).
 */
export async function fetchMyPermissions(
  supabase: SupabaseClient,
  groupId: string,
): Promise<string[]> {
  const { data: personalGroupId, error: pgError } = await supabase.rpc(
    'get_current_personal_group_id',
  );
  if (pgError) throw pgError;
  const { data, error } = await supabase.rpc('get_user_permissions', {
    p_acting_group_id: personalGroupId,
    p_context_group_id: groupId,
  });
  if (error) throw error;
  return (data ?? []) as string[];
}

/** GRP-2/GRP-3: partial update — omitted fields stay unchanged. */
export async function updateGroupSettings(
  supabase: SupabaseClient,
  groupId: string,
  input: UpdateGroupSettingsInput,
): Promise<GroupDetail> {
  const { data, error } = await supabase.rpc('update_group_settings', {
    p_group_id: groupId,
    p_name: input.name ?? null,
    p_description: input.description ?? null,
    p_label: input.label ?? null,
    p_is_public: input.is_public ?? null,
    p_show_member_list: input.show_member_list ?? null,
  });
  if (error) throw error;
  return data as GroupDetail;
}
