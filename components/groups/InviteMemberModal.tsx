'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';

interface SearchResult {
  id: string;
  display_name: string;
  full_name: string | null; // Only shown if show_real_name is true
  email: string;
  avatar_url: string | null;
  personal_group_id: string;
}

interface InviteMemberModalProps {
  groupId: string;
  groupName: string;
  currentUserId: string; // personal_group_id of the current user
  existingMemberGroupIds: string[]; // personal_group_ids of current members
  onClose: () => void;
  onSuccess: () => void;
}

export default function InviteMemberModal({
  groupId,
  groupName,
  currentUserId,
  existingMemberGroupIds,
  onClose,
  onSuccess,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  // Typeahead state
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setSearchLoading(true);
    try {
      const { data, error: searchError } = await supabase
        .from('users')
        .select('id, full_name, email, avatar_url, personal_group_id, show_real_name, personal_group:groups!personal_group_id(name)')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,nickname.ilike.%${query}%`)
        .limit(8);

      if (searchError) {
        console.error('Search error:', searchError);
        return;
      }

      // Filter out current members and self, map display names
      const filtered = (data || [])
        .filter(
          (u) =>
            u.personal_group_id !== currentUserId &&
            !existingMemberGroupIds.includes(u.personal_group_id)
        )
        .map((u) => {
          const pg = u.personal_group as any;
          return {
            id: u.id,
            display_name: pg?.name || u.full_name,
            full_name: u.show_real_name ? u.full_name : null,
            email: u.email,
            avatar_url: u.avatar_url,
            personal_group_id: u.personal_group_id,
          };
        });

      setSearchResults(filtered);
      setShowDropdown(filtered.length > 0);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  }, [supabase, currentUserId, existingMemberGroupIds]);

  const handleInputChange = (value: string) => {
    setEmail(value);
    setSelectedUser(null);
    setError(null);
    setSuccess(null);

    // Debounce search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  const handleSelectUser = (user: SearchResult) => {
    setSelectedUser(user);
    setEmail(user.email);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleInviteExistingUser = async () => {
    if (!selectedUser) return;

    setLoading(true);
    setError(null);

    try {
      // Check if already a member or invited (submit-time validation)
      const { data: existingMembership } = await supabase
        .from('group_memberships')
        .select('status')
        .eq('group_id', groupId)
        .eq('member_group_id', selectedUser.personal_group_id)
        .maybeSingle();

      if (existingMembership) {
        if (existingMembership.status === 'active') {
          throw new Error(`${selectedUser.display_name} is already a member of this group`);
        } else if (existingMembership.status === 'invited') {
          throw new Error(`${selectedUser.display_name} already has a pending invitation to this group`);
        }
      }

      // Create invitation
      const { error: inviteError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: groupId,
          member_group_id: selectedUser.personal_group_id,
          added_by_group_id: currentUserId,
          status: 'invited',
        });

      if (inviteError) throw inviteError;

      setSuccess(`Invitation sent to ${selectedUser.display_name}!`);
      setEmail('');
      setSelectedUser(null);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteByEmail = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address');
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user exists — maybe they typed the email directly
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, personal_group_id, personal_group:groups!personal_group_id(name)')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (existingUser) {
        const existingDisplayName = (existingUser.personal_group as any)?.name || 'User';

        // User exists — use the standard invitation flow
        const { data: existingMembership } = await supabase
          .from('group_memberships')
          .select('status')
          .eq('group_id', groupId)
          .eq('member_group_id', existingUser.personal_group_id)
          .maybeSingle();

        if (existingMembership) {
          if (existingMembership.status === 'active') {
            throw new Error(`${existingDisplayName} is already a member of this group`);
          } else if (existingMembership.status === 'invited') {
            throw new Error(`${existingDisplayName} already has a pending invitation to this group`);
          }
        }

        const { error: inviteError } = await supabase
          .from('group_memberships')
          .insert({
            group_id: groupId,
            member_group_id: existingUser.personal_group_id,
            added_by_group_id: currentUserId,
            status: 'invited',
          });

        if (inviteError) throw inviteError;

        setSuccess(`Invitation sent to ${existingDisplayName}!`);
      } else {
        // User does NOT exist — create pending email invitation
        // Check for existing pending invitation
        const { data: existingPending } = await supabase
          .from('pending_email_invitations')
          .select('id')
          .eq('group_id', groupId)
          .eq('invited_email', normalizedEmail)
          .maybeSingle();

        if (existingPending) {
          throw new Error(`A pending invitation has already been sent to ${normalizedEmail}`);
        }

        const { data: pendingInvitation, error: pendingError } = await supabase
          .from('pending_email_invitations')
          .insert({
            group_id: groupId,
            invited_email: normalizedEmail,
            invited_by_group_id: currentUserId,
          })
          .select('token')
          .single();

        if (pendingError) throw pendingError;

        // Send email via API route
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            await fetch('/api/invitations/send-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                groupId,
                recipientEmail: normalizedEmail,
                token: pendingInvitation.token,
              }),
            });
          }
        } catch (emailErr) {
          // Email sending is best-effort — don't fail the invitation
          console.error('Failed to send invitation email:', emailErr);
        }

        setSuccess(`Invitation email sent to ${normalizedEmail}! They'll see it when they sign up.`);
      }

      setEmail('');
      setSelectedUser(null);

      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send invitation';
      if (errorMessage.includes('Failed to') || errorMessage.includes('database') || errorMessage.includes('network')) {
        console.error('Error inviting member:', err);
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUser) {
      await handleInviteExistingUser();
    } else {
      await handleInviteByEmail();
    }
  };

  // Determine if the email looks valid (for the non-user flow)
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
        <form onSubmit={handleSubmit}>
          <div className="mb-6 relative" ref={dropdownRef}>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Search by name or email
            </label>
            <input
              ref={inputRef}
              type="text"
              id="email"
              value={email}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (searchResults.length > 0) setShowDropdown(true);
              }}
              placeholder="Type a name or email..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
              autoComplete="off"
            />

            {/* Search loading indicator */}
            {searchLoading && (
              <div className="absolute right-3 top-[42px]">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Selected user indicator */}
            {selectedUser && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                  {selectedUser.avatar_url ? (
                    <Image
                      src={selectedUser.avatar_url}
                      alt={selectedUser.display_name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-sm">
                      👤
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{selectedUser.display_name}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedUser.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUser(null);
                    setEmail('');
                    inputRef.current?.focus();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            )}

            {/* Typeahead dropdown */}
            {showDropdown && !selectedUser && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors text-left border-b border-gray-100 last:border-b-0"
                  >
                    <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0">
                      {user.avatar_url ? (
                        <Image
                          src={user.avatar_url}
                          alt={user.display_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-sm">
                          👤
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{user.display_name}</p>
                      {user.full_name && (
                        <p className="text-xs text-gray-400 truncate">{user.full_name}</p>
                      )}
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Help text based on state */}
            {!selectedUser && !showDropdown && email.length >= 2 && !searchLoading && searchResults.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {isValidEmail
                  ? "No matching user found. You can still send an invitation email — they'll see it when they sign up."
                  : 'No matching users found. Enter a valid email to invite someone who isn\'t on FringeIsland yet.'}
              </p>
            )}
            {!selectedUser && email.length < 2 && (
              <p className="text-xs text-gray-500 mt-2">
                Search for existing users, or enter an email to invite someone new.
              </p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start gap-3">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <p className="text-sm text-red-700 font-medium flex-1">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="mb-4 p-4 bg-green-50 border-2 border-green-200 rounded-lg flex items-start gap-3">
              <span className="text-xl flex-shrink-0">✓</span>
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
              disabled={loading || (!selectedUser && !isValidEmail)}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </span>
              ) : selectedUser ? (
                'Send Invite'
              ) : isValidEmail ? (
                'Send Email Invite'
              ) : (
                'Send Invite'
              )}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> {selectedUser
              ? 'The invited person will see the invitation in their Invitations page and can accept or decline it.'
              : 'If the person doesn\'t have an account yet, they\'ll receive an email invitation and can accept it after signing up.'}
          </p>
        </div>
      </div>
    </div>
  );
}
