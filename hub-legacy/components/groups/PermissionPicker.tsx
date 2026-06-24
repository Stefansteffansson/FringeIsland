'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  sortPermissionsByDisplayOrder,
} from '@/lib/constants/permissions';

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface PermissionPickerProps {
  selectedPermissionIds: string[];
  onChange: (permissionIds: string[]) => void;
  userPermissions: string[]; // Permissions the current user holds (anti-escalation)
  disabled?: boolean;
}

export default function PermissionPicker({
  selectedPermissionIds,
  onChange,
  userPermissions,
  disabled = false,
}: PermissionPickerProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('permissions')
          .select('id, name, description, category')
          .order('category')
          .order('name');

        if (fetchError) throw fetchError;
        setPermissions(data || []);

        // Auto-expand categories that have selected permissions
        const categoriesWithSelected = new Set<string>();
        (data || []).forEach(p => {
          if (selectedPermissionIds.includes(p.id)) {
            categoriesWithSelected.add(p.category);
          }
        });
        setExpandedCategories(categoriesWithSelected);
      } catch (err: any) {
        console.error('Error fetching permissions:', err);
        setError(err.message || 'Failed to load permissions');
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const togglePermission = (permissionId: string) => {
    if (disabled) return;
    if (selectedPermissionIds.includes(permissionId)) {
      onChange(selectedPermissionIds.filter(id => id !== permissionId));
    } else {
      onChange([...selectedPermissionIds, permissionId]);
    }
  };

  const groupedPermissions = CATEGORY_ORDER
    .map(category => ({
      category,
      label: CATEGORY_LABELS[category] || category,
      permissions: sortPermissionsByDisplayOrder(
        permissions.filter(p => p.category === category)
      ),
    }))
    .filter(group => group.permissions.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <span className="ml-2 text-sm text-gray-500">Loading permissions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {groupedPermissions.map(group => {
        const isExpanded = expandedCategories.has(group.category);
        const selectedCount = group.permissions.filter(p =>
          selectedPermissionIds.includes(p.id)
        ).length;

        return (
          <div key={group.category} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => toggleCategory(group.category)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <span className="font-medium text-gray-700 text-sm">{group.label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  selectedCount > 0
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-400'
                }`}>
                  {selectedCount}/{group.permissions.length}
                </span>
                <span className="text-gray-400 text-sm">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="px-4 py-2 space-y-1">
                {group.permissions.map(permission => {
                  const isSelected = selectedPermissionIds.includes(permission.id);
                  const userHolds = userPermissions.includes(permission.name);

                  return (
                    <label
                      key={permission.id}
                      className={`flex items-start gap-3 px-2 py-2 rounded cursor-pointer transition-colors ${
                        !userHolds
                          ? 'opacity-50 cursor-not-allowed'
                          : isSelected
                            ? 'bg-blue-50'
                            : 'opacity-50 hover:opacity-100 hover:bg-gray-50'
                      }`}
                      title={!userHolds ? 'You cannot grant a permission you do not hold in this group' : permission.description}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePermission(permission.id)}
                        disabled={disabled || !userHolds}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-gray-800 block">
                          {permission.name.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-gray-500 block">
                          {permission.description}
                        </span>
                        {!userHolds && (
                          <span className="text-xs text-amber-600 block mt-0.5">
                            You don't hold this permission in this group
                          </span>
                        )}
                        {userHolds && !isSelected && (
                          <span className="text-xs text-blue-500 block mt-0.5">
                            Available — you already hold this permission via another role
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
