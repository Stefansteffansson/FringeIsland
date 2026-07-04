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
