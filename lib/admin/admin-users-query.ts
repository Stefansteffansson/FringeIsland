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
  showDecommissioned?: boolean;
}

export interface AdminUserRow {
  id: string;
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

/**
 * Verify the caller is a DeusEx member (has the Deusex role in the DeusEx system group).
 */
async function isDeusExMember(serviceClient: any, userId: string): Promise<boolean> {
  const { data } = await serviceClient.rpc('has_permission', {
    p_user_id: userId,
    p_group_id: '00000000-0000-0000-0000-000000000000',
    p_permission_name: 'manage_all_groups',
  });

  return data === true;
}

/**
 * Fetch paginated admin users using service_role (bypasses RLS).
 * Validates admin authorization before executing the query.
 */
export async function queryAdminUsers(params: AdminUsersParams): Promise<AdminUsersResult> {
  const { callerUserId, page, pageSize, search, showDecommissioned = false } = params;

  const serviceClient = getServiceClient();

  // Authorization check
  const isAdmin = await isDeusExMember(serviceClient, callerUserId);
  if (!isAdmin) {
    return { data: null, count: null, error: 'Unauthorized: admin access required' };
  }

  // Build query — service_role bypasses all RLS
  let query = serviceClient
    .from('users')
    .select('id, full_name, email, is_active, is_decommissioned, created_at', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (!showDecommissioned) {
    query = query.eq('is_decommissioned', false);
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
