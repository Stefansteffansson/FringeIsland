'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface OrphanedGroup {
  id: string;
  name: string;
  created_by_group_id: string;
  creator_name: string;
}

export default function AdminFixOrphansPage() {
  const { user, userProfile } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [orphanedGroups, setOrphanedGroups] = useState<OrphanedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [fixing, setFixing] = useState<string | null>(null);

  useEffect(() => {
    const findOrphanedGroups = async () => {
      if (!user) return;

      try {
        // Get all groups
        const { data: allGroups, error: groupsError } = await supabase
          .from('groups')
          .select('id, name, created_by_group_id');

        if (groupsError) throw groupsError;

        // Check each group for Group Leader
        const orphaned: OrphanedGroup[] = [];

        for (const group of allGroups || []) {
          // Count Group Leaders in this group
          const { data: leaderRoles, error: rolesError } = await supabase
            .from('user_group_roles')
            .select(`
              id,
              group_roles!inner (
                name
              )
            `)
            .eq('group_id', group.id)
            .eq('group_roles.name', 'Steward');

          if (rolesError) throw rolesError;

          // If no leaders, it's orphaned
          if (!leaderRoles || leaderRoles.length === 0) {
            // Get creator name from their personal group
            const { data: creatorGroup } = await supabase
              .from('groups')
              .select('name')
              .eq('id', group.created_by_group_id)
              .single();

            orphaned.push({
              id: group.id,
              name: group.name,
              created_by_group_id: group.created_by_group_id,
              creator_name: creatorGroup?.name || 'Unknown',
            });
          }
        }

        setOrphanedGroups(orphaned);
      } catch (err) {
        console.error('Error finding orphaned groups:', err);
        alert('Failed to scan for orphaned groups');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      findOrphanedGroups();
    }
  }, [user, supabase]);

  const fixOrphanedGroup = async (group: OrphanedGroup) => {
    if (!userProfile) return;

    setFixing(group.id);

    try {
      // Find Steward role for this group
      const { data: stewardRole, error: roleError } = await supabase
        .from('group_roles')
        .select('id')
        .eq('group_id', group.id)
        .eq('name', 'Steward')
        .single();

      if (roleError) throw roleError;

      // Assign original creator as Steward
      const { error: assignError } = await supabase
        .from('user_group_roles')
        .insert({
          member_group_id: group.created_by_group_id,
          group_id: group.id,
          group_role_id: stewardRole.id,
          assigned_by_group_id: userProfile.personal_group_id,
        });

      if (assignError) throw assignError;

      // Success! Remove from orphaned list
      setOrphanedGroups(prev => prev.filter(g => g.id !== group.id));
      alert(`Fixed! ${group.creator_name} is now Steward of "${group.name}"`);
    } catch (err: any) {
      console.error('Error fixing orphaned group:', err);
      alert(`Failed to fix group: ${err.message}`);
    } finally {
      setFixing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Scanning for orphaned groups...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🔧 Fix Orphaned Groups
          </h1>
          <p className="text-gray-600 mb-8">
            Groups without any Steward need to be fixed
          </p>

          {orphanedGroups.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                All Groups Have Stewards!
              </h2>
              <p className="text-gray-600">
                No orphaned groups found. Everything looks good!
              </p>
              <button
                onClick={() => router.push('/groups')}
                className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Back to Groups
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-red-600">
                  ⚠️ Found {orphanedGroups.length} orphaned group{orphanedGroups.length !== 1 ? 's' : ''}
                </p>
              </div>

              {orphanedGroups.map((group) => (
                <div
                  key={group.id}
                  className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {group.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Created by: <span className="font-semibold">{group.creator_name}</span>
                      </p>
                      <div className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        No Steward
                      </div>
                    </div>

                    <button
                      onClick={() => fixOrphanedGroup(group)}
                      disabled={fixing === group.id}
                      className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                    >
                      {fixing === group.id ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Fixing...
                        </span>
                      ) : (
                        '✓ Fix Group'
                      )}
                    </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-sm text-gray-600">
                      <strong>Solution:</strong> Will assign <span className="font-semibold">{group.creator_name}</span> (original creator) as Steward
                    </p>
                  </div>
                </div>
              ))}

              <div className="mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={() => router.push('/groups')}
                  className="text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ← Back to Groups
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
