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
import { GroupMembershipsPanel } from '@/components/groups/GroupMembershipsPanel';
import { InviteGroupPanel } from '@/components/groups/InviteGroupPanel';
import { GroupJourneysSection } from '@/components/groups/GroupJourneysSection';
import { GroupConversationsSection } from '@/components/groups/GroupConversationsSection';
import { GroupAnnouncementsSection } from '@/components/groups/GroupAnnouncementsSection';
import { GroupForumSection } from '@/components/groups/GroupForumSection';
import { GroupJourneyProgressSection } from '@/components/groups/GroupJourneyProgressSection';
import { SuspendedGroupShell } from '@/components/groups/SuspendedGroupShell';
import {
  fetchActingContexts,
  fetchGroupDetailEnvelope,
  fetchGroupInvitations,
  fetchGroupRoles,
  fetchMembershipsOf,
  fetchMyPermissions,
  fetchMyPermissionsActingAs,
  GroupsApiError,
  isGroupDetailShell,
  type ActingContext,
  type ActingMembership,
  type PendingInvitations,
  type RolesReadResult,
} from '@/lib/groups/client';
import type { GroupDetailPayload } from '@/lib/groups/queries';
import type { GroupEnrollmentSummary } from '@/lib/journeys/queries';

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

  const [group, setGroup] = useState<GroupDetailPayload | null>(null);
  // FEAT-H019 STORY-6: the enrolment-summary slice envelope rides the detail
  // response (ADR-U042) — rendered honestly by GroupJourneysSection.
  const [journeySlice, setJourneySlice] = useState<{
    data?: GroupEnrollmentSummary;
    error?: string;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [rolesData, setRolesData] = useState<RolesReadResult | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[] | null>(null);
  // FEAT-H017: the caller's own member_group_id rides the my-permissions
  // payload — the nominate pick-list's payload-driven self-exclusion.
  const [viewerMemberGroupId, setViewerMemberGroupId] = useState<string | null>(null);
  const [permissionsError, setPermissionsError] = useState<string | null>(null);
  const [invitations, setInvitations] = useState<PendingInvitations | null>(null);
  const [invitationsError, setInvitationsError] = useState<string | null>(null);
  // FEAT-H018: the wieldable groups (STORY-1), the substitution read's result,
  // and — when THIS page is a wielded group — its memberships panel data.
  const [actingContexts, setActingContexts] = useState<ActingContext[]>([]);
  const [actingAs, setActingAs] = useState('myself');
  const [actingPermissions, setActingPermissions] = useState<string[] | null>(null);
  const [memberships, setMemberships] = useState<ActingMembership[] | null>(null);
  const [membershipsError, setMembershipsError] = useState<string | null>(null);

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
      const { group: detail, enrollments } = await fetchGroupDetailEnvelope(groupId);
      setGroup(detail);
      setJourneySlice(enrollments);
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
      const { permissions: perms, member_group_id } = await fetchMyPermissions(groupId);
      setPermissions(perms);
      setViewerMemberGroupId(member_group_id);
      void loadInvitations(perms);
    } catch {
      setPermissions(null);
      setViewerMemberGroupId(null);
      setPermissionsError('Failed to load your permissions.');
      setInvitations(null);
    }
  }, [groupId, loadInvitations]);

  // FEAT-H018: the acting-contexts read gates the memberships panel (no fake
  // doors — only a wielder of THIS group sees its belongs-to panel), and the
  // selector's group options. Panel-local failures; the page stands.
  const loadActing = useCallback(async () => {
    try {
      // Context-scoped (post-6-done fix): rows carry is_member_of_context so
      // the selector offers only hats with standing here; the full list still
      // gates the memberships panel below.
      const contexts = await fetchActingContexts(groupId);
      setActingContexts(contexts);
      if (contexts.some((c) => c.group_id === groupId)) {
        try {
          setMemberships(await fetchMembershipsOf(groupId));
          setMembershipsError(null);
        } catch {
          setMemberships(null);
          setMembershipsError('Failed to load memberships.');
        }
      } else {
        setMemberships(null);
        setMembershipsError(null);
      }
    } catch {
      setActingContexts([]);
      setMemberships(null);
    }
  }, [groupId]);

  // FEAT-H018 STORY-1 (ADR-U041 §2a): switching the hat re-reads the panel as
  // the chosen group — pure substitution, never mixed with the personal read.
  const changeActingAs = useCallback(
    async (value: string) => {
      setActingAs(value);
      if (value === 'myself') {
        setActingPermissions(null);
        return;
      }
      try {
        setActingPermissions(await fetchMyPermissionsActingAs(groupId, value));
      } catch {
        setActingPermissions(null);
        setPermissionsError('Failed to load the acting permissions.');
      }
    },
    [groupId],
  );

  // The one refresh path (FEAT-H014 STORY-4): every mutation re-reads all
  // reads together (FEAT-H018 adds the acting pair).
  const loadAll = useCallback(() => {
    void load();
    void loadRoles();
    void loadPermissions();
    void loadActing();
  }, [load, loadRoles, loadPermissions, loadActing]);

  useEffect(() => {
    if (authLoading || identity !== 'fim') return;
    loadAll();
  }, [authLoading, identity, loadAll]);

  // W-07 (gate walk 2026-07-27): answering a notification changes THIS page's
  // data — accepting a stewardship nomination grants a role here and removes a
  // member here — but the response happens in the bell, which floats above
  // whatever page the member is standing on. The walk caught the page still
  // listing a member the accept had just removed, and withholding the role it
  // had just granted, until a manual reload.
  //
  // `refreshNavigation` is the house channel for exactly this (MessagesLink,
  // AccountMenu and NotificationBell all listen); the notification response now
  // fires it, and this page re-reads the same set it reads on mount.
  useEffect(() => {
    if (authLoading || identity !== 'fim') return;
    const onRefresh = () => loadAll();
    window.addEventListener('refreshNavigation', onRefresh);
    return () => window.removeEventListener('refreshNavigation', onRefresh);
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
        isGroupDetailShell(group) ? (
          // FEAT-H038 STORY-5 (FEAT-PC023 STORY-7): the contract answered with
          // the minimal suspended payload — found, labeled, and that's it. The
          // shell is the whole page body: no panels, no sections, no actions.
          // Payload-driven: an admin's FULL payload for a suspended group takes
          // the normal branch below.
          <SuspendedGroupShell group={group} />
        ) : (
        <div className="space-y-6">
          <GroupDetailPanel
            group={group}
            fabric={rolesData?.fabric ?? null}
            permissions={permissions}
            viewerMemberGroupId={viewerMemberGroupId}
            onRefresh={loadAll}
            onLeft={() => router.replace('/groups')}
          />
          {/* FEAT-H019 STORY-6: the group's journeys — the GRP-4 seam filled. */}
          <GroupJourneysSection enrollments={journeySlice} />
          {/* FEAT-H022 STORY-3/4: the consent-shaped group progress panel, beside
              the journeys section. Renders only for a view_group_progress holder
              (from the effective-permissions read already fetched above). */}
          <GroupJourneyProgressSection
            groupId={groupId}
            permissions={permissions}
            enrollments={journeySlice}
          />
          {/* FEAT-H025 STORY-6 (COM-15, CB-7): the group's conversations — a
              failure-isolated slice; create renders only on the platform's
              create_group_conversations grant. */}
          <GroupConversationsSection groupId={groupId} />
          {/* FEAT-H028 STORY-1/2 (COM-8): the group's announcement board — a
              failure-isolated slice above the forum; compose/retract render
              only on the platform's send_announcements grant. */}
          <GroupAnnouncementsSection groupId={groupId} />
          {/* FEAT-H026 — the group forum (COM-5/6a/6b/7/14). Failure-isolated
              slice; post/reply/remove render only on the platform's grants. */}
          <GroupForumSection groupId={groupId} />
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
          {permissions?.includes('invite_members') && (
            // FEAT-H018 STORY-2: the group-admission door, key-gated like the
            // member invitations panel above it.
            <InviteGroupPanel groupId={groupId} onMutated={loadAll} />
          )}
          {actingContexts.some((c) => c.group_id === groupId) && (
            // FEAT-H018 STORY-3: this member wields THIS group — its
            // belongs-to panel renders (and only then; no fake doors).
            <GroupMembershipsPanel
              actingGroup={{ id: groupId, name: group.name }}
              rows={memberships}
              error={membershipsError}
              onMutated={loadAll}
            />
          )}
          <MyPermissionsPanel
            permissions={actingAs === 'myself' ? permissions : actingPermissions}
            error={permissionsError}
            onReload={() => void loadPermissions()}
            actingContexts={actingContexts.filter(
              // Only hats with standing HERE: active members of this group,
              // never the group itself (post-6-done fix — live testing).
              (c) => c.group_id !== groupId && c.is_member_of_context === true,
            )}
            actingAs={actingAs}
            onActAsChange={(v) => void changeActingAs(v)}
          />
        </div>
        )
      ) : null}
    </AppShell>
  );
}
