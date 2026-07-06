/**
 * FEAT-H018 — the group-of-groups acting wrappers (Cycle G-F, FEAT-PC015).
 *
 * All contracts self-gate in the substrate (FIM-only, the ADR-U041 §1
 * two-step wielding walk, P0002 no-leak, honest 22023/P0001 refusals); these
 * wrappers only shape the calls and rethrow the SQLSTATE-carrying errors for
 * the routes to map. Acting contexts are DIRECT empowerments (§2d — never
 * Tier-1 reach, never a chained hop); the contract decides, the Hub relays.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export interface ActingContext {
  group_id: string;
  name: string;
}

export interface ActingMembership {
  membership_id: string;
  group_id: string;
  name: string;
  status: string;
}

/** The act-as selector's data source: groups the caller may act as. */
export async function fetchActingContexts(supabase: SupabaseClient): Promise<ActingContext[]> {
  const { data, error } = await supabase.rpc('get_acting_contexts');
  if (error) throw error;
  return (data ?? []) as ActingContext[];
}

/** ADR-U041 §2a substitution: the acting group's effective permissions. */
export async function fetchPermissionsActingAs(
  supabase: SupabaseClient,
  actingGroupId: string,
  contextGroupId: string,
): Promise<string[]> {
  const { data, error } = await supabase.rpc('get_user_permissions', {
    p_acting_group_id: actingGroupId,
    p_context_group_id: contextGroupId,
  });
  if (error) throw error;
  return (data ?? []) as string[];
}

/** A wielded group's memberships + pending invitations (act_as_group-gated). */
export async function fetchGroupMembershipsOf(
  supabase: SupabaseClient,
  actingGroupId: string,
): Promise<ActingMembership[]> {
  const { data, error } = await supabase.rpc('get_group_memberships_of', {
    p_acting_group_id: actingGroupId,
  });
  if (error) throw error;
  return (data ?? []) as ActingMembership[];
}

/** MEM-10 admission: invite an engagement group (invite_members-gated). */
export async function inviteGroup(
  supabase: SupabaseClient,
  groupId: string,
  invitedGroupId: string,
): Promise<{ membership_id: string }> {
  const { data, error } = await supabase.rpc('invite_group', {
    p_group_id: groupId,
    p_invited_group_id: invitedGroupId,
  });
  if (error) throw error;
  return data as { membership_id: string };
}

/** The D3-precedent typeahead for groups (cap 8 contract-side). */
export async function searchInvitableGroups(
  supabase: SupabaseClient,
  groupId: string,
  query: string,
): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await supabase.rpc('search_invitable_groups', {
    p_group_id: groupId,
    p_query: query,
  });
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; name: string }>;
}

/** The wielded answer: accept flips invited→active (role auto-bind rides). */
export async function respondToGroupInvitation(
  supabase: SupabaseClient,
  membershipId: string,
  accept: boolean,
): Promise<{ membership_id: string; status: string }> {
  const { data, error } = await supabase.rpc('respond_to_group_invitation', {
    p_membership_id: membershipId,
    p_accept: accept,
  });
  if (error) throw error;
  return data as { membership_id: string; status: string };
}

/** The wielded voluntary exit (last-Steward / last-member refused honestly). */
export async function leaveGroupAsGroup(
  supabase: SupabaseClient,
  groupId: string,
  actingGroupId: string,
): Promise<{ group_id: string; acting_group_id: string }> {
  const { data, error } = await supabase.rpc('leave_group_as_group', {
    p_group_id: groupId,
    p_acting_group_id: actingGroupId,
  });
  if (error) throw error;
  return data as { group_id: string; acting_group_id: string };
}
