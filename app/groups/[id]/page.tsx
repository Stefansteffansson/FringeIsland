'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import Image from 'next/image';

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  label: string | null;
  is_public: boolean;
  show_member_list: boolean;
  created_at: string;
  created_by_user_id: string;
}

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  roles: string[];
  added_at: string;
}

interface UserRole {
  role_name: string;
}

export default function GroupDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const groupId = params.id as string;
  const [group, setGroup] = useState<GroupData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLeader, setIsLeader] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Redirect to login if not authenticated
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
        // Use maybeSingle() instead of single() to avoid error when group doesn't exist
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .maybeSingle();

        // Handle errors
        if (groupError) {
          console.error('Group fetch error:', groupError);
          throw new Error('Failed to load group');
        }
        
        // If no group found
        if (!groupData) {
          throw new Error('Group not found');
        }
        
        setGroup(groupData);

        // Check if user is a member of this group
        const { data: membershipData, error: membershipError } = await supabase
          .from('group_memberships')
          .select('id')
          .eq('group_id', groupId)
          .eq('user_id', userData.id)
          .eq('status', 'active')
          .maybeSingle();

        if (membershipError) {
          throw new Error(membershipError.message || 'Failed to check membership');
        }

        if (!membershipData) {
          // User is not a member
          if (!groupData.is_public) {
            throw new Error('You do not have access to this private group');
          }
        }

        // Get member count
        const { count } = await supabase
          .from('group_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('group_id', groupId)
          .eq('status', 'active');

        setMemberCount(count || 0);

        // Fetch user's roles in this group
        const { data: rolesData, error: rolesError } = await supabase
          .from('user_group_roles')
          .select(`
            group_roles (
              name
            )
          `)
          .eq('user_id', userData.id)
          .eq('group_id', groupId);

        if (rolesError) throw rolesError;

        const roles = rolesData.map((r: any) => ({
          role_name: r.group_roles?.name || 'Unknown'
        }));
        setUserRoles(roles);

        // Check if user is a group leader
        const hasLeaderRole = roles.some(r => r.role_name === 'Group Leader');
        setIsLeader(hasLeaderRole);

        // Fetch members if member list is visible
        if (groupData.show_member_list || hasLeaderRole) {
          // Get all memberships
          const { data: membershipsData, error: membershipsError } = await supabase
            .from('group_memberships')
            .select('user_id, added_at')
            .eq('group_id', groupId)
            .eq('status', 'active');

          if (membershipsError) throw membershipsError;

          // Get user details for all members
          const userIds = membershipsData.map(m => m.user_id);
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, full_name, avatar_url')
            .in('id', userIds);

          if (usersError) throw usersError;

          // Get roles for all members
          const { data: allRolesData, error: allRolesError } = await supabase
            .from('user_group_roles')
            .select(`
              user_id,
              group_roles (
                name
              )
            `)
            .eq('group_id', groupId)
            .in('user_id', userIds);

          if (allRolesError) throw allRolesError;

          // Combine data
          const membersWithRoles = usersData.map(u => {
            const membership = membershipsData.find(m => m.user_id === u.id);
            const userRoleData = allRolesData.filter((r: any) => r.user_id === u.id);
            const roleNames = userRoleData.map((r: any) => r.group_roles?.name || 'Unknown');

            return {
              id: u.id,
              user_id: u.id,
              full_name: u.full_name,
              avatar_url: u.avatar_url,
              roles: roleNames,
              added_at: membership?.added_at || '',
            };
          });

          setMembers(membersWithRoles);
        }

      } catch (err) {
        console.error('Error fetching group:', err);
        setError(err instanceof Error ? err.message : 'Failed to load group');
      } finally {
        setLoading(false);
      }
    };

    if (user && groupId) {
      fetchGroupData();
    }
  }, [user, authLoading, groupId, router, supabase]);

  // Show loading state
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

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Unable to Load Group
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/groups"
              className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Back to My Groups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!group) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Link
          href="/groups"
          className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-6 transition-colors"
        >
          <span className="mr-2">←</span>
          Back to My Groups
        </Link>

        {/* Group Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {group.name}
                </h1>
                {group.is_public ? (
                  <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-full font-medium">
                    Public
                  </span>
                ) : (
                  <span className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full font-medium">
                    Private
                  </span>
                )}
              </div>
              
              {group.label && (
                <span className="inline-block px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 rounded-full mb-3">
                  {group.label}
                </span>
              )}

              {group.description && (
                <p className="text-gray-600 text-lg mb-4">
                  {group.description}
                </p>
              )}

              {/* User's Roles */}
              {userRoles.length > 0 && (
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-sm text-gray-500">Your role:</span>
                  {userRoles.map((role, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full font-medium"
                    >
                      {role.role_name}
                    </span>
                  ))}
                </div>
              )}

              {/* Group Stats */}
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <span className="text-lg">👥</span>
                  <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📅</span>
                  <span>
                    Created {new Date(group.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Edit Button (Leaders Only) */}
            {isLeader && (
              <Link
                href={`/groups/${group.id}/edit`}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-md"
              >
                Edit Group
              </Link>
            )}
          </div>
        </div>

        {/* Members Section */}
        {(group.show_member_list || isLeader) && (
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Members</h2>
            
            {members.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No members to display</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                      {member.avatar_url ? (
                        <Image
                          src={member.avatar_url}
                          alt={member.full_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center text-2xl">
                          👤
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">
                        {member.full_name}
                      </p>
                      {member.roles.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {member.roles.map((role, index) => (
                            <span
                              key={index}
                              className="text-xs px-2 py-0.5 bg-blue-50 text-blue-600 rounded"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl mb-3">📨</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Invite Members
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Add new members to the group
            </p>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Coming Soon →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl mb-3">🎭</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Manage Roles
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Assign roles to members
            </p>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Coming Soon →
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="text-3xl mb-3">🚀</div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Start Journey
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Begin a journey with this group
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
