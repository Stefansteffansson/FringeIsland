'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface GroupTemplate {
  id: string;
  name: string;
  description: string;
}

interface GroupCreateFormProps {
  userId: string;
}

export default function GroupCreateForm({ userId }: GroupCreateFormProps) {
  const [templates, setTemplates] = useState<GroupTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [label, setLabel] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [showMemberList, setShowMemberList] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Fetch group templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const { data, error } = await supabase
          .from('group_templates')
          .select('id, name, description')
          .order('name');

        if (error) throw error;
        setTemplates(data || []);
        
        // Pre-select first template
        if (data && data.length > 0) {
          setSelectedTemplate(data[0].id);
        }
      } catch (err) {
        console.error('Error fetching templates:', err);
        setError('Failed to load group templates');
      } finally {
        setLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validation
    if (!groupName.trim()) {
      setError('Group name is required');
      setLoading(false);
      return;
    }

    if (groupName.trim().length < 3) {
      setError('Group name must be at least 3 characters');
      setLoading(false);
      return;
    }

    if (groupName.trim().length > 100) {
      setError('Group name must be less than 100 characters');
      setLoading(false);
      return;
    }

    if (description.length > 500) {
      setError('Description must be less than 500 characters');
      setLoading(false);
      return;
    }

    if (label.length > 50) {
      setError('Label must be less than 50 characters');
      setLoading(false);
      return;
    }

    try {
      // Step 1: Create the group
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: groupName.trim(),
          description: description.trim() || null,
          label: label.trim() || null,
          created_by_user_id: userId,
          created_from_group_template_id: selectedTemplate || null,
          is_public: isPublic,
          show_member_list: showMemberList,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Step 2: Add creator as member
      const { error: membershipError } = await supabase
        .from('group_memberships')
        .insert({
          group_id: groupData.id,
          user_id: userId,
          added_by_user_id: userId,
          status: 'active',
        });

      if (membershipError) throw membershipError;

      // Step 3: Get role templates (Steward + Member)
      const { data: roleTemplates, error: roleTemplatesError } = await supabase
        .from('role_templates')
        .select('id, name')
        .in('name', ['Steward Role Template', 'Member Role Template']);

      if (roleTemplatesError) throw roleTemplatesError;

      const stewardTemplate = roleTemplates?.find(t => t.name === 'Steward Role Template');
      const memberTemplate = roleTemplates?.find(t => t.name === 'Member Role Template');

      if (!stewardTemplate || !memberTemplate) {
        throw new Error('Required role templates (Steward, Member) not found');
      }

      // Step 4: Create both role instances (permissions auto-copied by trigger)
      const { data: stewardRole, error: stewardError } = await supabase
        .from('group_roles')
        .insert({
          group_id: groupData.id,
          name: 'Steward',
          created_from_role_template_id: stewardTemplate.id,
        })
        .select('id')
        .single();

      if (stewardError) throw stewardError;

      const { data: memberRole, error: memberError } = await supabase
        .from('group_roles')
        .insert({
          group_id: groupData.id,
          name: 'Member',
          created_from_role_template_id: memberTemplate.id,
        })
        .select('id')
        .single();

      if (memberError) throw memberError;

      // Step 5: Assign creator both Steward and Member roles
      const { error: rolesAssignError } = await supabase
        .from('user_group_roles')
        .insert([
          {
            user_id: userId,
            group_id: groupData.id,
            group_role_id: stewardRole.id,
            assigned_by_user_id: userId,
          },
          {
            user_id: userId,
            group_id: groupData.id,
            group_role_id: memberRole.id,
            assigned_by_user_id: userId,
          },
        ]);

      if (rolesAssignError) throw rolesAssignError;

      setSuccess(true);
      
      // Redirect to groups page after short delay
      setTimeout(() => {
        router.push('/groups');
      }, 1500);
    } catch (err) {
      console.error('Error creating group:', err);
      setError(err instanceof Error ? err.message : 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/groups');
  };

  if (loadingTemplates) {
    return (
      <div className="text-center py-8">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Loading templates...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Group Template Selection */}
      <div>
        <label 
          htmlFor="template" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Group Template *
        </label>
        <select
          id="template"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        {selectedTemplate && (
          <p className="mt-2 text-sm text-gray-500">
            {templates.find(t => t.id === selectedTemplate)?.description}
          </p>
        )}
      </div>

      {/* Group Name */}
      <div>
        <label 
          htmlFor="groupName" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Group Name *
        </label>
        <input
          type="text"
          id="groupName"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Enter group name (e.g., Marketing Team, Engineering Dept)"
          maxLength={100}
        />
        <p className="mt-1 text-sm text-gray-500">
          {groupName.length}/100 characters
        </p>
      </div>

      {/* Description */}
      <div>
        <label 
          htmlFor="description" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed resize-none"
          placeholder="What is this group about? (optional)"
          maxLength={500}
        />
        <p className="mt-1 text-sm text-gray-500">
          {description.length}/500 characters
        </p>
      </div>

      {/* Custom Label */}
      <div>
        <label 
          htmlFor="label" 
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Custom Label (Optional)
        </label>
        <input
          type="text"
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={loading}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder='e.g., "Team", "Department", "Club"'
          maxLength={50}
        />
        <p className="mt-1 text-sm text-gray-500">
          A custom label to describe your group type (max 50 characters)
        </p>
      </div>

      {/* Visibility Settings */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700">Visibility Settings</h3>
        
        {/* Public/Private */}
        <div className="flex items-start">
          <input
            type="checkbox"
            id="isPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            disabled={loading}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          />
          <label htmlFor="isPublic" className="ml-3">
            <span className="text-sm font-medium text-gray-700">Public Group</span>
            <p className="text-sm text-gray-500">
              Anyone can discover and view this group
            </p>
          </label>
        </div>

        {/* Show Member List */}
        <div className="flex items-start">
          <input
            type="checkbox"
            id="showMemberList"
            checked={showMemberList}
            onChange={(e) => setShowMemberList(e.target.checked)}
            disabled={loading}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
          />
          <label htmlFor="showMemberList" className="ml-3">
            <span className="text-sm font-medium text-gray-700">Show Member List</span>
            <p className="text-sm text-gray-500">
              Members can see the full list of group members
            </p>
          </label>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">
            Group created successfully! Redirecting...
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating Group...' : 'Create Group'}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          disabled={loading}
          className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
