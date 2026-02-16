'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface AssignRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  memberId: string;
  memberName: string;
  currentRoleIds: string[]; // Role IDs user already has
  userPermissions: string[]; // Permissions the current user holds (anti-escalation)
  onSuccess: () => void;
}

interface GroupRole {
  id: string;
  name: string;
}

export default function AssignRoleModal({
  isOpen,
  onClose,
  groupId,
  memberId,
  memberName,
  currentRoleIds,
  userPermissions,
  onSuccess,
}: AssignRoleModalProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [availableRoles, setAvailableRoles] = useState<GroupRole[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [fetchingRoles, setFetchingRoles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available roles when modal opens
  useEffect(() => {
    const fetchRoles = async () => {
      if (!isOpen || !groupId) return;

      setFetchingRoles(true);
      setError(null);

      try {
        // Fetch all roles in the group
        const { data: allRoles, error: rolesError } = await supabase
          .from('group_roles')
          .select('id, name')
          .eq('group_id', groupId)
          .order('name');

        if (rolesError) throw rolesError;

        // Filter out roles the member already has
        const candidateRoles = (allRoles || []).filter(
          (role) => !currentRoleIds.includes(role.id)
        );

        // Anti-escalation: fetch each role's permissions and filter out
        // roles that have permissions the current user doesn't hold
        const roleIds = candidateRoles.map(r => r.id);
        let assignableRoles = candidateRoles;

        if (roleIds.length > 0) {
          const { data: rolePerms, error: permsError } = await supabase
            .from('group_role_permissions')
            .select('group_role_id, permissions!inner(name)')
            .in('group_role_id', roleIds)
            .eq('granted', true);

          if (permsError) throw permsError;

          // Build a map: roleId → Set of permission names
          const rolePermMap = new Map<string, Set<string>>();
          for (const rp of rolePerms || []) {
            const permName = (rp.permissions as any)?.name;
            if (!permName) continue;
            if (!rolePermMap.has(rp.group_role_id)) {
              rolePermMap.set(rp.group_role_id, new Set());
            }
            rolePermMap.get(rp.group_role_id)!.add(permName);
          }

          // Keep only roles where ALL permissions are held by the current user
          const userPermSet = new Set(userPermissions);
          assignableRoles = candidateRoles.filter(role => {
            const perms = rolePermMap.get(role.id);
            if (!perms || perms.size === 0) return true; // Role with no permissions is safe
            for (const p of perms) {
              if (!userPermSet.has(p)) return false;
            }
            return true;
          });
        }

        setAvailableRoles(assignableRoles);

        // Auto-select first role if available
        if (assignableRoles.length > 0) {
          setSelectedRoleId(assignableRoles[0].id);
        }
      } catch (err) {
        console.error('Error fetching roles:', err);
        setError('Failed to load available roles');
      } finally {
        setFetchingRoles(false);
      }
    };

    if (isOpen) {
      fetchRoles();
    }
  }, [isOpen, groupId, currentRoleIds, userPermissions, supabase]);

  // Handle assign role
  const handleAssignRole = async () => {
    if (!selectedRoleId || !user) {
      setError('Please select a role');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get current user's database ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (userError) throw userError;

      // Assign the role
      const { error: assignError } = await supabase
        .from('user_group_roles')
        .insert({
          user_id: memberId,
          group_id: groupId,
          group_role_id: selectedRoleId,
          assigned_by_user_id: userData.id,
        });

      if (assignError) throw assignError;

      // Success!
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error assigning role:', err);
      setError(err.message || 'Failed to assign role');
    } finally {
      setLoading(false);
    }
  };

  // Handle close
  const handleClose = () => {
    setSelectedRoleId('');
    setError(null);
    onClose();
  };

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🎭</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Assign Role
          </h2>
          <p className="text-gray-600">
            Assign a role to <span className="font-semibold">{memberName}</span>
          </p>
        </div>

        {/* Loading State */}
        {fetchingRoles && (
          <div className="text-center py-8">
            <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-gray-600">Loading roles...</p>
          </div>
        )}

        {/* No Available Roles */}
        {!fetchingRoles && availableRoles.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">
              No roles available to assign. This can happen if {memberName} already
              has all roles, or if the remaining roles require permissions you
              don't hold in this group.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {/* Role Selection */}
        {!fetchingRoles && availableRoles.length > 0 && (
          <>
            {/* Select Role */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select a role to assign:
              </label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                {availableRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignRole}
                disabled={loading || !selectedRoleId}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Assigning...
                  </span>
                ) : (
                  'Assign Role'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
