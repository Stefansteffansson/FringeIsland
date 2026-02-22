'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Group {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  is_public: boolean;
  created_at: string;
  member_count?: number;
}

export default function GroupsPage() {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Fetch user's groups
    const fetchGroups = async () => {
      if (!userProfile) return;

      try {
        // Get group IDs where user is a member
        const { data: memberships, error: membershipsError } = await supabase
          .from('group_memberships')
          .select('group_id')
          .eq('member_group_id', userProfile.personal_group_id)
          .eq('status', 'active');

        if (membershipsError) throw membershipsError;

        if (!memberships || memberships.length === 0) {
          setGroups([]);
          setLoading(false);
          return;
        }

        // Parallel: fetch group data + batch member counts
        const groupIds = memberships.map(m => m.group_id);
        const [groupsResult, countsResult] = await Promise.all([
          supabase
            .from('groups')
            .select('id, name, description, label, is_public, created_at')
            .in('id', groupIds)
            .eq('group_type', 'engagement'),
          supabase.rpc('get_group_member_counts', { p_group_ids: groupIds }),
        ]);

        if (groupsResult.error) throw groupsResult.error;

        // Build a map of group_id → member_count
        const countMap = new Map<string, number>();
        if (countsResult.data) {
          for (const row of countsResult.data) {
            countMap.set(row.group_id, Number(row.member_count));
          }
        }

        const groupsWithCounts = (groupsResult.data || []).map(group => ({
          ...group,
          member_count: countMap.get(group.id) || 0,
        }));

        setGroups(groupsWithCounts);
      } catch (err) {
        console.error('Error fetching groups:', err);
        setError('Failed to load groups');
      } finally {
        setLoading(false);
      }
    };

    if (userProfile) {
      fetchGroups();
    }
  }, [user, userProfile, authLoading, router, supabase]);

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              My Groups
            </h1>
            <p className="text-gray-600">
              Teams, organizations, and cohorts you belong to
            </p>
          </div>
          <Link
            href="/groups/create"
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-md"
          >
            + Create Group
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Groups List */}
        {groups.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">👥</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No Groups Yet
            </h2>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              You haven&apos;t joined or created any groups yet. Create your first group to get started!
            </p>
            <Link
              href="/groups/create"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Create Your First Group
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow p-6 border border-gray-100 hover:border-blue-200"
              >
                {/* Group Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800 mb-1 line-clamp-1">
                      {group.name}
                    </h3>
                    {group.label && (
                      <span className="inline-block px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded">
                        {group.label}
                      </span>
                    )}
                  </div>
                  {group.is_public ? (
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded font-medium">
                      Public
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded font-medium">
                      Private
                    </span>
                  )}
                </div>

                {/* Description */}
                {group.description && (
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {group.description}
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center text-gray-500 text-sm">
                    <span className="mr-1">👥</span>
                    <span>{group.member_count} {group.member_count === 1 ? 'member' : 'members'}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(group.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl mb-3">🔍</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Discover Groups
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Find public groups to join
            </p>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Coming Soon →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl mb-3">📨</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Invitations
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              View pending group invites
            </p>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Coming Soon →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl mb-3">⚙️</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Settings
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Manage group preferences
            </p>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Coming Soon →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
