import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { queryAdminUsers, queryAdminUserIds } from '@/lib/admin/admin-users-query';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/admin/users
 *
 * Server-side admin users endpoint. Uses service_role to bypass RLS.
 * Auth: validates caller's JWT → resolves user profile → checks DeusEx membership.
 *
 * Query params:
 *   page (number, default 0)
 *   pageSize (number, default 10, max 100)
 *   search (string, optional)
 *   showActive (boolean, default true)
 *   showInactive (boolean, default true)
 *   showDecommissioned (boolean, default false)
 *   idsOnly (boolean, default false) — returns only matching IDs (no pagination)
 */
export async function GET(request: NextRequest) {
  try {
    // Extract JWT from Authorization header or cookie
    const authHeader = request.headers.get('authorization');
    let token = authHeader?.replace('Bearer ', '');

    if (!token) {
      // Try to get from Supabase auth cookies
      const sbAccessToken = request.cookies.get('sb-access-token')?.value;
      const sbAuthToken = request.cookies.getAll()
        .find(c => c.name.includes('auth-token'))?.value;
      token = sbAccessToken || sbAuthToken;
    }

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the JWT and get the auth user
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: authError } = await serviceClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Resolve auth_user_id → public user profile id
    const { data: profile } = await serviceClient
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 401 });
    }

    // Parse query params
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || undefined;
    const showActive = searchParams.get('showActive') !== 'false'; // default true
    const showInactive = searchParams.get('showInactive') !== 'false'; // default true
    const showDecommissioned = searchParams.get('showDecommissioned') === 'true'; // default false
    const idsOnly = searchParams.get('idsOnly') === 'true';

    if (idsOnly) {
      // Return all matching IDs (no pagination)
      const result = await queryAdminUserIds({
        callerUserId: profile.id,
        search,
        showActive,
        showInactive,
        showDecommissioned,
      });

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 403 });
      }

      return NextResponse.json({ ids: result.ids });
    }

    // Standard paginated query
    const page = Math.max(0, parseInt(searchParams.get('page') || '0', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '10', 10)));

    const result = await queryAdminUsers({
      callerUserId: profile.id,
      page,
      pageSize,
      search,
      showActive,
      showInactive,
      showDecommissioned,
    });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 403 });
    }

    return NextResponse.json({
      data: result.data,
      count: result.count,
    });
  } catch (err: any) {
    console.error('Admin users API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
