'use client';

import {
  computeActionStates,
  isDestructiveAction,
  ACTION_CATEGORIES,
  type ActionName,
} from '@/lib/admin/action-bar-logic';
import type { AdminUser } from '@/lib/admin/user-filter';

interface UserActionBarProps {
  selectedUsers: AdminUser[];
  selectedCount: number;
  commonGroupCount: number;
  onAction: (action: ActionName) => void;
}

const ACTION_LABELS: Record<ActionName, { label: string; icon: string }> = {
  message: { label: 'Message', icon: '✉️' },
  notify: { label: 'Notify', icon: '🔔' },
  deactivate: { label: 'Deactivate', icon: '⏸️' },
  activate: { label: 'Activate', icon: '▶️' },
  delete_soft: { label: 'Delete (soft)', icon: '🗑️' },
  delete_hard: { label: 'Delete (hard)', icon: '💀' },
  logout: { label: 'Logout', icon: '🚪' },
  invite: { label: 'Invite', icon: '📩' },
  join: { label: 'Join', icon: '➕' },
  remove: { label: 'Remove', icon: '🚫' },
};

const CATEGORY_LABELS: Record<string, string> = {
  communication: 'Communication',
  account: 'Account',
  group: 'Group',
};

export default function UserActionBar({
  selectedUsers,
  selectedCount,
  commonGroupCount,
  onAction,
}: UserActionBarProps) {
  const actionStates = computeActionStates(selectedUsers, commonGroupCount);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 animate-in fade-in duration-200">
      {/* Selected count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-blue-700">
          {selectedCount} user{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Action groups */}
      <div className="flex flex-wrap items-center gap-6">
        {Object.entries(ACTION_CATEGORIES).map(([category, actions]) => (
          <div key={category} className="flex items-center gap-1">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mr-1">
              {CATEGORY_LABELS[category]}
            </span>
            <div className="flex items-center gap-1">
              {actions.map((action) => {
                const state = actionStates[action];
                const { label, icon } = ACTION_LABELS[action];
                const destructive = isDestructiveAction(action);

                return (
                  <button
                    key={action}
                    onClick={() => onAction(action)}
                    disabled={state.disabled}
                    title={state.disabled ? state.reason : label}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      state.disabled
                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : destructive
                          ? 'bg-white text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-1">{icon}</span>
                    {label}
                  </button>
                );
              })}
            </div>
            {/* Separator between groups */}
            {category !== 'group' && (
              <div className="w-px h-6 bg-gray-200 ml-2"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
