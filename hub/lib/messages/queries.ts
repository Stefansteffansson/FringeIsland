import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H025 — server-side couriers over the FEAT-PD008 conversation contracts
 * (Cycle C-A). Every read and write goes through the platform RPCs — never a
 * direct table touch (ADR-U009/U038; the substrate refuses direct writes
 * anyway: the C-A migration narrowed every write to the contracts). These run
 * in BFF routes with the caller's session client, so the substrate sees the
 * real actor (the four-hop personal-group chain).
 */

export interface ConversationSummary {
  id: string;
  kind: string;
  title: string | null;
  group_id: string | null;
  group_name: string | null;
  other_participant_name: string | null;
  last_message_at: string | null;
  has_unread: boolean;
}

export interface ConversationMessage {
  id: string;
  sender_group_id: string | null;
  content: string;
  created_at: string;
}

export interface ConversationParticipant {
  participant_group_id: string;
  name: string | null;
  joined_at: string;
  left_at: string | null;
  is_me: boolean;
}

/** COM-14 (C-B, FEAT-PD009) — the platform-resolved attribution ladder, now
 *  carried by the conversation-detail sender map. Shared shape with the forum
 *  (`lib/forum/queries.ts`); the client never computes membership. */
export interface AuthorDisplay {
  display_name: string;
  attribution: 'active' | 'former' | 'unknown';
}

export interface ConversationDetail {
  id: string;
  kind: string;
  title: string | null;
  group_id: string | null;
  group_name: string | null;
  messages: ConversationMessage[];
  /** Display resolution for every sender in the page (departed/erased included).
   *  COM-14 (C-B): each value is the resolved `{display_name, attribution}` —
   *  active name / 'Former member' / 'Unknown'. */
  senders: Record<string, AuthorDisplay>;
  participants: ConversationParticipant[];
  my_last_read_at: string;
}

export interface GroupConversationRow {
  id: string;
  title: string | null;
  created_at: string;
  am_i_participant: boolean;
}

export async function fetchMyConversations(
  supabase: SupabaseClient,
): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('get_my_conversations');
  if (error) throw error;
  return (data as { conversations: ConversationSummary[] }).conversations;
}

export async function fetchConversationDetail(
  supabase: SupabaseClient,
  conversationId: string,
  options?: { before?: string; limit?: number },
): Promise<ConversationDetail> {
  const { data, error } = await supabase.rpc('get_conversation_detail', {
    p_conversation_id: conversationId,
    ...(options?.before ? { p_before: options.before } : {}),
    ...(options?.limit !== undefined ? { p_limit: options.limit } : {}),
  });
  if (error) throw error;
  return data as ConversationDetail;
}

export async function sendConversationMessage(
  supabase: SupabaseClient,
  conversationId: string,
  content: string,
): Promise<ConversationMessage> {
  const { data, error } = await supabase.rpc('send_message', {
    p_conversation_id: conversationId,
    p_content: content,
  });
  if (error) throw error;
  return data as ConversationMessage;
}

/** Recipient keyed by PERSONAL GROUP id (P-O1; the C-A rider) — the identity
 *  the roster payload actually carries. */
export async function getOrCreateDmConversation(
  supabase: SupabaseClient,
  otherGroupId: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('get_or_create_dm_conversation', {
    p_other_group_id: otherGroupId,
  });
  if (error) throw error;
  return data as string;
}

export async function createGroupConversationRpc(
  supabase: SupabaseClient,
  groupId: string,
  title: string | null,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_group_conversation', {
    p_group_id: groupId,
    p_title: title,
  });
  if (error) throw error;
  return data as string;
}

export async function fetchGroupConversationsRpc(
  supabase: SupabaseClient,
  groupId: string,
): Promise<GroupConversationRow[]> {
  const { data, error } = await supabase.rpc('get_group_conversations', {
    p_group_id: groupId,
  });
  if (error) throw error;
  return (data as { conversations: GroupConversationRow[] }).conversations;
}

export async function joinGroupConversationRpc(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<void> {
  const { error } = await supabase.rpc('join_group_conversation', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
}

export async function leaveGroupConversationRpc(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<void> {
  const { error } = await supabase.rpc('leave_group_conversation', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
}

export async function markConversationReadRpc(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
}
