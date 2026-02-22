/**
 * Server-side admin users query using service_role.
 *
 * Bypasses RLS entirely — admin authorization is checked ONCE at the
 * function level by verifying the caller is a DeusEx member.
 *
 * Used by:
 *  - /api/admin/users route (server-side)
 *  - Integration tests (direct import)
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface AdminUsersParams {
  callerUserId: string;
  page: number;
  pageSize: number;
  search?: string;
  showActive?: boolean;
  showInactive?: boolean;
  showDecommissioned?: boolean;
}

export interface AdminUserRow {
  id: string;
  personal_group_id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  is_decommissioned: boolean;
  created_at: string;
}

export interface AdminUsersResult {
  data: AdminUserRow[] | null;
  count: number | null;
  error: string | null;
}

export interface AdminUserIdsResult {
  ids: string[] | null;
  error: string | null;
}

/**
 * Verify the caller is a DeusEx member (has the Deusex role in the DeusEx system group).
 */
async function isDeusExMember(serviceClient: any, userId: string): Promise<boolean> {
  const { data } = await serviceClient.rpc('has_permission', {
    p_acting_group_id: userId,
    p_context_group_id: '00000000-0000-0000-0000-000000000000',
    p_permission_name: 'manage_all_groups',
  });

  return data === true;
}

/**
 * Build PostgREST .or() filter string from the three status toggles.
 * Returns null if all three are ON (no filter needed) or empty string if all OFF.
 */
function buildStatusFilter(showActive: boolean, showInactive: boolean, showDecommissioned: boolean): string | null {
  // All ON → no filter needed
  if (showActive && showInactive && showDecommissioned) return null;

  const conditions: string[] = [];
  if (showActive) conditions.push('and(is_active.eq.true,is_decommissioned.eq.false)');
  if (showInactive) conditions.push('and(is_active.eq.false,is_decommissioned.eq.false)');
  if (showDecommissioned) conditions.push('is_decommissioned.eq.true');

  // All OFF → return empty (caller should return empty result)
  if (conditions.length === 0) return '';

  return conditions.join(',');
}

/**
 * Fetch paginated admin users using service_role (bypasses RLS).
 * Validates admin authorization before executing the query.
 */
export async function queryAdminUsers(params: AdminUsersParams): Promise<AdminUsersResult> {
  const {
    callerUserId,
    page,
    pageSize,
    search,
    showActive = true,
    showInactive = true,
    showDecommissioned = false,
  } = params;

  const serviceClient = getServiceClient();

  // Authorization check
  const isAdmin = await isDeusExMember(serviceClient, callerUserId);
  if (!isAdmin) {
    return { data: null, count: null, error: 'Unauthorized: admin access required' };
  }

  // Check status filter — if all toggles are OFF, return empty
  const statusFilter = buildStatusFilter(showActive, showInactive, showDecommissioned);
  if (statusFilter === '') {
    return { data: [], count: 0, error: null };
  }

  // Build query — service_role bypasses all RLS
  let query = serviceClient
    .from('users')
    .select('id, personal_group_id, full_name, email, is_active, is_decommissioned, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Apply status filter (null = all ON, no filter needed)
  if (statusFilter) {
    query = query.or(statusFilter);
  }

  if (search) {
    const trimmed = search.trim().toLowerCase();
    if (trimmed) {
      query = query.or(`full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`);
    }
  }

  // Pagination
  const from = page * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return { data: null, count: null, error: error.message };
  }

  return { data: data as AdminUserRow[], count: count ?? 0, error: null };
}

/**
 * Fetch all matching user IDs for "Select All" feature.
 * Paginates in batches of 1000 to bypass Supabase's default row limit.
 * Uses the same filters as queryAdminUsers but returns only IDs.
 */
export async function queryAdminUserIds(params: Omit<AdminUsersParams, 'page' | 'pageSize'>): Promise<AdminUserIdsResult> {
  const {
    callerUserId,
    search,
    showActive = true,
    showInactive = true,
    showDecommissioned = false,
  } = params;

  const serviceClient = getServiceClient();

  const isAdmin = await isDeusExMember(serviceClient, callerUserId);
  if (!isAdmin) {
    return { ids: null, error: 'Unauthorized: admin access required' };
  }

  const statusFilter = buildStatusFilter(showActive, showInactive, showDecommissioned);
  if (statusFilter === '') {
    return { ids: [], error: null };
  }

  // Paginate in batches of 1000 (Supabase default row limit)
  const BATCH_SIZE = 1000;
  const allIds: string[] = [];
  let offset = 0;

  while (true) {
    let query = serviceClient
      .from('users')
      .select('id')
      .order('created_at', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (statusFilter) {
      query = query.or(statusFilter);
    }

    if (search) {
      const trimmed = search.trim().toLowerCase();
      if (trimmed) {
        query = query.or(`full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`);
      }
    }

    const { data, error } = await query;

    if (error) {
      return { ids: null, error: error.message };
    }

    const batch = (data || []).map((row: any) => row.id);
    allIds.push(...batch);

    // If we got fewer than BATCH_SIZE, we've fetched everything
    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }

  return { ids: allIds, error: null };
}
