import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchGroupForum, type ForumPost } from '@/lib/forum/queries';
import { fetchGroupAnnouncements, type Announcement } from '@/lib/announcements/queries';
import {
  fetchGroupConversationsRpc,
  fetchConversationDetail,
  type GroupConversationRow,
  type ConversationDetail,
} from '@/lib/messages/queries';

/**
 * FEAT-H041 — outer-ring wrappers for the suspended-group content wing
 * (paired FEAT-PC026). One implementation of each read: these delegate to
 * the member couriers (lib/forum|announcements|messages/queries) — the
 * PC026 suspended-scoped admin arms decide access platform-side; here we
 * only translate refusals into the admin-plane flags, and the BFF collapses
 * them to the 404 shape (ADR-U038: the route never re-decides).
 *
 * Refusal classes on this plane: 42501 (the door's membership/participation
 * gate — fires for non-admins and for an admin once the group is no longer
 * suspended, the reactivation race), P0001 'group is suspended' (a
 * non-admin member reaching the admin route), P0002 (unknown conversation).
 * All three collapse to `refused`/`notFound`; anything else is a fault and
 * throws typed.
 */

export class AdminContentError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

type Flags<T> = { data: T | null; refused: boolean; notFound: boolean };

const toFlags = <T>(err: unknown): Flags<T> => {
  const e = err as { code?: string; message?: string };
  if (e?.code === '42501' || e?.code === 'P0001') {
    return { data: null, refused: true, notFound: false };
  }
  if (e?.code === 'P0002') {
    return { data: null, refused: false, notFound: true };
  }
  throw new AdminContentError(e?.code ?? 'unknown', e?.message ?? 'unknown error');
};

export async function fetchAdminGroupForum(
  client: SupabaseClient,
  groupId: string,
): Promise<Flags<ForumPost[]>> {
  try {
    const posts = await fetchGroupForum(client, groupId);
    return { data: posts, refused: false, notFound: false };
  } catch (err) {
    return toFlags<ForumPost[]>(err);
  }
}

export async function fetchAdminGroupAnnouncements(
  client: SupabaseClient,
  groupId: string,
): Promise<Flags<Announcement[]>> {
  try {
    const announcements = await fetchGroupAnnouncements(client, groupId);
    return { data: announcements, refused: false, notFound: false };
  } catch (err) {
    return toFlags<Announcement[]>(err);
  }
}

export async function fetchAdminGroupConversations(
  client: SupabaseClient,
  groupId: string,
): Promise<Flags<GroupConversationRow[]>> {
  try {
    const conversations = await fetchGroupConversationsRpc(client, groupId);
    return { data: conversations, refused: false, notFound: false };
  } catch (err) {
    return toFlags<GroupConversationRow[]>(err);
  }
}

export async function fetchAdminGroupConversationDetail(
  client: SupabaseClient,
  conversationId: string,
): Promise<Flags<ConversationDetail>> {
  try {
    const detail = await fetchConversationDetail(client, conversationId);
    return { data: detail, refused: false, notFound: false };
  } catch (err) {
    return toFlags<ConversationDetail>(err);
  }
}

export type ModerationResult = {
  post_id: string;
  group_id: string;
  author_group_id: string | null;
  is_deleted: boolean;
};

/** The audited act — FEAT-PC026's PC-4 wrapper; mutations throw typed. */
export async function moderateAdminGroupForumPost(
  client: SupabaseClient,
  postId: string,
  reason: string,
): Promise<ModerationResult> {
  const { data, error } = await client.rpc('admin_moderate_group_forum_post', {
    p_post_id: postId,
    p_reason: reason,
  });
  if (error) throw new AdminContentError(error.code ?? 'unknown', error.message ?? 'unknown error');
  return data as ModerationResult;
}
