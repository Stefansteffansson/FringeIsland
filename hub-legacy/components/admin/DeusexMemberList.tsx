'use client';

import { useState } from 'react';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface DeusexMember {
  id: string; // membership id
  member_group_id: string;
  added_at: string;
  member_group: {
    id: string;
    name: string;
    avatar_url: string | null;
  };
  member_email?: string; // fetched separately from users table
}

interface DeusexMemberListProps {
  members: DeusexMember[];
  currentUserId: string;
  onRemove: (member: DeusexMember) => Promise<void>;
  loading: boolean;
}

export default function DeusexMemberList({
  members,
  currentUserId,
  onRemove,
  loading,
}: DeusexMemberListProps) {
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    member: null as DeusexMember | null,
  });
  const [removing, setRemoving] = useState(false);

  const handleRemoveClick = (member: DeusexMember) => {
    setConfirmModal({ isOpen: true, member });
  };

  const handleConfirmRemove = async () => {
    if (!confirmModal.member) return;

    setRemoving(true);
    try {
      await onRemove(confirmModal.member);
    } finally {
      setRemoving(false);
      setConfirmModal({ isOpen: false, member: null });
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg animate-pulse">
            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
            <div className="flex-1 space-y-2">
              <div className="w-32 h-4 bg-gray-200 rounded"></div>
              <div className="w-48 h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No DeusEx members found.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {members.filter((m) => m.member_group).map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white font-bold">
                {member.member_group.name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-medium text-gray-900">
                  {member.member_group.name}
                  {member.member_group_id === currentUserId && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">You</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">{member.member_email || ''}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                Joined {new Date(member.added_at).toLocaleDateString()}
              </span>
              {members.length > 1 && (
                <button
                  onClick={() => handleRemoveClick(member)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  title="Remove from DeusEx"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title="Remove DeusEx Member?"
        message={
          confirmModal.member
            ? `Are you sure you want to remove ${confirmModal.member.member_group.name} from the DeusEx group? They will lose all platform admin permissions.`
            : ''
        }
        confirmText={removing ? 'Removing...' : 'Remove'}
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmModal({ isOpen: false, member: null })}
        variant="danger"
      />
    </>
  );
}
