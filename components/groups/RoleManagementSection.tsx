'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';
import ConfirmModal from '@/components/ui/ConfirmModal';
import RoleFormModal from './RoleFormModal';

interface GroupRole {
  id: string;
  name: string;
  description: string | null;
  created_from_role_template_id: string | null;
  permissionIds: string[];
  permissionNames: string[];
  memberCount: number;
}

interface RoleManagementSectionProps {
  groupId: string;
  userPermissions: string[];
  onRolesChanged: () => void;
}

export default function RoleManagementSection({
  groupId,
  userPermissions,
  onRolesChanged,
}: RoleManagementSectionProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const [roles, setRoles] = useState<GroupRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<GroupRole | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<GroupRole | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);

      // Fetch roles for this group
      const { data: rolesData, error: rolesError } = await supabase
        .from('group_roles')
        .select('id, name, description, created_from_role_template_id')
        .eq('group_id', groupId)
        .order('created_from_role_template_id', { ascending: false, nullsFirst: false })
        .order('name');

      if (rolesError) throw rolesError;

      if (!rolesData || rolesData.length === 0) {
        setRoles([]);
        return;
      }

      const roleIds = rolesData.map(r => r.id);

      // Fetch permissions for all roles
      const { data: permData, error: permError } = await supabase
        .from('group_role_permissions')
        .select('group_role_id, permission_id, permissions(name)')
        .in('group_role_id', roleIds);

      if (permError) throw permError;

      // Fetch member counts per role
      const { data: memberData, error: memberError } = await supabase
        .from('user_group_roles')
        .select('group_role_id')
        .in('group_role_id', roleIds);

      if (memberError) throw memberError;

      // Build role objects
      const memberCounts: Record<string, number> = {};
      (memberData || []).forEach(m => {
        memberCounts[m.group_role_id] = (memberCounts[m.group_role_id] || 0) + 1;
      });

      const permsByRole: Record<string, { ids: string[]; names: string[] }> = {};
      (permData || []).forEach((p: any) => {
        if (!permsByRole[p.group_role_id]) {
          permsByRole[p.group_role_id] = { ids: [], names: [] };
        }
        permsByRole[p.group_role_id].ids.push(p.permission_id);
        permsByRole[p.group_role_id].names.push(p.permissions?.name || '');
      });

      const enrichedRoles: GroupRole[] = rolesData.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        created_from_role_template_id: r.created_from_role_template_id,
        permissionIds: permsByRole[r.id]?.ids || [],
        permissionNames: permsByRole[r.id]?.names || [],
        memberCount: memberCounts[r.id] || 0,
      }));

      setRoles(enrichedRoles);
    } catch (err: any) {
      console.error('Error fetching roles:', err);
      setError(err.message || 'Failed to load roles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [groupId]);

  const handleCreateRole = () => {
    setEditingRole(null);
    setFormModalOpen(true);
  };

  const handleEditRole = (role: GroupRole) => {
    setEditingRole(role);
    setFormModalOpen(true);
  };

  const handleDeleteRole = (role: GroupRole) => {
    setRoleToDelete(role);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;

    try {
      // Delete permission assignments first
      const { error: permDelError } = await supabase
        .from('group_role_permissions')
        .delete()
        .eq('group_role_id', roleToDelete.id);

      if (permDelError) throw permDelError;

      // Delete the role itself
      const { error: roleDelError } = await supabase
        .from('group_roles')
        .delete()
        .eq('id', roleToDelete.id);

      if (roleDelError) throw roleDelError;

      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
      await fetchRoles();
      onRolesChanged();
    } catch (err: any) {
      console.error('Error deleting role:', err);
      if (err.message?.includes('row-level security')) {
        alert('You do not have permission to delete this role.');
      } else {
        alert(err.message || 'Failed to delete role');
      }
      setDeleteConfirmOpen(false);
      setRoleToDelete(null);
    }
  };

  const handleFormSuccess = async () => {
    await fetchRoles();
    onRolesChanged();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Roles</h2>
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-500">Loading roles...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Roles</h2>
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Roles</h2>
        <button
          onClick={handleCreateRole}
          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-md text-sm"
        >
          + Create Role
        </button>
      </div>

      {roles.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No roles configured for this group.</p>
      ) : (
        <div className="space-y-3">
          {roles.map(role => {
            const isTemplate = !!role.created_from_role_template_id;
            const isCustom = !isTemplate;

            return (
              <div
                key={role.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-800">{role.name}</h3>
                      {isTemplate ? (
                        <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
                          Template
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded-full">
                          Custom
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {role.memberCount} {role.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>

                    {role.description && (
                      <p className="text-sm text-gray-500 mb-2">{role.description}</p>
                    )}

                    {/* Permission badges */}
                    {role.permissionNames.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {role.permissionNames.slice(0, 8).map((perm, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
                            {perm.replace(/_/g, ' ')}
                          </span>
                        ))}
                        {role.permissionNames.length > 8 && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded">
                            +{role.permissionNames.length - 8} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEditRole(role)}
                      className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors font-medium"
                    >
                      Edit
                    </button>
                    {isCustom && (
                      <button
                        onClick={() => handleDeleteRole(role)}
                        className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Role Form Modal */}
      <RoleFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setEditingRole(null);
        }}
        groupId={groupId}
        onSuccess={handleFormSuccess}
        userPermissions={userPermissions}
        editRole={
          editingRole
            ? {
                id: editingRole.id,
                name: editingRole.name,
                description: editingRole.description,
                isTemplate: !!editingRole.created_from_role_template_id,
                permissionIds: editingRole.permissionIds,
              }
            : null
        }
      />

      {/* Delete Confirmation */}
      {roleToDelete && (
        <ConfirmModal
          isOpen={deleteConfirmOpen}
          title="Delete Role?"
          message={`Are you sure you want to delete the "${roleToDelete.name}" role? ${
            roleToDelete.memberCount > 0
              ? `${roleToDelete.memberCount} member(s) currently have this role and will lose it.`
              : 'This action cannot be undone.'
          }`}
          confirmText="Delete Role"
          cancelText="Cancel"
          variant="danger"
          onConfirm={confirmDelete}
          onCancel={() => {
            setDeleteConfirmOpen(false);
            setRoleToDelete(null);
          }}
        />
      )}
    </div>
  );
}
