'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import DeusexMemberList from '@/components/admin/DeusexMemberList';

interface DeusexMember {
  id: string;
  member_group_id: string;
  added_at: string;
  member_group: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  member_email?: string; // fetched separately from users table
}

export default function DeusexManagementPage() {
  const { userProfile } = useAuth();
  const [members, setMembers] = useState<DeusexMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [addEmail, setAddEmail] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const supabase = createClient();

  // Deusex group info
  const [deusexGroupId, setDeusexGroupId] = useState<string>('');

  const fetchMembers = useCallback(async () => {
    try {
      // Get Deusex group
      const { data: deusexGroup } = await supabase
        .from('groups')
        .select('id')
        .eq('name', 'DeusEx')
        .eq('group_type', 'system')
        .single();

      if (!deusexGroup) return;
      setDeusexGroupId(deusexGroup.id);

      // Get current user's personal_group_id from shared context
      if (userProfile) {
        setCurrentUserId(userProfile.personal_group_id);
      }

      // Fetch DeusEx members — join to groups for display data
      const { data, error } = await supabase
        .from('group_memberships')
        .select(`
          id,
          member_group_id,
          added_at,
          member_group:groups!group_memberships_member_group_id_fkey (
            id,
            name,
            avatar_url
          )
        `)
        .eq('group_id', deusexGroup.id)
        .eq('status', 'active')
        .order('added_at', { ascending: true });

      if (error) {
        console.error('Failed to fetch DeusEx members:', error);
        return;
      }

      // Filter out memberships where group data couldn't be joined
      const validMembers = (data || []).filter((m: any) => m.member_group !== null);

      // Fetch emails for each member (DeusEx has few members, so this is fast)
      const memberGroupIds = validMembers.map((m: any) => m.member_group_id);
      let emailMap: Record<string, string> = {};
      if (memberGroupIds.length > 0) {
        const { data: usersWithEmails } = await supabase
          .from('users')
          .select('personal_group_id, email')
          .in('personal_group_id', memberGroupIds);
        for (const u of usersWithEmails || []) {
          emailMap[u.personal_group_id] = u.email;
        }
      }

      const membersWithEmails = validMembers.map((m: any) => ({
        ...m,
        member_email: emailMap[m.member_group_id] || '',
      }));

      setMembers(membersWithEmails as unknown as DeusexMember[]);
    } catch (err) {
      console.error('Error fetching members:', err);
    }

    setLoading(false);
  }, [userProfile, supabase]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddSuccess(null);
    setAddLoading(true);

    try {
      const email = addEmail.trim().toLowerCase();
      if (!email) {
        setAddError('Please enter an email address.');
        setAddLoading(false);
        return;
      }

      // Look up user by email
      const { data: targetUser, error: lookupError } = await supabase
        .from('users')
        .select('id, email, full_name, personal_group_id')
        .eq('email', email)
        .maybeSingle();

      if (lookupError) {
        setAddError('Failed to look up user.');
        setAddLoading(false);
        return;
      }

      if (!targetUser) {
        setAddError(`User "${email}" not found. They must have an account first.`);
        setAddLoading(false);
        return;
      }

      // Check if already a DeusEx member or has a pending invitation
      const existing = members.find((m) => m.member_group_id === targetUser.personal_group_id);
      if (existing) {
        setAddError(`${targetUser.full_name} is already a DeusEx member.`);
        setAddLoading(false);
        return;
      }

      const { data: pendingInvite } = await supabase
        .from('group_memberships')
        .select('id')
        .eq('group_id', deusexGroupId)
        .eq('member_group_id', targetUser.personal_group_id)
        .eq('status', 'invited')
        .maybeSingle();

      if (pendingInvite) {
        setAddError(`${targetUser.full_name} already has a pending DeusEx invitation.`);
        setAddLoading(false);
        return;
      }

      // Send invitation (DeusEx role will be auto-assigned on acceptance)
      const { error: memberError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: deusexGroupId,
          member_group_id: targetUser.personal_group_id,
          added_by_group_id: currentUserId,
          status: 'invited',
        });

      if (memberError) {
        setAddError(`Failed to send invitation: ${memberError.message}`);
        setAddLoading(false);
        return;
      }

      // Write audit log
      await supabase.from('admin_audit_log').insert({
        actor_group_id: currentUserId,
        action: 'invite_deusex_member',
        target: targetUser.email,
        metadata: {
          target_user_id: targetUser.id,
          target_name: targetUser.full_name,
        },
      });

      setAddSuccess(`Invitation sent to ${targetUser.full_name}. They will become a DeusEx member once they accept.`);
      setAddEmail('');
    } catch (err: any) {
      setAddError(err.message || 'An unexpected error occurred.');
    }

    setAddLoading(false);
  };

  const handleRemoveMember = async (member: DeusexMember) => {
    setRemoveError(null);

    try {
      // Remove role first
      const { error: roleError } = await supabase
        .from('user_group_roles')
        .delete()
        .eq('member_group_id', member.member_group_id)
        .eq('group_id', deusexGroupId);

      if (roleError) {
        if (roleError.message.includes('last DeusEx member')) {
          setRemoveError('Cannot remove the last DeusEx member. Add another member first.');
        } else {
          setRemoveError(`Failed to remove role: ${roleError.message}`);
        }
        return;
      }

      // Remove membership
      const { error: memberError } = await supabase
        .from('group_memberships')
        .delete()
        .eq('id', member.id);

      if (memberError) {
        if (memberError.message.includes('last DeusEx member')) {
          setRemoveError('Cannot remove the last DeusEx member. Add another member first.');
        } else {
          setRemoveError(`Failed to remove membership: ${memberError.message}`);
        }
        return;
      }

      // Write audit log
      await supabase.from('admin_audit_log').insert({
        actor_group_id: currentUserId,
        action: 'remove_deusex_member',
        target: member.member_email || '',
        metadata: {
          target_group_id: member.member_group_id,
          target_name: member.member_group.name,
        },
      });

      await fetchMembers();
    } catch (err: any) {
      setRemoveError(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/admin" className="hover:text-blue-600 transition-colors">
          Admin
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">DeusEx Members</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">DeusEx Members</h1>
        <p className="text-gray-500 mt-1">
          Manage platform administrators. DeusEx members have all permissions.
        </p>
      </div>

      {/* Add Member Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Invite Member</h2>
        <form onSubmit={handleAddMember} className="flex gap-3">
          <input
            type="email"
            value={addEmail}
            onChange={(e) => {
              setAddEmail(e.target.value);
              setAddError(null);
              setAddSuccess(null);
            }}
            placeholder="Enter email address..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={addLoading}
          />
          <button
            type="submit"
            disabled={addLoading || !addEmail.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {addLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Inviting...
              </>
            ) : (
              'Invite'
            )}
          </button>
        </form>

        {addError && (
          <p className="mt-3 text-sm text-red-600">{addError}</p>
        )}
        {addSuccess && (
          <p className="mt-3 text-sm text-green-600">{addSuccess}</p>
        )}
      </div>

      {/* Remove Error */}
      {removeError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {removeError}
        </div>
      )}

      {/* Member List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Members ({members.length})
          </h2>
        </div>
        <DeusexMemberList
          members={members}
          currentUserId={currentUserId}
          onRemove={handleRemoveMember}
          loading={loading}
        />
      </div>
    </div>
  );
}
