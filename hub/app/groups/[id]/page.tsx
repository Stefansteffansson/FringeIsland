'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { InlineError } from '@/components/ui/InlineError';
import { GroupDetailPanel } from '@/components/groups/GroupDetailPanel';
import { RolesPanel } from '@/components/groups/RolesPanel';
import { InvitationsPanel } from '@/components/groups/InvitationsPanel';
import { MyPermissionsPanel } from '@/components/groups/MyPermissionsPanel';
import {
  fetchGroupDetail,
  fetchGroupInvitations,
  fetchGroupRoles,
  fetchMyPermissions,
  GroupsApiError,
  type PendingInvitations,
  type RolesReadResult,
} from '@/lib/groups/client';
import type { GroupDetail } from '@/lib/groups/queries';

/**
 * FEAT-H013 STORY-2 — the /groups/[id] surface (GRP-4 detail · GRP-5).
 * FIM-only per the house gate (journal precedent): sessionless → sign-in with
 * the destination preserved; a Mist → the entry. The BFF's 404 renders the
 * house not-found — a private group and an absent one look identical (the
 * FEAT-PC010 no-leak rule, carried to the surface). Mutations inside the
 * panels re-read through the same load path (never optimistic).
 *
 * FEAT-H014 (GRP-6/7/8): the page composes three reads — detail, role fabric
 * (+ templates), effective permissions — with ONE refresh path (STORY-4: any
 * mutation re-reads all three together). The fabric and permissions reads
 * fail panel-locally (STORY-1: the rest of the page stands).
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
  const [rolesData, setRolesData] = useState<RolesReadResult | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[] | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<PendingInvitations | null>(null);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);

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

  const loadRoles = useCallback(async () => {
    setRolesError(null);
    try {
      setRolesData(await fetchGroupRoles(groupId));
    } catch {
      // Panel-local: the roles panel shows this; the page stands.
      setRolesData(null);
      setRolesError('Failed to load the roles.');
    }
  }, [groupId]);

  // FEAT-H015: the pending list is meaningful only for an invite_members
  // holder (the contract 403s everyone else — Open Q3), so the read chains off
  // the fresh permissions payload instead of probing and eating a refusal.
  const loadInvitations = useCallback(
    async (perms: string[] | null) => {
      if (!perms?.includes('invite_members')) {
        setInvitations(null);
        setInvitationsError(null);
        return;
      }
      try {
        setInvitations(await fetchGroupInvitations(groupId));
        setInvitationsError(null);
      } catch {
        // Panel-local: the invitations panel shows this; the page stands.
        setInvitations(null);
        setInvitationsError('Failed to load invitations.');
      }
    },
    [groupId],
  );

  const loadPermissions = useCallback(async () => {
    setPermissionsError(null);
    try {
      const perms = await fetchMyPermissions(groupId);
      setPermissions(perms);
      void loadInvitations(perms);
    } catch {
      setPermissions(null);
      setPermissionsError('Failed to load your permissions.');
      setInvitations(null);
    }
  }, [groupId, loadInvitations]);

  // The one refresh path (FEAT-H014 STORY-4): every mutation re-reads all three.
  const loadAll = useCallback(() => {
    void load();
    void loadRoles();
    void loadPermissions();
  }, [load, loadRoles, loadPermissions]);

  useEffect(() => {
    if (authLoading || identity !== 'fim') return;
    loadAll();
  }, [authLoading, identity, loadAll]);

  return (
    <AppShell title="Group">
      {authLoading || identity !== 'fim' || (loading && !group) ? (
        <LoadingState label="Opening the group..." />
      ) : notFound ? (
        <EmptyState title="Group not found" description="It may be private, or it may not exist." />
      ) : error ? (
        <InlineError message={error} />
      ) : group ? (
        <div className="space-y-6">
          <GroupDetailPanel
            group={group}
            fabric={rolesData?.fabric ?? null}
            permissions={permissions}
            onRefresh={loadAll}
            onLeft={() => router.replace('/groups')}
          />
          <RolesPanel
            groupId={groupId}
            fabric={rolesData?.fabric ?? null}
            templates={rolesData?.templates ?? []}
            error={rolesError}
            onMutated={loadAll}
          />
          <InvitationsPanel
            groupId={groupId}
            permissions={permissions}
            pending={invitations}
            error={invitationsError}
            onMutated={loadAll}
          />
          <MyPermissionsPanel
            permissions={permissions}
            error={permissionsError}
            onReload={() => void loadPermissions()}
          />
        </div>
      ) : null}
    </AppShell>
  );
}
