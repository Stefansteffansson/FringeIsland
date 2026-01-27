'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
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
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const groupId = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [group, setGroup] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);

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
      if (!user) return;

      try {
        // Get user's database ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (userError) throw userError;

        // Fetch group data
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .single();

        if (groupError) throw groupError;

        // Check if user is a Group Leader
        const { data: rolesData } = await supabase
          .from('user_group_roles')
          .select(`
            group_roles (
              name
            )
          `)
          .eq('user_id', userData.id)
          .eq('group_id', groupId);

        const hasLeaderRole = rolesData?.some(
          (r: any) => r.group_roles?.name === 'Group Leader'
        );

        setIsLeader(hasLeaderRole || false);

        // If not a leader, redirect to group page
        if (!hasLeaderRole) {
          router.push(`/groups/${groupId}`);
          return;
        }

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

    if (user) {
      fetchGroupData();
    }
  }, [user, authLoading, groupId, router, supabase]);

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
  if (authLoading || loading) {
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
  if (!isLeader || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {error ? 'Error' : 'Access Denied'}
          </h2>
          <p className="text-gray-600 mb-6">
            {error || 'You must be a Group Leader to edit this group.'}
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

        {/* Form */}
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
                    Allow members to see the full list of group members. Group Leaders can always see all members.
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
      </div>
    </div>
  );
}
