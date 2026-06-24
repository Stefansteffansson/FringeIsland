'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import PermissionPicker from './PermissionPicker';

interface RoleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  onSuccess: () => void;
  userPermissions: string[];
  editRole?: {
    id: string;
    name: string;
    description: string | null;
    isTemplate: boolean;
    permissionIds: string[];
  } | null;
}

export default function RoleFormModal({
  isOpen,
  onClose,
  groupId,
  onSuccess,
  userPermissions,
  editRole = null,
}: RoleFormModalProps) {
  const { userProfile } = useAuth();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockoutWarning, setLockoutWarning] = useState<string | null>(null);

  const isEditing = !!editRole;

  // Populate form when editing
  useEffect(() => {
    if (isOpen && editRole) {
      setName(editRole.name);
      setDescription(editRole.description || '');
      setSelectedPermissionIds(editRole.permissionIds);
    } else if (isOpen) {
      setName('');
      setDescription('');
      setSelectedPermissionIds([]);
    }
    setError(null);
  }, [isOpen, editRole]);

  // Escape key and body scroll lock
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) handleClose();
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

  const handleClose = () => {
    setError(null);
    setLockoutWarning(null);
    setName('');
    setDescription('');
    setSelectedPermissionIds([]);
    onClose();
  };

  // Check if removing a critical permission would lock the user out
  const checkSelfLockout = async (
    userId: string,
    removedPermissionIds: string[]
  ): Promise<string | null> => {
    if (removedPermissionIds.length === 0 || !editRole) return null;

    // Find which critical permissions are being removed (manage_roles, assign_roles)
    const { data: criticalPerms } = await supabase
      .from('permissions')
      .select('id, name')
      .in('id', removedPermissionIds)
      .in('name', ['manage_roles', 'assign_roles']);

    if (!criticalPerms || criticalPerms.length === 0) return null;

    // For each critical permission being removed, check if user has it from another role
    for (const perm of criticalPerms) {
      // Check user's OTHER roles in this group for the same permission
      const { data: otherSources, error: checkError } = await supabase
        .from('user_group_roles')
        .select('group_role_id, group_role_permissions!inner(permission_id)')
        .eq('member_group_id', userId)
        .eq('group_id', groupId)
        .neq('group_role_id', editRole.id)
        .eq('group_role_permissions.permission_id', perm.id);

      if (checkError) {
        // If the query fails (e.g., RLS), fall back to a simpler check
        // using the userPermissions prop — count occurrences
        console.warn('Lockout check query failed, using fallback:', checkError);
      }

      const hasOtherSource = otherSources && otherSources.length > 0;

      if (!hasOtherSource) {
        const permLabel = perm.name.replace(/_/g, ' ');
        return `You are about to remove "${permLabel}" from this role. This is your only role in this group with this permission — saving will lock you out of this capability. Are you sure?`;
      }
    }

    return null;
  };

  const handleSubmit = async (skipLockoutCheck = false) => {
    if (!userProfile) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Role name is required');
      return;
    }

    setLoading(true);
    setError(null);
    setLockoutWarning(null);

    try {
      if (isEditing && editRole) {
        // Sync permissions: compute what's being removed/added
        const currentIds = new Set(editRole.permissionIds);
        const newIds = new Set(selectedPermissionIds);
        const toRemove = editRole.permissionIds.filter(id => !newIds.has(id));
        const toAdd = selectedPermissionIds.filter(id => !currentIds.has(id));

        // Self-lockout check (only on first attempt, skip if user confirmed)
        if (!skipLockoutCheck && toRemove.length > 0) {
          const warning = await checkSelfLockout(userProfile.personal_group_id, toRemove);
          if (warning) {
            setLockoutWarning(warning);
            setLoading(false);
            return;
          }
        }

        // Update existing role
        const { error: updateError } = await supabase
          .from('group_roles')
          .update({
            name: trimmedName,
            description: description.trim() || null,
          })
          .eq('id', editRole.id);

        if (updateError) throw updateError;

        // Permissions to remove
        if (toRemove.length > 0) {
          const { error: removeError } = await supabase
            .from('group_role_permissions')
            .delete()
            .eq('group_role_id', editRole.id)
            .in('permission_id', toRemove);

          if (removeError) throw removeError;
        }

        // Permissions to add
        if (toAdd.length > 0) {
          const inserts = toAdd.map(permId => ({
            group_role_id: editRole.id,
            permission_id: permId,
          }));

          const { error: addError } = await supabase
            .from('group_role_permissions')
            .insert(inserts);

          if (addError) throw addError;
        }
      } else {
        // Create new role
        const { data: newRole, error: insertError } = await supabase
          .from('group_roles')
          .insert({
            group_id: groupId,
            name: trimmedName,
            description: description.trim() || null,
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // Add permissions
        if (selectedPermissionIds.length > 0) {
          const inserts = selectedPermissionIds.map(permId => ({
            group_role_id: newRole.id,
            permission_id: permId,
          }));

          const { error: permError } = await supabase
            .from('group_role_permissions')
            .insert(inserts);

          if (permError) throw permError;
        }
      }

      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('Error saving role:', err);
      if (err.message?.includes('row-level security')) {
        setError('You do not have permission to perform this action.');
      } else if (err.message?.includes('duplicate key')) {
        setError('A role with this name already exists in the group.');
      } else {
        setError(err.message || 'Failed to save role');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in">
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="text-center">
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">{isEditing ? '✏️' : '➕'}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Role' : 'Create Custom Role'}
            </h2>
            {isEditing && editRole?.isTemplate && (
              <p className="text-xs text-amber-600 mt-1">
                Template-based role — name change only affects this group
              </p>
            )}
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="role-name" className="block text-sm font-medium text-gray-700 mb-1">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              id="role-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Content Creator"
              maxLength={100}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              disabled={loading}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="role-desc" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="role-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this role for?"
              maxLength={500}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              disabled={loading}
            />
          </div>

          {/* Permissions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Permissions
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Select which permissions this role grants. You can only grant permissions you hold yourself.
            </p>
            <PermissionPicker
              selectedPermissionIds={selectedPermissionIds}
              onChange={(ids) => {
                setSelectedPermissionIds(ids);
                if (lockoutWarning) setLockoutWarning(null);
              }}
              userPermissions={userPermissions}
              disabled={loading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100">
          {/* Self-lockout warning */}
          {lockoutWarning && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg mb-4">
              <p className="text-sm font-semibold text-amber-800 mb-1">Warning: You may lose access</p>
              <p className="text-sm text-amber-700">{lockoutWarning}</p>
            </div>
          )}

          <div className="flex justify-end gap-3">
            {lockoutWarning ? (
              <>
                <button
                  type="button"
                  onClick={() => setLockoutWarning(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLockoutWarning(null);
                    handleSubmit(true);
                  }}
                  className="px-6 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 transition-all shadow-md text-sm"
                >
                  Save Anyway
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSubmit()}
                  disabled={loading || !name.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </>
                  ) : isEditing ? (
                    'Save Changes'
                  ) : (
                    'Create Role'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
