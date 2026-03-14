import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * GET /api/v1/journeys/enrollments
 *
 * Returns all active enrollments for the current user
 * (both individual via personal group and via group memberships).
 * Auth: validates caller's JWT → resolves user profile.
 */
export async function GET(request: NextRequest) {
  try {
    // Extract JWT from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

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

    // Resolve auth_user_id → public user profile
    const { data: profile } = await serviceClient
      .from('users')
      .select('id, full_name, personal_group_id')
      .eq('auth_user_id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 401 });
    }

    // Get all group IDs the user belongs to (including personal group)
    const { data: memberships } = await serviceClient
      .from('group_memberships')
      .select('group_id')
      .eq('member_group_id', profile.personal_group_id)
      .eq('status', 'active');

    const groupIds = [
      profile.personal_group_id,
      ...(memberships?.map(m => m.group_id) || []),
    ];

    // Fetch all active enrollments for these groups with journey details
    const { data: enrollments, error: fetchError } = await serviceClient
      .from('journey_enrollments')
      .select(`
        id,
        journey_id,
        group_id,
        enrolled_by_group_id,
        status,
        enrolled_at,
        status_changed_at,
        completed_at,
        last_accessed_at,
        progress_data,
        journeys!journey_enrollments_journey_id_fkey(
          id,
          title,
          description,
          difficulty_level,
          estimated_duration_minutes,
          tags
        ),
        groups!journey_enrollments_group_id_fkey(
          id,
          name
        )
      `)
      .in('group_id', groupIds)
      .eq('status', 'active')
      .order('enrolled_at', { ascending: false });

    if (fetchError) {
      throw fetchError;
    }

    // Tag each enrollment as individual or group
    const taggedEnrollments = (enrollments || []).map(enrollment => ({
      ...enrollment,
      enrollmentType: enrollment.group_id === profile.personal_group_id ? 'individual' : 'group',
    }));

    return NextResponse.json({
      data: taggedEnrollments,
      count: taggedEnrollments.length,
    });
  } catch (err: any) {
    console.error('Journey enrollments API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
