'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/lib/hooks/usePermissions';
import Link from 'next/link';

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  is_public: boolean;
  show_member_list: boolean;
}

export default function EditGroupPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const params = useParams();
  const groupId = params.id as string;
  const router = useRouter();
  const supabase = createClient();
  const { hasPermission, loading: permissionsLoading } = usePermissions(groupId);

  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    label: '',
    is_public: false,
    show_member_list: true,
  });

  useEffect(() => {
    // Redirect if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchGroupData = async () => {
      if (!userProfile) return;

      try {
        // Fetch group data
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();

        if (groupError) throw groupError;

        // Permission check is done at render time via hasPermission
        // Set group data and form data
        setGroup(groupData);
        setFormData({
          name: groupData.name,
          description: groupData.description || '',
          label: groupData.label || '',
          is_public: groupData.is_public,
          show_member_list: groupData.show_member_list,
        });
      } catch (err: any) {
        console.error('Error fetching group:', err);
        setError(err.message || 'Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) {
      fetchGroupData();
    }
  }, [user, userProfile, authLoading, groupId, router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Group name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('groups')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          label: formData.label.trim() || null,
          is_public: formData.is_public,
          show_member_list: formData.show_member_list,
          updated_at: new Date().toISOString(),
        })
        .eq('id', groupId);

      if (updateError) throw updateError;

      // Success! Redirect back to group page
      router.push(`/groups/${groupId}`);
    } catch (err: any) {
      console.error('Error updating group:', err);
      setError(err.message || 'Failed to update group');
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (deleteError) throw deleteError;

      // Redirect to groups list — group no longer exists
      router.push('/groups');
    } catch (err: any) {
      console.error('Error deleting group:', err);
      setError(err.message || 'Failed to delete group. Please try again.');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Loading state
  if (authLoading || loading || permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading group...</p>
        </div>
      </div>
    );
  }

  // Not authorized or error
  if (!hasPermission('edit_group_settings') || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error ? 'Error' : 'Access Denied'}
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'You do not have permission to edit this group.'}
          </p>
          <Link
            href={`/groups/${groupId}`}
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Group
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/groups/${groupId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-4 transition-colors"
          >
            ← Back to {group?.name}
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Edit Group
          </h1>
          <p className="text-gray-600 mt-2">
            Update your group settings and information
          </p>
        </div>

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Group Name */}
          <div className="mb-6">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Group Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength={100}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Marketing Team, Engineering Department"
            />
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Describe your group's purpose and activities..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.description.length}/500 characters
            </p>
          </div>

          {/* Label */}
          <div className="mb-6">
            <label htmlFor="label" className="block text-sm font-medium text-gray-700 mb-2">
              Label (Optional)
            </label>
            <input
              type="text"
              id="label"
              name="label"
              value={formData.label}
              onChange={handleChange}
              maxLength={50}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Team, Organization, Cohort"
            />
            <p className="text-xs text-gray-500 mt-1">
              A short label to categorize your group
            </p>
          </div>

          {/* Visibility Settings */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Privacy & Visibility Settings
            </h3>

            {/* Public/Private Toggle */}
            <div className="mb-4">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="is_public"
                  checked={formData.is_public}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-700">
                    Public Group
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Public groups can be discovered and viewed by anyone. Private groups are hidden from non-members.
                  </p>
                </div>
              </label>
            </div>

            {/* Show Member List Toggle */}
            <div>
              <label className="flex items-start">
                <input
                  type="checkbox"
                  name="show_member_list"
                  checked={formData.show_member_list}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="ml-3">
                  <span className="text-sm font-medium text-gray-700">
                    Show Member List
                  </span>
                  <p className="text-xs text-gray-500 mt-1">
                    Allow members to see the full list of group members. Users with the view_member_list permission can always see all members.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-gray-200">
            <Link
              href={`/groups/${groupId}`}
              className="px-6 py-3 text-gray-700 hover:text-gray-900 font-medium transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>

        {/* Danger Zone (only for users with delete_group permission) */}
        {hasPermission('delete_group') && (
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8 border border-red-100">
          <h2 className="text-lg font-semibold text-red-700 mb-1">Danger Zone</h2>
          <p className="text-sm text-gray-500 mb-6">
            Permanently delete this group and all its data. This cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Delete Group
          </button>
        </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
            <div className="text-4xl mb-4 text-center">⚠️</div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
              Delete &quot;{group?.name}&quot;?
            </h3>
            <p className="text-gray-600 text-center mb-2">
              This will permanently delete the group and all associated data:
            </p>
            <ul className="text-sm text-gray-500 mb-6 space-y-1 list-disc list-inside">
              <li>All member records</li>
              <li>All roles and role assignments</li>
              <li>All journey enrollments</li>
            </ul>
            <p className="text-sm font-semibold text-red-600 text-center mb-6">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Deleting...
                  </span>
                ) : (
                  'Yes, Delete Group'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
