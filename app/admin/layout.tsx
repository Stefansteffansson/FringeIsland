'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userProfile, loading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const checkPermission = async () => {
      if (!userProfile) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        // Check manage_all_groups permission (Tier 1 — works with any group_id)
        const { data, error } = await supabase.rpc('has_permission', {
          p_user_id: userProfile.id,
          p_group_id: '00000000-0000-0000-0000-000000000000',
          p_permission_name: 'manage_all_groups',
        });

        if (error) {
          console.error('Permission check error:', error);
          setHasAccess(false);
        } else {
          setHasAccess(data === true);
        }
      } catch (err) {
        console.error('Admin access check failed:', err);
        setHasAccess(false);
      }

      setLoading(false);
    };

    checkPermission();
  }, [user, authLoading, router, supabase]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Checking access...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don&apos;t have permission to access the admin panel.
            This area is restricted to platform administrators.
          </p>
          <button
            onClick={() => router.push('/groups')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            Go to My Groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}
