import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H035 — outer-ring wrapper for the FEAT-PC020 group administration
 * contracts. Server-side only; the client is injected, never constructed
 * ('import type' discipline). Authorization is entirely the platform's
 * (is_platform_admin inside each RPC) — a 42501 surfaces as `refused` and
 * the BFF maps it to the admin-plane 404 shape (ADR-U038: the route never
 * re-decides).
 */

export type AdminGroupRow = {
  id: string;
  name: string;
  group_type: string;
  status: string;
  member_count: number;
  non_system_member_count: number;
  deusex_stewarded: boolean;
  created_at: string;
};

export type AdminGroupMember = {
  personal_group_id: string;
  display_name: string;
  /** FEAT-H041 (PC026 members re-issue): the W-4 echo key — null only on a
   *  broken users row (platform LEFT JOIN; sight over act). */
  email: string | null;
  /** FEAT-H041 (PC026 members re-issue): the admin_remove_member_from_group
   *  key (public.users.id) — the Hub cannot resolve it API-first. */
  user_id: string | null;
  is_steward: boolean;
};

export type AdminGroupDetail = {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  group_type: string;
  status: string;
  is_public: boolean;
  avatar_url: string | null;
  member_count: number;
  non_system_member_count: number;
  deusex_stewarded: boolean;
  stewards: { display_name: string; personal_group_id: string }[];
  members: AdminGroupMember[];
  created_at: string;
  updated_at: string;
};

/** A refusal the route maps to an HTTP status; message passes through verbatim. */
export class AdminGroupsError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const throwTyped = (error: { code?: string; message?: string }): never => {
  throw new AdminGroupsError(error.code ?? 'unknown', error.message ?? 'unknown error');
};

export async function fetchAdminGroups(
  client: SupabaseClient,
  filter: string,
): Promise<{ groups: AdminGroupRow[] | null; refused: boolean }> {
  const { data, error } = await client.rpc('admin_get_groups', { p_filter: filter });
  if (error) {
    if (error.code === '42501') return { groups: null, refused: true };
    return throwTyped(error);
  }
  return { groups: data as AdminGroupRow[], refused: false };
}

export async function fetchAdminGroupDetail(
  client: SupabaseClient,
  groupId: string,
): Promise<{ detail: AdminGroupDetail | null; refused: boolean; notFound: boolean }> {
  const { data, error } = await client.rpc('admin_get_group_detail', { p_group_id: groupId });
  if (error) {
    if (error.code === '42501') return { detail: null, refused: true, notFound: false };
    if (error.code === 'P0002') return { detail: null, refused: false, notFound: true };
    return throwTyped(error);
  }
  return { detail: data as AdminGroupDetail, refused: false, notFound: false };
}

export async function suspendAdminGroup(client: SupabaseClient, groupId: string): Promise<void> {
  const { error } = await client.rpc('admin_suspend_group', { p_group_id: groupId });
  if (error) throwTyped(error);
}

/** FEAT-H038 STORY-6 (FEAT-PC023): the admin rest ceremony — active → resting,
 *  audited substrate-side (`group.rest`). */
export async function restAdminGroup(client: SupabaseClient, groupId: string): Promise<void> {
  const { error } = await client.rpc('admin_rest_group', { p_group_id: groupId });
  if (error) throwTyped(error);
}

/** FEAT-H038 STORY-6 (FEAT-PC023): the admin wake ceremony — resting → active
 *  only (suspended → active stays admin_reactivate_group's), audited
 *  substrate-side (`group.wake`). */
export async function wakeAdminGroup(client: SupabaseClient, groupId: string): Promise<void> {
  const { error } = await client.rpc('admin_wake_group', { p_group_id: groupId });
  if (error) throwTyped(error);
}

export async function reactivateAdminGroup(client: SupabaseClient, groupId: string): Promise<void> {
  const { error } = await client.rpc('admin_reactivate_group', { p_group_id: groupId });
  if (error) throwTyped(error);
}

export async function reassignAdminGroupStewardship(
  client: SupabaseClient,
  groupId: string,
  newStewardGroupId: string,
): Promise<void> {
  const { error } = await client.rpc('admin_reassign_group_stewardship', {
    p_group_id: groupId,
    p_new_steward_group_id: newStewardGroupId,
  });
  if (error) throwTyped(error);
}
