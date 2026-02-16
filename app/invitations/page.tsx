'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Invitation {
  id: string;
  group_id: string;
  group_name: string;
  invited_by_name: string;
  invited_at: string;
  group_label: string | null;
}

export default function InvitationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchInvitations = async () => {
      if (!user) return;

      try {
        // Get user's database ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (userError) throw userError;

        // Fetch pending invitations
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('group_memberships')
          .select('id, group_id, added_by_user_id, added_at')
          .eq('user_id', userData.id)
          .eq('status', 'invited');

        if (invitationsError) throw invitationsError;

        if (!invitationsData || invitationsData.length === 0) {
          setInvitations([]);
          setLoading(false);
          return;
        }

        // Get group details
        const groupIds = invitationsData.map(inv => inv.group_id);
        const { data: groupsData, error: groupsError } = await supabase
          .from('groups')
          .select('id, name, label')
          .in('id', groupIds);

        if (groupsError) throw groupsError;

        // Get invited_by user details
        const invitedByIds = invitationsData.map(inv => inv.added_by_user_id);
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name')
          .in('id', invitedByIds);

        if (usersError) throw usersError;

        // Combine data
        const invitationsWithDetails = invitationsData.map(inv => {
          const group = groupsData.find(g => g.id === inv.group_id);
          const invitedBy = usersData.find(u => u.id === inv.added_by_user_id);

          return {
            id: inv.id,
            group_id: inv.group_id,
            group_name: group?.name || 'Unknown Group',
            group_label: group?.label || null,
            invited_by_name: invitedBy?.full_name || 'Someone',
            invited_at: inv.added_at,
          };
        });

        setInvitations(invitationsWithDetails);
      } catch (err) {
        console.error('Error fetching invitations:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchInvitations();
    }
  }, [user, authLoading, router, supabase]);

  const handleAccept = async (invitationId: string, groupName: string) => {
    setProcessingId(invitationId);

    try {
      // Update status to 'active'
      const { error } = await supabase
        .from('group_memberships')
        .update({ status: 'active' })
        .eq('id', invitationId);

      if (error) throw error;

      // Note: Member role is auto-assigned by the database trigger
      // (assign_member_role_on_accept) when status changes to 'active'

      // Show success state briefly
      setProcessingId(null);
      setSuccessId(invitationId);

      // Refresh navigation to update invitation count
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('refreshNavigation'));
      }

      // Wait 1 second, then remove from list with fade effect
      setTimeout(() => {
        setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        setSuccessId(null);
      }, 1000);
    } catch (err) {
      console.error('Error accepting invitation:', err);
      setProcessingId(null);
      
      // Show error modal
      setConfirmModal({
        isOpen: true,
        title: 'Error',
        message: 'Failed to accept invitation. Please try again.',
        onConfirm: () => setConfirmModal({ ...confirmModal, isOpen: false }),
      });
    }
  };

  const handleDecline = async (invitationId: string, groupName: string) => {
    // Show confirmation modal
    setConfirmModal({
      isOpen: true,
      title: 'Decline Invitation?',
      message: `Are you sure you want to decline the invitation to "${groupName}"? You will need to be re-invited to join.`,
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setProcessingId(invitationId);

        try {
          // Delete the invitation
          const { error } = await supabase
            .from('group_memberships')
            .delete()
            .eq('id', invitationId);

          if (error) throw error;

          // Refresh navigation to update invitation count
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('refreshNavigation'));
          }

          // Remove from local state
          setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        } catch (err) {
          console.error('Error declining invitation:', err);
          
          // Show error modal
          setConfirmModal({
            isOpen: true,
            title: 'Error',
            message: 'Failed to decline invitation. Please try again.',
            onConfirm: () => setConfirmModal({ ...confirmModal, isOpen: false }),
          });
        } finally {
          setProcessingId(null);
        }
      },
    });
  };

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading invitations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Group Invitations
          </h1>
          <p className="text-gray-600">
            Invitations to join groups
          </p>
        </div>

        {/* Invitations List */}
        {invitations.length === 0 ? (
          // Empty State
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📬</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No Pending Invitations
            </h2>
            <p className="text-gray-600 mb-8">
              You don't have any group invitations at the moment.
            </p>
            <Link
              href="/groups"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-md"
            >
              View My Groups
            </Link>
          </div>
        ) : (
          // Invitations Cards
          <div className="space-y-4">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-all ${
                  successId === invitation.id ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
                }`}
              >
                <div className="flex items-start justify-between">
                  {/* Left: Group Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">
                        {invitation.group_name}
                      </h3>
                      {invitation.group_label && (
                        <span className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-full font-medium">
                          {invitation.group_label}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 mb-2">
                      <span className="font-semibold">{invitation.invited_by_name}</span> invited you to join this group
                    </p>
                    <p className="text-sm text-gray-500">
                      Invited {new Date(invitation.invited_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* Right: Action Buttons */}
                  <div className="flex gap-3 ml-4">
                    <button
                      onClick={() => handleAccept(invitation.id, invitation.group_name)}
                      disabled={processingId === invitation.id || successId === invitation.id}
                      className={`px-6 py-2 text-white rounded-lg font-semibold transition-all shadow-md disabled:cursor-not-allowed ${
                        successId === invitation.id
                          ? 'bg-green-600'
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      }`}
                    >
                      {processingId === invitation.id && 'Processing...'}
                      {successId === invitation.id && '✓ Accepted!'}
                      {!processingId && !successId && 'Accept'}
                    </button>
                    <button
                      onClick={() => handleDecline(invitation.id, invitation.group_name)}
                      disabled={processingId === invitation.id || successId === invitation.id}
                      className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            ℹ️ About Invitations
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• <strong>Accept</strong> an invitation to become a member of the group</li>
            <li>• <strong>Decline</strong> an invitation if you don't want to join</li>
            <li>• Accepted invitations will appear in your "My Groups" page</li>
          </ul>
        </div>

        {/* Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal({ ...confirmModal, isOpen: false })}
          variant="danger"
          confirmText="Yes, decline"
          cancelText="Cancel"
        />
      </div>
    </div>
  );
}
