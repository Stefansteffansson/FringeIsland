'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { usePermissions } from '@/lib/hooks/usePermissions';
import ForumPost, { ForumPostData } from './ForumPost';
import ForumComposer from './ForumComposer';
import ForumReplyList from './ForumReplyList';

interface ForumSectionProps {
  groupId: string;
}

interface PostWithReplies extends ForumPostData {
  replies: ForumPostData[];
}

export default function ForumSection({ groupId }: ForumSectionProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const { hasPermission } = usePermissions(groupId);

  const [posts, setPosts] = useState<PostWithReplies[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Fetch the user's internal DB id once
  useEffect(() => {
    const fetchUserId = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (data) {
        setCurrentUserId(data.id);
      }
    };

    fetchUserId();
  }, [user, supabase]);

  // Fetch posts + replies
  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch top-level posts (parent_post_id IS NULL)
      const { data: topLevelPosts, error: postsError } = await supabase
        .from('forum_posts')
        .select(`
          id, content, is_deleted, created_at, updated_at, parent_post_id,
          author:users!author_user_id (id, full_name, avatar_url)
        `)
        .eq('group_id', groupId)
        .is('parent_post_id', null)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      const topPosts = (topLevelPosts || []) as unknown as ForumPostData[];

      // Fetch replies for all top-level posts
      const postIds = topPosts.map((p) => p.id);
      let repliesMap: Record<string, ForumPostData[]> = {};

      if (postIds.length > 0) {
        const { data: replyData, error: repliesError } = await supabase
          .from('forum_posts')
          .select(`
            id, content, is_deleted, created_at, updated_at, parent_post_id,
            author:users!author_user_id (id, full_name, avatar_url)
          `)
          .in('parent_post_id', postIds)
          .order('created_at', { ascending: true });

        if (repliesError) throw repliesError;

        // Group replies by parent_post_id
        for (const reply of (replyData || []) as unknown as ForumPostData[]) {
          if (!reply.parent_post_id) continue;
          if (!repliesMap[reply.parent_post_id]) {
            repliesMap[reply.parent_post_id] = [];
          }
          repliesMap[reply.parent_post_id].push(reply);
        }
      }

      // Merge posts with their replies
      const postsWithReplies: PostWithReplies[] = topPosts.map((post) => ({
        ...post,
        replies: repliesMap[post.id] || [],
      }));

      setPosts(postsWithReplies);
    } catch (err: any) {
      console.error('Error fetching forum posts:', err);
      setError('Failed to load the forum. Please try refreshing.');
    } finally {
      setLoading(false);
    }
  }, [groupId, supabase]);

  useEffect(() => {
    if (groupId) {
      fetchPosts();
    }
  }, [groupId, fetchPosts]);

  // Create a new top-level post
  const handleCreatePost = async (content: string) => {
    if (!currentUserId) throw new Error('Not authenticated');

    const { error } = await supabase.from('forum_posts').insert({
      group_id: groupId,
      author_user_id: currentUserId,
      content,
      parent_post_id: null,
    });

    if (error) throw error;

    await fetchPosts();
  };

  // Create a reply
  const handleCreateReply = async (parentPostId: string, content: string) => {
    if (!currentUserId) throw new Error('Not authenticated');

    const { error } = await supabase.from('forum_posts').insert({
      group_id: groupId,
      author_user_id: currentUserId,
      content,
      parent_post_id: parentPostId,
    });

    if (error) throw error;

    await fetchPosts();
  };

  // Soft-delete a post (moderation)
  const handleDeletePost = async (postId: string) => {
    const { error } = await supabase
      .from('forum_posts')
      .update({ is_deleted: true })
      .eq('id', postId);

    if (error) throw error;

    // Optimistically update local state
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return { ...post, is_deleted: true };
        }
        return {
          ...post,
          replies: post.replies.map((reply) =>
            reply.id === postId ? { ...reply, is_deleted: true } : reply
          ),
        };
      })
    );
  };

  // Edit own post
  const handleEditPost = async (postId: string, newContent: string) => {
    const { error } = await supabase
      .from('forum_posts')
      .update({ content: newContent })
      .eq('id', postId);

    if (error) throw error;

    // Optimistically update local state
    const now = new Date().toISOString();
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id === postId) {
          return { ...post, content: newContent, updated_at: now };
        }
        return {
          ...post,
          replies: post.replies.map((reply) =>
            reply.id === postId
              ? { ...reply, content: newContent, updated_at: now }
              : reply
          ),
        };
      })
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-3">{error}</p>
        <button
          onClick={fetchPosts}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Compose new post */}
      {currentUserId && (
        <div className="border border-gray-200 rounded-lg p-4 bg-white">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">New Post</h3>
          <ForumComposer
            groupId={groupId}
            parentPostId={null}
            onSubmit={handleCreatePost}
          />
        </div>
      )}

      {/* Post list */}
      {posts.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg mb-1">No posts yet.</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id}>
              <ForumPost
                post={post}
                canModerate={hasPermission('moderate_forum')}
                currentUserId={currentUserId}
                replyCount={post.replies.length}
                onReply={handleCreateReply}
                onDelete={handleDeletePost}
                onEdit={handleEditPost}
                showReplyButton={true}
              />

              {/* Replies */}
              <ForumReplyList
                parentPostId={post.id}
                replies={post.replies}
                canModerate={hasPermission('moderate_forum')}
                currentUserId={currentUserId}
                onDelete={handleDeletePost}
                onEdit={handleEditPost}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
