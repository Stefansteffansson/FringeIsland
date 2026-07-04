import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H015 — fetchers over the FEAT-PC012 invitation contracts (ADR-U038:
 * every rule lives substrate-side; these relay and type the payloads).
 */

export interface SearchHit {
  member_group_id: string;
  display_name: string;
  /** The hit's membership status in the target group (null = not a member). */
  membership_status: string | null;
}

export interface MemberInvitation {
  member_group_id: string;
  display_name: string;
  invited_at: string;
  invited_by_display_name: string | null;
}

export interface EmailInvitation {
  id: string;
  invited_email: string;
  created_at: string;
  expires_at: string;
  /** Predicate-based (expires_at), computed substrate-side — no client date math. */
  expired: boolean;
}

export interface PendingInvitations {
  group_id: string;
  member_invitations: MemberInvitation[];
  email_invitations: EmailInvitation[];
}

export interface MyInvitation {
  group_id: string;
  group_name: string;
  group_description: string | null;
  is_public: boolean;
  invited_at: string;
  invited_by_display_name: string | null;
}

/** The contract's answer to an email invite — an existing FIM's email converts
 *  server-side to a membership invitation (PC012 Open Q2). */
export interface InviteByEmailResult {
  kind: 'email_invitation' | 'member_invitation';
}

/** MEM-1 search (D3 — the DS-6 re-home seam): name-partial + exact-email, cap 8. */
export async function searchInvitableMembers(
  supabase: SupabaseClient,
  groupId: string,
  query: string,
): Promise<SearchHit[]> {
  const { data, error } = await supabase.rpc('search_invitable_members', {
    p_group_id: groupId,
    p_query: query,
  });
  if (error) throw error;
  return data as SearchHit[];
}

/** MEM-1: invite an existing FIM; the durable notification row rides substrate-side. */
export async function inviteMember(
  supabase: SupabaseClient,
  groupId: string,
  memberGroupId: string,
): Promise<void> {
  const { error } = await supabase.rpc('invite_member', {
    p_group_id: groupId,
    p_member_group_id: memberGroupId,
  });
  if (error) throw error;
}

/** MEM-2 (D4): durable pending row, NO dispatch — the invitation waits at sign-up. */
export async function inviteByEmail(
  supabase: SupabaseClient,
  groupId: string,
  email: string,
): Promise<InviteByEmailResult> {
  const { data, error } = await supabase.rpc('invite_by_email', {
    p_group_id: groupId,
    p_email: email,
  });
  if (error) throw error;
  return data as InviteByEmailResult;
}

/** STORY-4 read: both invitation kinds; invite_members-gated substrate-side. */
export async function fetchGroupInvitations(
  supabase: SupabaseClient,
  groupId: string,
): Promise<PendingInvitations> {
  const { data, error } = await supabase.rpc('get_group_invitations', {
    p_group_id: groupId,
  });
  if (error) throw error;
  return data as PendingInvitations;
}

export async function cancelMemberInvitation(
  supabase: SupabaseClient,
  groupId: string,
  memberGroupId: string,
): Promise<void> {
  const { error } = await supabase.rpc('cancel_member_invitation', {
    p_group_id: groupId,
    p_member_group_id: memberGroupId,
  });
  if (error) throw error;
}

export async function cancelEmailInvitation(
  supabase: SupabaseClient,
  invitationId: string,
): Promise<void> {
  const { error } = await supabase.rpc('cancel_email_invitation', {
    p_invitation_id: invitationId,
  });
  if (error) throw error;
}

/** MEM-3 read: the caller's own pending invitations — invitation context only. */
export async function fetchMyInvitations(
  supabase: SupabaseClient,
): Promise<MyInvitation[]> {
  const { data, error } = await supabase.rpc('get_my_invitations');
  if (error) throw error;
  return data as MyInvitation[];
}

/** MEM-3: invited→active; Member-role auto-bind + notification ride substrate-side. */
export async function acceptGroupInvitation(
  supabase: SupabaseClient,
  groupId: string,
): Promise<void> {
  const { error } = await supabase.rpc('accept_group_invitation', {
    p_group_id: groupId,
  });
  if (error) throw error;
}

/** MEM-3: decline (row deleted; re-invitation stays possible). */
export async function declineGroupInvitation(
  supabase: SupabaseClient,
  groupId: string,
): Promise<void> {
  const { error } = await supabase.rpc('decline_group_invitation', {
    p_group_id: groupId,
  });
  if (error) throw error;
}
