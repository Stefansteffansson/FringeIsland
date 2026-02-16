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
  const { user } = useAuth();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    setName('');
    setDescription('');
    setSelectedPermissionIds([]);
    onClose();
  };

  const handleSubmit = async () => {
    if (!user) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Role name is required');
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

      if (isEditing && editRole) {
        // Update existing role
        const { error: updateError } = await supabase
          .from('group_roles')
          .update({
            name: trimmedName,
            description: description.trim() || null,
          })
          .eq('id', editRole.id);

        if (updateError) throw updateError;

        // Sync permissions: remove deselected, add newly selected
        const currentIds = new Set(editRole.permissionIds);
        const newIds = new Set(selectedPermissionIds);

        // Permissions to remove
        const toRemove = editRole.permissionIds.filter(id => !newIds.has(id));
        if (toRemove.length > 0) {
          const { error: removeError } = await supabase
            .from('group_role_permissions')
            .delete()
            .eq('group_role_id', editRole.id)
            .in('permission_id', toRemove);

          if (removeError) throw removeError;
        }

        // Permissions to add
        const toAdd = selectedPermissionIds.filter(id => !currentIds.has(id));
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
              onChange={setSelectedPermissionIds}
              userPermissions={userPermissions}
              disabled={loading}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
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
        </div>
      </div>
    </div>
  );
}
