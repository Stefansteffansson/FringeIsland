'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AdminStatCard from '@/components/admin/AdminStatCard';
import AdminDataPanel from '@/components/admin/AdminDataPanel';
import UserActionBar from '@/components/admin/UserActionBar';
import type { AdminUser } from '@/lib/admin/user-filter';
import type { ActionName } from '@/lib/admin/action-bar-logic';

type CardType = 'users' | 'groups' | 'journeys' | 'enrollments';

interface PlatformStats {
  users: number | null;
  groups: number | null;
  journeys: number | null;
  enrollments: number | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<PlatformStats>({
    users: null,
    groups: null,
    journeys: null,
    enrollments: null,
  });
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<CardType | null>(null);
  const [showDecommissioned, setShowDecommissioned] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [usersData, setUsersData] = useState<AdminUser[]>([]);
  const supabase = createClient();

  const fetchStats = useCallback(async () => {
    try {
      // Users count: default shows active + inactive (excludes decommissioned)
      const usersQuery = showDecommissioned
        ? supabase.from('users').select('*', { count: 'exact', head: true })
        : supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_decommissioned', false);

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
  }, [supabase, showDecommissioned]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCardClick = (cardType: CardType) => {
    setExpandedCard((prev) => (prev === cardType ? null : cardType));
  };

  const handleShowDecommissionedChange = (show: boolean) => {
    setShowDecommissioned(show);
  };

  const handleSelectionChange = (newSelection: Set<string>) => {
    setSelectedUserIds(newSelection);
  };

  const handleUsersDataChange = (data: AdminUser[]) => {
    setUsersData(data);
  };

  const handleAction = (action: ActionName) => {
    // Stub — actions will be wired in Sub-Sprint 3C
    console.log(`Action "${action}" triggered for ${selectedUserIds.size} users:`, [...selectedUserIds]);
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
            showDecommissioned={expandedCard === 'users' ? showDecommissioned : undefined}
            onShowDecommissionedChange={expandedCard === 'users' ? handleShowDecommissionedChange : undefined}
            onUsersDataChange={expandedCard === 'users' ? handleUsersDataChange : undefined}
          />
        </div>
      )}

      {/* Action Bar for Users panel */}
      {expandedCard === 'users' && selectedUserIds.size > 0 && (
        <UserActionBar
          selectedUsers={selectedUsers}
          selectedCount={selectedUserIds.size}
          commonGroupCount={0}
          onAction={handleAction}
        />
      )}

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
