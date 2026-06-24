import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendInvitationEmail } from '@/lib/email/send';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * POST /api/invitations/send-email
 *
 * Sends a simulated invitation email to a non-user.
 * Auth: validates caller's JWT → resolves user profile → checks invite_members permission.
 *
 * Body: { groupId, recipientEmail, token }
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { groupId, recipientEmail, token: invitationToken } = body;

    if (!groupId || !recipientEmail || !invitationToken) {
      return NextResponse.json({ error: 'Missing required fields: groupId, recipientEmail, token' }, { status: 400 });
    }

    // Check invite_members permission using has_permission RPC
    const { data: hasPermission } = await serviceClient.rpc('has_permission', {
      p_acting_group_id: profile.personal_group_id,
      p_context_group_id: groupId,
      p_permission_name: 'invite_members',
    });

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden: no invite_members permission' }, { status: 403 });
    }

    // Get group name for the email
    const { data: group } = await serviceClient
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single();

    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    // Send the email
    const result = await sendInvitationEmail({
      recipientEmail,
      groupName: group.name,
      inviterName: profile.full_name || 'A FringeIsland user',
      token: invitationToken,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error('Send invitation email API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
