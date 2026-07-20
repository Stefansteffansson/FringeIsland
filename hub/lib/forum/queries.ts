import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * FEAT-H026 — server-side couriers over the FEAT-PD009 forum contracts
 * (Cycle C-B). Every read and write goes through the platform RPCs — never a
 * direct table touch (ADR-U009/U038; the C-B migration narrowed every forum
 * write to the contracts). These run in BFF routes with the caller's session
 * client, so the substrate sees the real actor (the four-hop personal-group
 * chain).
 */

/** The COM-14 attribution ladder, resolved platform-side (ADR-U021; CB-9).
 *  The surface renders `display_name` styled by `attribution` — it never
 *  computes membership itself. */
export interface AuthorDisplay {
  display_name: string;
  attribution: 'active' | 'former' | 'unknown';
}

export interface ForumPost {
  id: string;
  parent_post_id: string | null;
  /** Withheld (null) platform-side when `is_deleted` — never client-hidden. */
  content: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  author_group_id: string | null;
  author: AuthorDisplay;
  replies: ForumPost[];
}

/** FEAT-H028 — the `edit_own_forum_post` / `delete_own_forum_post` result: the
 *  post keys without `replies` (the contract omits them). The surface writes it
 *  through onto the matching node, preserving that node's existing replies. */
export type ForumPostRow = Omit<ForumPost, 'replies'>;

export async function fetchGroupForum(
  supabase: SupabaseClient,
  groupId: string,
  options?: { before?: string; limit?: number },
): Promise<ForumPost[]> {
  const { data, error } = await supabase.rpc('get_group_forum', {
    p_group_id: groupId,
    ...(options?.before ? { p_before: options.before } : {}),
    ...(options?.limit !== undefined ? { p_limit: options.limit } : {}),
  });
  if (error) throw error;
  return (data as { posts: ForumPost[] }).posts;
}

export async function createForumPostRpc(
  supabase: SupabaseClient,
  groupId: string,
  content: string,
): Promise<ForumPost> {
  const { data, error } = await supabase.rpc('create_forum_post', {
    p_group_id: groupId,
    p_content: content,
  });
  if (error) throw error;
  return data as ForumPost;
}

export async function replyToForumPostRpc(
  supabase: SupabaseClient,
  parentPostId: string,
  content: string,
): Promise<ForumPost> {
  const { data, error } = await supabase.rpc('reply_to_forum_post', {
    p_parent_post_id: parentPostId,
    p_content: content,
  });
  if (error) throw error;
  return data as ForumPost;
}

export async function moderateForumPostRpc(
  supabase: SupabaseClient,
  postId: string,
): Promise<{ id: string; is_deleted: boolean }> {
  const { data, error } = await supabase.rpc('moderate_forum_post', {
    p_post_id: postId,
  });
  if (error) throw error;
  return data as { id: string; is_deleted: boolean };
}

/** FEAT-H028 COM-12 — windowed own-edit. Author = me, not deleted,
 *  `post_forum_messages` held, and created within 15 minutes (all gated
 *  substrate-side, FEAT-PD011); a window-edge refusal raises a 42501-class
 *  error surfaced honestly. Returns the updated post row-doc (`replies`
 *  omitted). */
export async function editOwnForumPostRpc(
  supabase: SupabaseClient,
  postId: string,
  content: string,
): Promise<ForumPostRow> {
  const { data, error } = await supabase.rpc('edit_own_forum_post', {
    p_post_id: postId,
    p_content: content,
  });
  if (error) throw error;
  return data as ForumPostRow;
}

/** FEAT-H028 COM-12 — windowed own-delete. Same gate minus content; soft-delete
 *  (idempotent); returns the tombstone row-doc (`is_deleted` true, content
 *  null). The existing C-C moderation-hint trigger fires on the transition. */
export async function deleteOwnForumPostRpc(
  supabase: SupabaseClient,
  postId: string,
): Promise<ForumPostRow> {
  const { data, error } = await supabase.rpc('delete_own_forum_post', {
    p_post_id: postId,
  });
  if (error) throw error;
  return data as ForumPostRow;
}
