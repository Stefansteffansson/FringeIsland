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
  /**
   * FEAT-PC023 additive key: held groups stay listed and carry their label
   * ('active' | 'resting' | 'suspended' | the open lifecycle set).
   */
  status: string;
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
    status: (g.status as string) ?? 'active',
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
  /**
   * FEAT-PC015 additive key (ADR-U041 §5, Open Q5): the member group's raw
   * `group_type` — open set ('personal' | 'engagement' | 'system' | future
   * values). Optional for tolerance, treated as 'personal' when absent.
   */
  member_group_type?: string;
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
  /**
   * FEAT-PC015 additive key (ADR-U041 §5): active members whose group_type is
   * not 'system' — count copy and the Close affordance key on this (the
   * caretaker is never load-bearing). Optional for tolerance; falls back to
   * member_count when absent.
   */
  non_system_member_count?: number;
  viewer: GroupViewer;
  /** Present iff the contract decided the caller may see it. */
  members?: GroupMemberEntry[];
}

/**
 * FEAT-PC023 STORY-7: the suspended found-but-that's-it payload — below the
 * admin plane the contract returns exactly `{id, name, status}` for a
 * suspended group. The Surface branches on the payload shape (the absent
 * `viewer` key), never on a client-side guess: an admin's full payload for a
 * suspended group renders the normal surface.
 */
export interface GroupDetailShell {
  id: string;
  name: string;
  status: string;
  /** Never present — the discriminant that keeps the union narrowable (a full
   *  GroupDetail is otherwise structurally assignable to the shell). */
  viewer?: undefined;
}

export type GroupDetailPayload = GroupDetail | GroupDetailShell;

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

/** GRP-4/GRP-5: the visibility-honest detail read. FEAT-PC023: a suspended
 *  group below the admin plane resolves to the minimal shell payload. */
export async function fetchGroupDetail(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupDetailPayload> {
  const { data, error } = await supabase.rpc('get_group_detail', { p_group_id: groupId });
  if (error) throw error;
  return data as GroupDetailPayload;
}

/**
 * FEAT-H038 STORY-6 — the member-plane Rest/Wake transports (FEAT-PC023
 * `rest_group()` / `wake_group()`). Both self-gate in the substrate (FIM-only,
 * the `rest_group` permission key, P0002 no-leak, the no-path-out-of-suspended
 * rule); these wrappers only shape the calls and rethrow the SQLSTATE-carrying
 * errors for the routes to map.
 */
export async function restGroup(supabase: SupabaseClient, groupId: string): Promise<void> {
  const { error } = await supabase.rpc('rest_group', { p_group_id: groupId });
  if (error) throw error;
}

export async function wakeGroup(supabase: SupabaseClient, groupId: string): Promise<void> {
  const { error } = await supabase.rpc('wake_group', { p_group_id: groupId });
  if (error) throw error;
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
  /**
   * RD-A FEAT-PC027 STORY-1: the source template version this copy was taken
   * from. Null means honestly unknown — a pre-stamp row whose grant set matched
   * no version unambiguously (RD-10), or a custom role with no provenance at
   * all. The surface renders "version unknown"; it never derives a version the
   * contract declined to assert.
   */
  created_from_version_number: number | null;
  /** RD-A: the copied-date. Always honest — set by every instantiation door. */
  created_at: string;
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
 * The foundational role templates — platform vocabulary, read through the
 * `get_role_templates()` contract. The BFF composes this into the fabric
 * response so the add-from-template picker needs no extra round-trip; a
 * sibling Surface calls the same contract rather than reproducing the table
 * name and column list.
 *
 * Relocated from a direct `.from('role_templates')` read by COR-B W4 (audit II
 * AC2-4) — the last such read in this lib. The contract is SECURITY INVOKER,
 * so the `auth_read_role_templates` policy (qual TRUE for authenticated) is
 * still the enforcement point; nothing about who may read what changed.
 */
export async function fetchRoleTemplates(
  supabase: SupabaseClient,
): Promise<RoleTemplateOption[]> {
  const { data, error } = await supabase.rpc('get_role_templates');
  if (error) throw error;
  // supabase-js types `.rpc()` loosely; narrow through `unknown` so
  // `next build` type-checks the shape the contract guarantees.
  return (data ?? []) as unknown as RoleTemplateOption[];
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

/** GRP-8 payload + the caller's contract-resolved actor id (FEAT-H017). */
export interface MyPermissionsPayload {
  permissions: string[];
  /** The caller's own (personal) group id — already resolved for the actor
   *  call; FEAT-H017's nominate pick-list excludes the caller with it. */
  member_group_id: string;
}

/**
 * GRP-8: the caller's effective permissions in a group context — the existing
 * published `get_user_permissions(acting, context)` with the caller's personal
 * group as the actor (P-O1). No new contract (FEAT-PC011 STORY-5).
 */
export async function fetchMyPermissions(
  supabase: SupabaseClient,
  groupId: string,
): Promise<MyPermissionsPayload> {
  const { data: personalGroupId, error: pgError } = await supabase.rpc(
    'get_current_personal_group_id',
  );
  if (pgError) throw pgError;
  const { data, error } = await supabase.rpc('get_user_permissions', {
    p_acting_group_id: personalGroupId,
    p_context_group_id: groupId,
  });
  if (error) throw error;
  return {
    permissions: (data ?? []) as string[],
    member_group_id: personalGroupId as string,
  };
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
