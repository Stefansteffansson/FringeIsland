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
  const { userProfile } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (!userProfile?.personal_group_id || !groupId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();

    const { data, error: rpcError } = await supabase.rpc(
      'get_user_permissions',
      {
        p_acting_group_id: userProfile.personal_group_id,
        p_context_group_id: groupId,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setPermissions([]);
    } else {
      setPermissions(data || []);
    }

    setLoading(false);
  }, [userProfile, groupId]);

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
