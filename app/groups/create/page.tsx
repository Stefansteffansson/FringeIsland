'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import GroupCreateForm from '@/components/groups/GroupCreateForm';

export default function CreateGroupPage() {
  const { user, loading: authLoading } = useAuth();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Get user's database ID
    const fetchUserId = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();

        if (error) throw error;
        setUserId(data.id);
      } catch (err) {
        console.error('Error fetching user ID:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchUserId();
    }
  }, [user, authLoading, router, supabase]);

  // Show loading state
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              Error Loading User
            </h2>
            <p className="text-gray-600 mb-6">
              Could not load your user information
            </p>
            <button
              onClick={() => router.push('/groups')}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Back to Groups
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Create New Group
          </h1>
          <p className="text-gray-600">
            Start a new team, organization, or learning cohort
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <GroupCreateForm userId={userId} />
        </div>

        {/* Info Section */}
        <div className="mt-6 p-6 bg-white rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            ℹ️ About Groups
          </h3>
          <ul className="space-y-2 text-sm text-gray-600">
            <li>• You will automatically become the group leader</li>
            <li>• Group leaders can invite members and assign roles</li>
            <li>• Public groups can be discovered by anyone</li>
            <li>• Private groups are invite-only</li>
            <li>• You can change these settings later</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
