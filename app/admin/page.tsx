'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminDataPanel from '@/components/admin/AdminDataPanel';
import UserActionBar from '@/components/admin/UserActionBar';
import ConfirmModal from '@/components/ui/ConfirmModal';
import NotifyModal from '@/components/admin/NotifyModal';
import MessageModal from '@/components/admin/MessageModal';
import GroupPickerModal from '@/components/admin/GroupPickerModal';
import type { AdminUser } from '@/lib/admin/user-filter';
import { DEFAULT_USER_FILTERS } from '@/lib/admin/user-filter';
import type { UserFilters } from '@/lib/admin/user-filter';
import type { ActionName } from '@/lib/admin/action-bar-logic';
import { clearsSelectionAfterAction } from '@/lib/admin/action-bar-logic';

type CardType = 'users' | 'groups' | 'journeys' | 'enrollments';

interface PlatformStats {
  users: number | null;
  groups: number | null;
  journeys: number | null;
  enrollments: number | null;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  variant: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

export default function AdminDashboard() {
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState<PlatformStats>({
    users: null,
    groups: null,
    journeys: null,
    enrollments: null,
  });
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<CardType | null>(null);
  const [userFilters, setUserFilters] = useState<UserFilters>(DEFAULT_USER_FILTERS);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [usersData, setUsersData] = useState<AdminUser[]>([]);
  const [currentUserProfileId, setCurrentUserProfileId] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [groupPickerState, setGroupPickerState] = useState<{
    isOpen: boolean;
    mode: 'invite' | 'join' | 'remove';
  }>({ isOpen: false, mode: 'invite' });
  const [commonGroupCount, setCommonGroupCount] = useState(0);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    variant: 'info',
    onConfirm: () => {},
  });
  const supabase = createClient();

  // Set current user's profile ID from shared context
  useEffect(() => {
    if (userProfile) {
      setCurrentUserProfileId(userProfile.id);
    }
  }, [userProfile]);

  // Auto-clear status message after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Compute common engagement group count for Remove button enablement
  useEffect(() => {
    if (selectedUserIds.size === 0) {
      setCommonGroupCount(0);
      return;
    }

    const targetIds = [...selectedUserIds];
    let cancelled = false;

    const compute = async () => {
      try {
        const { data: memberships } = await supabase
          .from('group_memberships')
          .select('user_id, group_id')
          .in('user_id', targetIds)
          .eq('status', 'active');

        if (cancelled || !memberships) return;

        // Count users per group, keep groups where ALL selected users are members
        const groupUserCounts = new Map<string, number>();
        for (const m of memberships) {
          groupUserCounts.set(m.group_id, (groupUserCounts.get(m.group_id) || 0) + 1);
        }

        const count = Array.from(groupUserCounts.values())
          .filter((c) => c === targetIds.length).length;

        setCommonGroupCount(count);
      } catch {
        if (!cancelled) setCommonGroupCount(0);
      }
    };

    compute();
    return () => { cancelled = true; };
  }, [selectedUserIds, supabase]);

  const fetchStats = useCallback(async () => {
    try {
      // Users count: apply status filters
      let usersQuery = supabase.from('users').select('*', { count: 'exact', head: true });

      // Build filter from toggles
      const { showActive, showInactive, showDecommissioned } = userFilters;
      if (!(showActive && showInactive && showDecommissioned)) {
        const conditions: string[] = [];
        if (showActive) conditions.push('and(is_active.eq.true,is_decommissioned.eq.false)');
        if (showInactive) conditions.push('and(is_active.eq.false,is_decommissioned.eq.false)');
        if (showDecommissioned) conditions.push('is_decommissioned.eq.true');
        if (conditions.length > 0) {
          usersQuery = usersQuery.or(conditions.join(','));
        } else {
          // All OFF — count will be 0
          usersQuery = usersQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }
      }

      const [usersRes, groupsRes, journeysRes, enrollmentsRes] = await Promise.all([
        usersQuery,
        supabase
          .from('groups')
          .select('*', { count: 'exact', head: true })
          .eq('group_type', 'engagement'),
        supabase
          .from('journeys')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('journey_enrollments')
          .select('*', { count: 'exact', head: true }),
      ]);

      setStats({
        users: usersRes.count,
        groups: groupsRes.count,
        journeys: journeysRes.count,
        enrollments: enrollmentsRes.count,
      });
    } catch (err) {
      console.error('Failed to fetch platform stats:', err);
    }

    setLoading(false);
  }, [supabase, userFilters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCardClick = (cardType: CardType) => {
    setExpandedCard((prev) => (prev === cardType ? null : cardType));
  };

  const handleUserFiltersChange = useCallback((filters: UserFilters) => {
    setUserFilters(filters);
  }, []);

  const handleSelectionChange = useCallback((newSelection: Set<string>) => {
    setSelectedUserIds(newSelection);
  }, []);

  const handleUsersDataChange = useCallback((data: AdminUser[]) => {
    setUsersData(data);
  }, []);

  // --- Action helpers ---

  const closeConfirm = () => {
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
  };

  const showConfirm = (opts: Omit<ConfirmModalState, 'isOpen'>) => {
    setConfirmModal({ ...opts, isOpen: true });
  };

  const refreshData = () => {
    setRefreshKey((k) => k + 1);
    fetchStats();
  };

  const afterAction = (action: ActionName, successMsg: string) => {
    if (clearsSelectionAfterAction(action)) {
      setSelectedUserIds(new Set());
    }
    refreshData();
    setStatusMessage({ type: 'success', text: successMsg });
  };

  const writeAuditLog = async (action: string, count: number, targetIds: string[]) => {
    if (!currentUserProfileId) return;
    await supabase.from('admin_audit_log').insert({
      actor_user_id: currentUserProfileId,
      action,
      target: `${count} user(s)`,
      metadata: { target_user_ids: targetIds, count },
    });
  };

  // --- Execute functions ---

  const executeActivate = async (targetIds: string[]) => {
    setActionInProgress(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: true })
        .in('id', targetIds);

      if (error) throw error;

      await writeAuditLog('user_activated', targetIds.length, targetIds);
      afterAction('activate', `Activated ${targetIds.length} user(s).`);
    } catch (err: any) {
      console.error('Activate failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to activate users.' });
    }
    setActionInProgress(false);
  };

  const executeDeactivate = async (targetIds: string[]) => {
    setActionInProgress(true);
    closeConfirm();
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .in('id', targetIds);

      if (error) throw error;

      // Auto force-logout: invalidate sessions so deactivation takes effect immediately
      await supabase.rpc('admin_force_logout', { target_user_ids: targetIds });

      await writeAuditLog('user_deactivated', targetIds.length, targetIds);
      afterAction('deactivate', `Deactivated and logged out ${targetIds.length} user(s).`);
    } catch (err: any) {
      console.error('Deactivate failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to deactivate users.' });
    }
    setActionInProgress(false);
  };

  const executeDecommission = async (targetIds: string[]) => {
    setActionInProgress(true);
    closeConfirm();
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_decommissioned: true, is_active: false } as any)
        .in('id', targetIds);

      if (error) throw error;

      // Auto force-logout: invalidate sessions so decommission takes effect immediately
      await supabase.rpc('admin_force_logout', { target_user_ids: targetIds });

      await writeAuditLog('user_decommissioned', targetIds.length, targetIds);
      afterAction('delete_soft', `Decommissioned and logged out ${targetIds.length} user(s).`);
    } catch (err: any) {
      console.error('Decommission failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to decommission users.' });
    }
    setActionInProgress(false);
  };

  const executeHardDelete = async (targetIds: string[]) => {
    setActionInProgress(true);
    closeConfirm();
    try {
      // Hard delete calls the RPC per user (it creates its own audit log entry)
      const errors: string[] = [];
      for (const userId of targetIds) {
        const { error } = await supabase.rpc('admin_hard_delete_user', {
          target_user_id: userId,
        });
        if (error) {
          errors.push(`${userId}: ${error.message}`);
        }
      }

      if (errors.length > 0) {
        const deleted = targetIds.length - errors.length;
        setStatusMessage({
          type: 'error',
          text: `Deleted ${deleted}/${targetIds.length} users. Errors: ${errors.join('; ')}`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Permanently deleted ${targetIds.length} user(s).`,
        });
      }

      // RPC creates its own audit entries — no need to write here
      if (clearsSelectionAfterAction('delete_hard')) {
        setSelectedUserIds(new Set());
      }
      refreshData();
    } catch (err: any) {
      console.error('Hard delete failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to delete users.' });
    }
    setActionInProgress(false);
  };

  const executeForceLogout = async (targetIds: string[]) => {
    setActionInProgress(true);
    closeConfirm();
    try {
      const { error } = await supabase.rpc('admin_force_logout', {
        target_user_ids: targetIds,
      });

      if (error) throw error;

      // RPC creates its own audit entries
      afterAction('logout', `Forced logout for ${targetIds.length} user(s).`);
    } catch (err: any) {
      console.error('Force logout failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to force logout users.' });
    }
    setActionInProgress(false);
  };

  const executeNotify = async (title: string, message: string) => {
    const targetIds = [...selectedUserIds];
    try {
      const { data, error } = await supabase.rpc('admin_send_notification', {
        target_user_ids: targetIds,
        title,
        message,
      });

      if (error) throw error;

      await writeAuditLog('admin_notification_sent', targetIds.length, targetIds);
      setNotifyModalOpen(false);
      afterAction('notify', `Sent notification to ${data} user(s).`);
    } catch (err: any) {
      // Re-throw so the modal can display the error
      throw err;
    }
  };

  const executeMessage = async (content: string) => {
    if (!currentUserProfileId) throw new Error('Admin profile not loaded.');
    const targetIds = [...selectedUserIds];
    const adminId = currentUserProfileId;
    let sentCount = 0;

    for (const targetId of targetIds) {
      // Sort participant IDs (DB constraint: participant_1 < participant_2)
      const p1 = adminId < targetId ? adminId : targetId;
      const p2 = adminId < targetId ? targetId : adminId;

      // Find or create conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('participant_1', p1)
        .eq('participant_2', p2)
        .maybeSingle();

      let conversationId: string;
      if (existing) {
        conversationId = existing.id;
      } else {
        const { data: newConv, error: convError } = await supabase
          .from('conversations')
          .insert({ participant_1: p1, participant_2: p2 })
          .select('id')
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
      }

      // Send the message
      const { error: msgError } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: adminId,
          content,
        });

      if (msgError) throw msgError;
      sentCount++;
    }

    // Audit log — test expects metadata.user_count
    if (currentUserProfileId) {
      await supabase.from('admin_audit_log').insert({
        actor_user_id: currentUserProfileId,
        action: 'admin_message_sent',
        target: `${targetIds.length} user(s)`,
        metadata: { target_user_ids: targetIds, user_count: targetIds.length },
      });
    }

    setMessageModalOpen(false);
    afterAction('message', `Sent DM to ${sentCount} user(s).`);
  };

  // --- Group action helpers ---

  const closeGroupPicker = () => {
    setGroupPickerState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleGroupSelected = (group: { id: string; name: string }) => {
    const mode = groupPickerState.mode;
    const targetIds = [...selectedUserIds];
    const count = targetIds.length;
    closeGroupPicker();

    if (mode === 'invite') {
      executeInvite(targetIds, group);
    } else if (mode === 'join') {
      showConfirm({
        title: 'Directly Add Users?',
        message: `This will add ${count} user${count !== 1 ? 's' : ''} to "${group.name}" as active members, bypassing the invitation flow.`,
        confirmText: 'Add to Group',
        variant: 'warning',
        onConfirm: () => executeJoin(targetIds, group),
      });
    } else if (mode === 'remove') {
      showConfirm({
        title: 'Remove Users from Group?',
        message: `This will remove ${count} user${count !== 1 ? 's' : ''} from "${group.name}" and clean up their roles in that group.`,
        confirmText: 'Remove',
        variant: 'danger',
        onConfirm: () => executeRemove(targetIds, group),
      });
    }
  };

  const executeInvite = async (targetIds: string[], group: { id: string; name: string }) => {
    if (!currentUserProfileId) return;
    setActionInProgress(true);
    try {
      let invited = 0;
      let skipped = 0;

      for (const userId of targetIds) {
        // Check for existing membership
        const { data: existing } = await supabase
          .from('group_memberships')
          .select('id')
          .eq('group_id', group.id)
          .eq('user_id', userId)
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        const { error } = await supabase
          .from('group_memberships')
          .insert({
            group_id: group.id,
            user_id: userId,
            added_by_user_id: currentUserProfileId,
            status: 'invited',
          });

        if (error) {
          // Unique constraint violation = already exists, skip
          if (error.code === '23505') {
            skipped++;
          } else {
            throw error;
          }
        } else {
          invited++;
        }
      }

      await supabase.from('admin_audit_log').insert({
        actor_user_id: currentUserProfileId,
        action: 'admin_invite_to_group',
        target: group.name,
        metadata: { group_id: group.id, group_name: group.name, user_count: targetIds.length, invited, skipped },
      });

      const msg = skipped > 0
        ? `Invited ${invited} user(s) to "${group.name}". ${skipped} already in group.`
        : `Invited ${invited} user(s) to "${group.name}".`;
      afterAction('invite', msg);
    } catch (err: any) {
      console.error('Invite to group failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to invite users to group.' });
    }
    setActionInProgress(false);
  };

  const executeJoin = async (targetIds: string[], group: { id: string; name: string }) => {
    if (!currentUserProfileId) return;
    setActionInProgress(true);
    closeConfirm();
    try {
      // Look up Member role for this group
      const { data: memberRole } = await supabase
        .from('group_roles')
        .select('id')
        .eq('group_id', group.id)
        .eq('name', 'Member')
        .maybeSingle();

      let added = 0;
      let skipped = 0;

      for (const userId of targetIds) {
        // Check for existing active membership
        const { data: existing } = await supabase
          .from('group_memberships')
          .select('id')
          .eq('group_id', group.id)
          .eq('user_id', userId)
          .eq('status', 'active')
          .maybeSingle();

        if (existing) {
          skipped++;
          continue;
        }

        // Insert membership with active status
        const { error: membershipErr } = await supabase
          .from('group_memberships')
          .insert({
            group_id: group.id,
            user_id: userId,
            added_by_user_id: currentUserProfileId,
            status: 'active',
          });

        if (membershipErr) {
          if (membershipErr.code === '23505') {
            skipped++;
          } else {
            throw membershipErr;
          }
          continue;
        }

        // Assign Member role (auto_assign trigger only fires on invited→active, not direct insert)
        if (memberRole) {
          await supabase
            .from('user_group_roles')
            .insert({
              user_id: userId,
              group_id: group.id,
              group_role_id: memberRole.id,
              assigned_by_user_id: currentUserProfileId,
            });
        }

        added++;
      }

      await supabase.from('admin_audit_log').insert({
        actor_user_id: currentUserProfileId,
        action: 'admin_join_group',
        target: group.name,
        metadata: { group_id: group.id, group_name: group.name, user_count: targetIds.length, added, skipped },
      });

      const msg = skipped > 0
        ? `Added ${added} user(s) to "${group.name}". ${skipped} already active.`
        : `Added ${added} user(s) to "${group.name}".`;
      afterAction('join', msg);
    } catch (err: any) {
      console.error('Join group failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to add users to group.' });
    }
    setActionInProgress(false);
  };

  const executeRemove = async (targetIds: string[], group: { id: string; name: string }) => {
    if (!currentUserProfileId) return;
    setActionInProgress(true);
    closeConfirm();
    try {
      let removed = 0;
      const errors: string[] = [];

      for (const userId of targetIds) {
        // Remove roles first (FK dependency)
        const { error: roleErr } = await supabase
          .from('user_group_roles')
          .delete()
          .eq('user_id', userId)
          .eq('group_id', group.id);

        if (roleErr) {
          // Last Steward protection trigger may block this
          errors.push(roleErr.message);
          continue;
        }

        // Remove membership
        const { error: membershipErr } = await supabase
          .from('group_memberships')
          .delete()
          .eq('user_id', userId)
          .eq('group_id', group.id);

        if (membershipErr) {
          errors.push(membershipErr.message);
        } else {
          removed++;
        }
      }

      await supabase.from('admin_audit_log').insert({
        actor_user_id: currentUserProfileId,
        action: 'admin_remove_from_group',
        target: group.name,
        metadata: { group_id: group.id, group_name: group.name, user_count: targetIds.length, removed, errors: errors.length },
      });

      if (errors.length > 0) {
        setStatusMessage({
          type: 'error',
          text: `Removed ${removed}/${targetIds.length} from "${group.name}". Some removals blocked (e.g. last Steward protection).`,
        });
      } else {
        setStatusMessage({
          type: 'success',
          text: `Removed ${removed} user(s) from "${group.name}".`,
        });
      }

      if (clearsSelectionAfterAction('remove')) {
        setSelectedUserIds(new Set());
      }
      refreshData();
    } catch (err: any) {
      console.error('Remove from group failed:', err);
      setStatusMessage({ type: 'error', text: err.message || 'Failed to remove users from group.' });
    }
    setActionInProgress(false);
  };

  // --- Main action handler ---

  const handleAction = (action: ActionName) => {
    if (actionInProgress) return;
    const targetIds = [...selectedUserIds];
    const count = targetIds.length;

    switch (action) {
      case 'activate':
        executeActivate(targetIds);
        break;

      case 'deactivate':
        showConfirm({
          title: 'Deactivate Users?',
          message: `This will deactivate ${count} user${count !== 1 ? 's' : ''} and immediately log them out of all devices. They will not be able to log in until reactivated.`,
          confirmText: 'Deactivate',
          variant: 'warning',
          onConfirm: () => executeDeactivate(targetIds),
        });
        break;

      case 'delete_soft':
        showConfirm({
          title: 'Decommission Users?',
          message: `This will decommission ${count} user${count !== 1 ? 's' : ''}. Their accounts will be permanently disabled and hidden. This is difficult to reverse.`,
          confirmText: 'Decommission',
          variant: 'danger',
          onConfirm: () => executeDecommission(targetIds),
        });
        break;

      case 'delete_hard':
        showConfirm({
          title: 'Permanently Delete Users?',
          message: `This will PERMANENTLY DELETE ${count} user${count !== 1 ? 's' : ''} and ALL their data. This action CANNOT be undone.`,
          confirmText: `Delete ${count} User${count !== 1 ? 's' : ''}`,
          variant: 'danger',
          onConfirm: () => executeHardDelete(targetIds),
        });
        break;

      case 'logout':
        showConfirm({
          title: 'Force Logout Users?',
          message: `This will force ${count} user${count !== 1 ? 's' : ''} to log out from all devices. They will need to log in again.`,
          confirmText: 'Force Logout',
          variant: 'warning',
          onConfirm: () => executeForceLogout(targetIds),
        });
        break;

      case 'message':
        setMessageModalOpen(true);
        break;

      case 'notify':
        setNotifyModalOpen(true);
        break;

      case 'invite':
        setGroupPickerState({ isOpen: true, mode: 'invite' });
        break;

      case 'join':
        setGroupPickerState({ isOpen: true, mode: 'join' });
        break;

      case 'remove':
        setGroupPickerState({ isOpen: true, mode: 'remove' });
        break;
    }
  };

  // Look up full user objects for selected IDs
  const selectedUsers = usersData.filter((u) => selectedUserIds.has(u.id));

  const cards: { type: CardType; title: string; icon: string; statKey: keyof PlatformStats }[] = [
    { type: 'users', title: 'Users', icon: '👥', statKey: 'users' },
    { type: 'groups', title: 'Groups', icon: '🏘️', statKey: 'groups' },
    { type: 'journeys', title: 'Journeys', icon: '🗺️', statKey: 'journeys' },
    { type: 'enrollments', title: 'Enrollments', icon: '📚', statKey: 'enrollments' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500 mt-1">Platform overview and management</p>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          <span>{statusMessage.text}</span>
          <button
            onClick={() => setStatusMessage(null)}
            className="ml-4 text-current opacity-60 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {cards.map((card) => (
          <AdminStatCard
            key={card.type}
            title={card.title}
            value={stats[card.statKey]}
            icon={card.icon}
            loading={loading}
            selected={expandedCard === card.type}
            onClick={() => handleCardClick(card.type)}
          />
        ))}
      </div>

      {/* Expandable Data Panel */}
      {expandedCard && (
        <div className="mb-6">
          <AdminDataPanel
            cardType={expandedCard}
            totalCount={stats[expandedCard]}
            selectedIds={expandedCard === 'users' ? selectedUserIds : undefined}
            onSelectionChange={expandedCard === 'users' ? handleSelectionChange : undefined}
            userFilters={expandedCard === 'users' ? userFilters : undefined}
            onUserFiltersChange={expandedCard === 'users' ? handleUserFiltersChange : undefined}
            onUsersDataChange={expandedCard === 'users' ? handleUsersDataChange : undefined}
            refreshTrigger={expandedCard === 'users' ? refreshKey : undefined}
          />
        </div>
      )}

      {/* Action Bar for Users panel */}
      {expandedCard === 'users' && selectedUserIds.size > 0 && (
        <UserActionBar
          selectedUsers={selectedUsers}
          selectedCount={selectedUserIds.size}
          commonGroupCount={commonGroupCount}
          onAction={handleAction}
        />
      )}

      {/* Loading overlay for action in progress */}
      {actionInProgress && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-20">
          <div className="bg-white rounded-xl shadow-lg px-6 py-4 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-700 font-medium">Processing...</span>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        onConfirm={confirmModal.onConfirm}
        onCancel={closeConfirm}
        variant={confirmModal.variant}
      />

      {/* Message Modal */}
      <MessageModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        selectedCount={selectedUserIds.size}
        onSend={executeMessage}
      />

      {/* Notify Modal */}
      <NotifyModal
        isOpen={notifyModalOpen}
        onClose={() => setNotifyModalOpen(false)}
        selectedCount={selectedUserIds.size}
        onSend={executeNotify}
      />

      {/* Group Picker Modal (invite / join / remove) */}
      <GroupPickerModal
        isOpen={groupPickerState.isOpen}
        onClose={closeGroupPicker}
        mode={groupPickerState.mode}
        selectedUserIds={[...selectedUserIds]}
        onSelect={handleGroupSelected}
      />

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Management</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/admin/deusex"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
          >
            <span className="text-2xl">🔑</span>
            <div>
              <p className="font-medium text-gray-900">DeusEx Members</p>
              <p className="text-sm text-gray-500">Manage platform administrators</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
