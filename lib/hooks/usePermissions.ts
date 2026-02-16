'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/AuthContext';

interface UsePermissionsResult {
  permissions: string[];
  loading: boolean;
  error: string | null;
  hasPermission: (permissionName: string) => boolean;
  refetch: () => Promise<void>;
}

export function usePermissions(groupId: string | null): UsePermissionsResult {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!user || !groupId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Get the public user ID from auth user ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (userError || !userData) {
      setError('Failed to resolve user');
      setPermissions([]);
      setLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc(
      'get_user_permissions',
      {
        p_user_id: userData.id,
        p_group_id: groupId,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setPermissions([]);
    } else {
      setPermissions(data || []);
    }

    setLoading(false);
  }, [user, groupId]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (permissionName: string): boolean => {
      return permissions.includes(permissionName);
    },
    [permissions]
  );

  return { permissions, loading, error, hasPermission, refetch: fetchPermissions };
}
