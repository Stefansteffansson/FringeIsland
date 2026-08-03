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

export type AdminUsersPage = {
  users: AdminUserRow[];
  next_cursor: { name: string; id: string } | null;
  generated_at: string;
};

// The Hub-fixed page size (FEAT-H039; the contract caps at 200).
const PAGE_SIZE = 50;

export async function fetchAdminUsersPage(
  client: SupabaseClient,
  opts: {
    filter: string;
    search?: string | null;
    afterName?: string | null;
    afterId?: string | null;
  },
): Promise<{ page: AdminUsersPage | null; refused: boolean }> {
  // FEAT-PC024 (20260803210000): one bounded page — composite keyset, server
  // search. The tranche-1 census-walking shim is retired; this is the only
  // shape.
  const args: Record<string, unknown> = { p_filter: opts.filter, p_limit: PAGE_SIZE };
  if (opts.search != null && opts.search !== '') args.p_search = opts.search;
  if (opts.afterName != null && opts.afterId != null) {
    args.p_after_name = opts.afterName;
    args.p_after_id = opts.afterId;
  }
  const { data, error } = await client.rpc('admin_get_users', args);
  if (error) {
    if (error.code === '42501') return { page: null, refused: true };
    return throwTyped(error);
  }
  return { page: data as AdminUsersPage, refused: false };
}

export type BulkAction = 'suspend' | 'reactivate' | 'force-logout';
export type BulkRowOutcome = { id: string; ok: boolean; error?: string };

/**
 * RB-2 bulk mechanics, verbatim: the BFF loops the proven single contracts —
 * SERIAL in the given order (FOR UPDATE calm, deterministic outcomes), a
 * refusal never aborts the loop (partial success is honest, per-row), and
 * force-logout calls the array contract ONE id per call so its per-call audit
 * row becomes a per-member row (the batch shape at 20260801190000:432-434 is
 * deliberately unused). 42501 propagates whole-call — the caller is not an
 * admin, and the route existence-hides.
 */
export async function bulkAdminUserAction(
  client: SupabaseClient,
  action: BulkAction,
  userIds: string[],
): Promise<BulkRowOutcome[]> {
  const outcomes: BulkRowOutcome[] = [];
  for (const id of userIds) {
    try {
      if (action === 'suspend') await suspendAdminUser(client, id);
      else if (action === 'reactivate') await reactivateAdminUser(client, id);
      else await forceLogoutAdminUser(client, id);
      outcomes.push({ id, ok: true });
    } catch (err) {
      if (err instanceof AdminUsersError && err.code !== '42501') {
        outcomes.push({ id, ok: false, error: err.message });
        continue;
      }
      throw err;
    }
  }
  return outcomes;
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
