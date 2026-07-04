'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { GroupDetailPanel } from '@/components/groups/GroupDetailPanel';
import { fetchGroupDetail, GroupsApiError } from '@/lib/groups/client';
import type { GroupDetail } from '@/lib/groups/queries';

/**
 * FEAT-H013 STORY-2 — the /groups/[id] surface (GRP-4 detail · GRP-5).
 * FIM-only per the house gate (journal precedent): sessionless → sign-in with
 * the destination preserved; a Mist → the entry. The BFF's 404 renders the
 * house not-found — a private group and an absent one look identical (the
 * FEAT-PC010 no-leak rule, carried to the surface). Mutations inside the
 * panel re-read through the same load path (never optimistic).
 */
export default function GroupDetailPage() {
  const { user, identity, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const groupId = params.id;

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || identity === 'sessionless') {
      router.replace(`/login?redirect=/groups/${groupId}`);
      return;
    }
    if (identity === 'mist') {
      router.replace('/');
    }
  }, [user, identity, authLoading, router, groupId]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const detail = await fetchGroupDetail(groupId);
      setGroup(detail);
      setNotFound(false);
    } catch (err) {
      if (err instanceof GroupsApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError('Failed to load the group.');
      }
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (authLoading || identity !== 'fim') return;
    void load();
  }, [authLoading, identity, load]);

  return (
    <AppShell title="Group">
      {authLoading || identity !== 'fim' || (loading && !group) ? (
        <LoadingState label="Opening the group..." />
      ) : notFound ? (
        <EmptyState title="Group not found" description="It may be private, or it may not exist." />
      ) : error ? (
        <InlineError message={error} />
      ) : group ? (
        <GroupDetailPanel group={group} onRefresh={() => void load()} />
      ) : null}
    </AppShell>
  );
}
