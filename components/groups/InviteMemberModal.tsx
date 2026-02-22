'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface InviteMemberModalProps {
  groupId: string;
  groupName: string;
  currentUserId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteMemberModal({
  groupId,
  groupName,
  currentUserId,
  onClose,
  onSuccess,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      // Check if user exists with this email
      const { data: invitedUser, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email, personal_group_id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (userError) throw userError;

      if (!invitedUser) {
        throw new Error('No user found with this email address. They need to create an account first.');
      }

      // Check if user is already a member
      const { data: existingMembership, error: membershipCheckError } = await supabase
        .from('group_memberships')
        .select('status')
        .eq('group_id', groupId)
        .eq('member_group_id', invitedUser.personal_group_id)
        .maybeSingle();

      if (membershipCheckError) throw membershipCheckError;

      if (existingMembership) {
        if (existingMembership.status === 'active') {
          throw new Error(`${invitedUser.full_name} is already a member of this group`);
        } else if (existingMembership.status === 'invited') {
          throw new Error(`${invitedUser.full_name} already has a pending invitation to this group`);
        }
      }

      // Create invitation
      const { error: inviteError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: groupId,
          member_group_id: invitedUser.personal_group_id,
          added_by_group_id: currentUserId,
          status: 'invited',
        });

      if (inviteError) throw inviteError;

      setSuccess(`Invitation sent to ${invitedUser.full_name}!`);
      setEmail('');
      
      // Call success callback after short delay
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      
      // Only log unexpected errors to console (not validation errors)
      if (errorMessage.includes('Failed to') || errorMessage.includes('database') || errorMessage.includes('network')) {
        console.error('Error inviting member:', err);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Invite Member
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              to {groupName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleInvite}>
          <div className="mb-6">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
            <p className="text-xs text-gray-500 mt-2">
              The person must have a FringeIsland account to receive invitations.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <p className="text-sm text-red-700 font-medium flex-1">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-start gap-3">
              <span className="text-xl">✓</span>
              <p className="text-sm text-green-700 font-medium flex-1">{success}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> The invited person will see the invitation in their Invitations page and can accept or decline it.
          </p>
        </div>
      </div>
    </div>
  );
}
