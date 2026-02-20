'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

type PickerMode = 'invite' | 'join' | 'remove';

interface GroupOption {
  id: string;
  name: string;
}

interface GroupPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: PickerMode;
  selectedUserIds: string[];
  onSelect: (group: GroupOption) => void;
}

const MODE_CONFIG: Record<PickerMode, { title: string; description: string; buttonLabel: string }> = {
  invite: {
    title: 'Invite to Group',
    description: 'Select an engagement group to send invitations to the selected users.',
    buttonLabel: 'Send Invitations',
  },
  join: {
    title: 'Add to Group',
    description: 'Select an engagement group to directly add the selected users as active members.',
    buttonLabel: 'Add to Group',
  },
  remove: {
    title: 'Remove from Group',
    description: 'Select a group that all selected users share. They will be removed from this group.',
    buttonLabel: 'Remove from Group',
  },
};

export default function GroupPickerModal({
  isOpen,
  onClose,
  mode,
  selectedUserIds,
  onSelect,
}: GroupPickerModalProps) {
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<GroupOption | null>(null);
  const supabase = createClient();

  const config = MODE_CONFIG[mode];

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      if (mode === 'remove') {
        // For remove: find groups where ALL selected users are active members
        if (selectedUserIds.length === 0) {
          setGroups([]);
          setLoading(false);
          return;
        }

        const { data: memberships } = await supabase
          .from('group_memberships')
          .select('user_id, group_id')
          .in('user_id', selectedUserIds)
          .eq('status', 'active');

        if (!memberships || memberships.length === 0) {
          setGroups([]);
          setLoading(false);
          return;
        }

        // Count how many selected users are in each group
        const groupUserCounts = new Map<string, number>();
        for (const m of memberships) {
          groupUserCounts.set(m.group_id, (groupUserCounts.get(m.group_id) || 0) + 1);
        }

        // Keep only groups where ALL selected users are members
        const commonGroupIds = Array.from(groupUserCounts.entries())
          .filter(([, count]) => count === selectedUserIds.length)
          .map(([groupId]) => groupId);

        if (commonGroupIds.length === 0) {
          setGroups([]);
          setLoading(false);
          return;
        }

        // Fetch group details, filtered to engagement only
        const { data: groupData } = await supabase
          .from('groups')
          .select('id, name')
          .in('id', commonGroupIds)
          .eq('group_type', 'engagement')
          .order('name');

        setGroups(groupData || []);
      } else {
        // For invite/join: show all engagement groups
        const { data: groupData } = await supabase
          .from('groups')
          .select('id, name')
          .eq('group_type', 'engagement')
          .order('name');

        setGroups(groupData || []);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setGroups([]);
    }
    setLoading(false);
  }, [mode, selectedUserIds, supabase]);

  // Fetch groups when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedGroup(null);
      fetchGroups();
    }
  }, [isOpen, fetchGroups]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const trimmedSearch = search.trim().toLowerCase();
  const filteredGroups = trimmedSearch
    ? groups.filter((g) => g.name.toLowerCase().includes(trimmedSearch))
    : groups;

  const handleConfirm = () => {
    if (selectedGroup) {
      onSelect(selectedGroup);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200 max-h-[80vh] flex flex-col">
        <h2 className="text-xl font-bold text-gray-900 mb-1">{config.title}</h2>
        <p className="text-sm text-gray-500 mb-4">{config.description}</p>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search groups..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
          autoFocus
        />

        {/* Group List */}
        <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg min-h-[200px] max-h-[300px]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-sm text-gray-500">Loading groups...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              {groups.length === 0
                ? mode === 'remove'
                  ? 'Selected users share no common engagement groups.'
                  : 'No engagement groups found.'
                : 'No groups match your search.'}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setSelectedGroup(group)}
                className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition-colors ${
                  selectedGroup?.id === group.id
                    ? 'bg-blue-50 text-blue-900 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {group.name}
              </button>
            ))
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedGroup}
            className={`flex-1 px-4 py-3 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'remove'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {config.buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
