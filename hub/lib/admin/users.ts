import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H036 — outer-ring wrapper for the FEAT-PC021 member administration
 * contracts (both gates). Server-side only; the client is injected, never
 * constructed ('import type' discipline). Authorization is entirely the
 * platform's (is_platform_admin inside each RPC) — a 42501 surfaces as
 * `refused` on the reads and as a typed error on the mutations; the BFF maps
 * both to the admin-plane 404 shape (ADR-U038: the route never re-decides).
 * State refusals (P0001) pass through with the platform's message VERBATIM —
 * including the last-admin floor trigger's.
 */

export type AdminUserRow = {
  id: string;
  display_name: string;
  email: string | null;
  account_state: string;
  is_platform_admin: boolean;
  created_at: string;
};

export type AdminUserMembership = {
  group_id: string;
  group_name: string;
  status: string;
  removal_scenario: string;
};

export type AdminUserDetail = AdminUserRow & {
  deactivation_origin: string | null;
  memberships: AdminUserMembership[];
};

/** A refusal the route maps to an HTTP status; message passes through verbatim. */
export class AdminUsersError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const throwTyped = (error: { code?: string; message?: string }): never => {
  throw new AdminUsersError(error.code ?? 'unknown', error.message ?? 'unknown error');
};

export async function fetchAdminUsers(
  client: SupabaseClient,
  filter: string,
): Promise<{ users: AdminUserRow[] | null; refused: boolean }> {
  // PC024 transition shim (FEAT-H039 tranche 1): tolerant of BOTH live
  // contract shapes across the 20260803210000 apply — the pre-PC024 jsonb
  // array, and the PC024 keyed page {users, next_cursor, generated_at},
  // walked to exhaustion so the surface stays byte-identical. The FIRST call
  // must stay old-signature-compatible (p_filter only) or the pre-apply
  // function refuses it. Replaced by true paging in tranche 2 (TASK-ADME-02).
  const all: AdminUserRow[] = [];
  let cursor: { name: string; id: string } | null = null;
  let hops = 0;
  do {
    const args: Record<string, unknown> = { p_filter: filter };
    if (cursor) {
      args.p_limit = 200;
      args.p_after_name = cursor.name;
      args.p_after_id = cursor.id;
    }
    const { data, error } = await client.rpc('admin_get_users', args);
    if (error) {
      if (error.code === '42501') return { users: null, refused: true };
      return throwTyped(error);
    }
    if (Array.isArray(data)) {
      // pre-PC024 array contract — the whole census in one response
      return { users: data as AdminUserRow[], refused: false };
    }
    const page = data as {
      users: AdminUserRow[] | null;
      next_cursor: { name: string; id: string } | null;
    };
    all.push(...(page.users ?? []));
    cursor = page.next_cursor ?? null;
    hops += 1;
  } while (cursor !== null && hops < 60);
  return { users: all, refused: false };
}

export async function fetchAdminUserDetail(
  client: SupabaseClient,
  userId: string,
): Promise<{ detail: AdminUserDetail | null; refused: boolean; notFound: boolean }> {
  const { data, error } = await client.rpc('admin_get_user_detail', { p_user_id: userId });
  if (error) {
    if (error.code === '42501') return { detail: null, refused: true, notFound: false };
    if (error.code === 'P0002') return { detail: null, refused: false, notFound: true };
    return throwTyped(error);
  }
  return { detail: data as AdminUserDetail, refused: false, notFound: false };
}

/** The caller's own public users.id — the BFF's viewer_is_self shaping input. */
export async function fetchOwnUserId(client: SupabaseClient): Promise<string | null> {
  const { data, error } = await client.rpc('get_current_user_profile_id');
  if (error) return null;
  return (data as string | null) ?? null;
}

export async function suspendAdminUser(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.rpc('admin_update_user_status', {
    target_user_id: userId,
    new_is_active: false,
  });
  if (error) throwTyped(error);
}

export async function reactivateAdminUser(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.rpc('admin_update_user_status', {
    target_user_id: userId,
    new_is_active: true,
  });
  if (error) throwTyped(error);
}

export async function decommissionAdminUser(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.rpc('admin_decommission_user', { target_user_id: userId });
  if (error) throwTyped(error);
}

export async function forceLogoutAdminUser(
  client: SupabaseClient,
  userId: string,
): Promise<{ count: number }> {
  const { data, error } = await client.rpc('admin_force_logout', { target_user_ids: [userId] });
  if (error) throwTyped(error);
  return { count: ((data as { count?: number } | null)?.count as number) ?? 0 };
}

export async function hardDeleteAdminUser(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.rpc('admin_hard_delete_user', { target_user_id: userId });
  if (error) throwTyped(error);
}

export type ExitResult = {
  groups_exited: number;
  group_details: { group_id: string; group_name: string; scenario: string }[];
};

export async function platformExitAdminUser(
  client: SupabaseClient,
  userId: string,
): Promise<ExitResult> {
  const { data, error } = await client.rpc('admin_exit_user_from_platform', {
    p_target_user_id: userId,
  });
  if (error) throwTyped(error);
  const body = data as ExitResult;
  return { groups_exited: body.groups_exited, group_details: body.group_details };
}

export type RemovalResult = { group_id: string; group_name: string; scenario: string };

export async function removeAdminUserFromGroup(
  client: SupabaseClient,
  userId: string,
  groupId: string,
): Promise<RemovalResult> {
  const { data, error } = await client.rpc('admin_remove_member_from_group', {
    p_group_id: groupId,
    p_target_user_id: userId,
  });
  if (error) throwTyped(error);
  const body = data as RemovalResult;
  return { group_id: body.group_id, group_name: body.group_name, scenario: body.scenario };
}

export async function grantPlatformAdmin(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.rpc('admin_grant_platform_admin', { p_target_user_id: userId });
  if (error) throwTyped(error);
}

export async function revokePlatformAdmin(client: SupabaseClient, userId: string): Promise<void> {
  const { error } = await client.rpc('admin_revoke_platform_admin', { p_target_user_id: userId });
  if (error) throwTyped(error);
}
