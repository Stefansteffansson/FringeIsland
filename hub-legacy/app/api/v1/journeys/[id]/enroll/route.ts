import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/v1/journeys/[id]/enroll
 *
 * Enroll the current user (individual) or a group in a journey.
 * Auth: validates caller's JWT → resolves user profile.
 * For group enrollment: checks enroll_group_in_journey permission via has_permission().
 *
 * Body: { enrollmentType: 'individual' | 'group', groupId?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: journeyId } = await params;

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

    // Parse request body
    const body = await request.json();
    const { enrollmentType, groupId } = body;

    if (!enrollmentType || !['individual', 'group'].includes(enrollmentType)) {
      return NextResponse.json(
        { error: 'Missing or invalid enrollmentType. Must be "individual" or "group".' },
        { status: 400 }
      );
    }

    // Verify journey exists and is published/public
    const { data: journey } = await serviceClient
      .from('journeys')
      .select('id, title, is_published, is_public')
      .eq('id', journeyId)
      .single();

    if (!journey) {
      return NextResponse.json({ error: 'Journey not found' }, { status: 404 });
    }

    if (!journey.is_published || !journey.is_public) {
      return NextResponse.json({ error: 'This journey is not available' }, { status: 403 });
    }

    if (enrollmentType === 'individual') {
      // Check for existing individual enrollment
      const { data: existingEnrollment } = await serviceClient
        .from('journey_enrollments')
        .select('id')
        .eq('journey_id', journeyId)
        .eq('group_id', profile.personal_group_id)
        .eq('status', 'active')
        .maybeSingle();

      if (existingEnrollment) {
        return NextResponse.json(
          { error: 'You are already enrolled in this journey.' },
          { status: 409 }
        );
      }

      // Check if user is already enrolled via a group
      const { data: userGroups } = await serviceClient
        .from('group_memberships')
        .select('group_id')
        .eq('member_group_id', profile.personal_group_id)
        .eq('status', 'active');

      const groupIds = userGroups?.map(g => g.group_id) || [];

      if (groupIds.length > 0) {
        const { data: groupEnrollment } = await serviceClient
          .from('journey_enrollments')
          .select('id, groups!journey_enrollments_group_id_fkey(name)')
          .eq('journey_id', journeyId)
          .eq('status', 'active')
          .in('group_id', groupIds)
          .maybeSingle();

        if (groupEnrollment) {
          const groupName = (groupEnrollment as any).groups?.name || 'a group';
          return NextResponse.json(
            { error: `You are already enrolled via your group: ${groupName}` },
            { status: 409 }
          );
        }
      }

      // Create individual enrollment
      const { data: enrollment, error: enrollError } = await serviceClient
        .from('journey_enrollments')
        .insert({
          journey_id: journeyId,
          group_id: profile.personal_group_id,
          enrolled_by_group_id: profile.personal_group_id,
          status: 'active',
          progress_data: {},
        })
        .select()
        .single();

      if (enrollError) {
        if (enrollError.code === '23505') {
          return NextResponse.json(
            { error: 'You are already enrolled in this journey.' },
            { status: 409 }
          );
        }
        throw enrollError;
      }

      return NextResponse.json({ data: enrollment }, { status: 201 });
    } else {
      // Group enrollment
      if (!groupId) {
        return NextResponse.json(
          { error: 'groupId is required for group enrollment.' },
          { status: 400 }
        );
      }

      // Check enroll_group_in_journey permission
      const { data: hasPermission } = await serviceClient.rpc('has_permission', {
        p_acting_group_id: profile.personal_group_id,
        p_context_group_id: groupId,
        p_permission_name: 'enroll_group_in_journey',
      });

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden: you do not have permission to enroll this group in journeys.' },
          { status: 403 }
        );
      }

      // Check for existing group enrollment
      const { data: existingEnrollment } = await serviceClient
        .from('journey_enrollments')
        .select('id')
        .eq('journey_id', journeyId)
        .eq('group_id', groupId)
        .eq('status', 'active')
        .maybeSingle();

      if (existingEnrollment) {
        return NextResponse.json(
          { error: 'This group is already enrolled in this journey.' },
          { status: 409 }
        );
      }

      // Create group enrollment
      const { data: enrollment, error: enrollError } = await serviceClient
        .from('journey_enrollments')
        .insert({
          journey_id: journeyId,
          group_id: groupId,
          enrolled_by_group_id: profile.personal_group_id,
          status: 'active',
          progress_data: {},
        })
        .select()
        .single();

      if (enrollError) {
        if (enrollError.code === '23505') {
          return NextResponse.json(
            { error: 'This group is already enrolled in this journey.' },
            { status: 409 }
          );
        }
        throw enrollError;
      }

      return NextResponse.json({ data: enrollment }, { status: 201 });
    }
  } catch (err: any) {
    console.error('Journey enroll API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/journeys/[id]/enroll
 *
 * Unenroll the current user (individual) or a group from a journey.
 * Sets enrollment status to 'paused'.
 * Auth: validates caller's JWT → resolves user profile.
 * For group unenrollment: checks enroll_group_in_journey permission.
 *
 * Body: { enrollmentType: 'individual' | 'group', groupId?: string }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: journeyId } = await params;

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

    // Parse request body
    const body = await request.json();
    const { enrollmentType, groupId } = body;

    if (!enrollmentType || !['individual', 'group'].includes(enrollmentType)) {
      return NextResponse.json(
        { error: 'Missing or invalid enrollmentType. Must be "individual" or "group".' },
        { status: 400 }
      );
    }

    const targetGroupId = enrollmentType === 'individual' ? profile.personal_group_id : groupId;

    if (enrollmentType === 'group') {
      if (!groupId) {
        return NextResponse.json(
          { error: 'groupId is required for group unenrollment.' },
          { status: 400 }
        );
      }

      // Check enroll_group_in_journey permission
      const { data: hasPermission } = await serviceClient.rpc('has_permission', {
        p_acting_group_id: profile.personal_group_id,
        p_context_group_id: groupId,
        p_permission_name: 'enroll_group_in_journey',
      });

      if (!hasPermission) {
        return NextResponse.json(
          { error: 'Forbidden: you do not have permission to manage this group\'s enrollments.' },
          { status: 403 }
        );
      }
    }

    // Find the active enrollment
    const { data: enrollment } = await serviceClient
      .from('journey_enrollments')
      .select('id')
      .eq('journey_id', journeyId)
      .eq('group_id', targetGroupId)
      .eq('status', 'active')
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'No active enrollment found for this journey.' },
        { status: 404 }
      );
    }

    // Set status to paused
    const { data: updated, error: updateError } = await serviceClient
      .from('journey_enrollments')
      .update({
        status: 'paused',
        status_changed_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ data: updated });
  } catch (err: any) {
    console.error('Journey unenroll API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
