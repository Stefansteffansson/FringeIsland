'use client';

import { useState } from 'react';
import Image from 'next/image';
import ConfirmModal from '@/components/ui/ConfirmModal';
import ForumComposer from './ForumComposer';

export interface ForumPostData {
  id: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  parent_post_id: string | null;
  author: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  } | null;
}

interface ForumPostProps {
  post: ForumPostData;
  isLeader: boolean;
  currentUserId: string;
  replyCount?: number;
  onReply?: (parentPostId: string, content: string) => Promise<void>;
  onDelete: (postId: string) => Promise<void>;
  onEdit: (postId: string, newContent: string) => Promise<void>;
  showReplyButton?: boolean;
}

/** Returns a human-friendly relative time string like "2 hours ago" or "just now". */
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'just now';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;

  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay} ${diffDay === 1 ? 'day' : 'days'} ago`;

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} ${diffMonth === 1 ? 'month' : 'months'} ago`;

  const diffYear = Math.floor(diffMonth / 12);
  return `${diffYear} ${diffYear === 1 ? 'year' : 'years'} ago`;
}

export default function ForumPost({
  post,
  isLeader,
  currentUserId,
  replyCount = 0,
  onReply,
  onDelete,
  onEdit,
  showReplyButton = false,
}: ForumPostProps) {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const isOwnPost = post.author?.id === currentUserId;
  const isTopLevel = post.parent_post_id === null;
  const wasEdited = post.updated_at !== post.created_at;

  const handleDeleteClick = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Remove Post?',
      message: 'This will mark the post as removed. The placeholder will remain visible.',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          await onDelete(post.id);
        } catch (err: any) {
          console.error('Error deleting post:', err);
        }
      },
    });
  };

  const handleEditSave = async () => {
    if (editContent.trim() === post.content || editContent.trim().length === 0) {
      setIsEditing(false);
      return;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      await onEdit(post.id, editContent.trim());
      setIsEditing(false);
    } catch (err: any) {
      console.error('Error editing post:', err);
      setEditError(err.message || 'Failed to save edit. Please try again.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleReplySubmit = async (content: string) => {
    if (!onReply) return;
    await onReply(post.id, content);
    setShowReplyForm(false);
  };

  // Deleted post display
  if (post.is_deleted) {
    return (
      <div className="py-3 px-4 rounded-lg bg-gray-50 border border-gray-200">
        <p className="text-sm text-gray-400 italic">
          [This post has been removed by a moderator]
        </p>
      </div>
    );
  }

  return (
    <>
      <div className={`p-4 rounded-lg border ${isTopLevel ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
        {/* Post header */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex-shrink-0 mt-0.5">
            {post.author?.avatar_url ? (
              <Image
                src={post.author.avatar_url}
                alt={post.author.full_name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                {post.author?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>

          {/* Author + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-gray-900">
                {post.author?.full_name ?? 'Unknown'}
              </span>
              <span className="text-xs text-gray-400" title={new Date(post.created_at).toLocaleString()}>
                {relativeTime(post.created_at)}
              </span>
              {wasEdited && (
                <span className="text-xs text-gray-400 italic">(edited)</span>
              )}
            </div>

            {/* Post content or inline edit form */}
            {isEditing ? (
              <div className="mt-2 space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => {
                    setEditContent(e.target.value);
                    if (editError) setEditError(null);
                  }}
                  rows={3}
                  disabled={editLoading}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50"
                />
                {editError && (
                  <p className="text-xs text-red-600">{editError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleEditSave}
                    disabled={editLoading || editContent.trim().length === 0}
                    className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {editLoading ? (
                      <span className="flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </span>
                    ) : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditContent(post.content);
                      setEditError(null);
                      setIsEditing(false);
                    }}
                    disabled={editLoading}
                    className="px-3 py-1.5 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-1 text-sm text-gray-800 whitespace-pre-wrap break-words">
                {post.content}
              </p>
            )}

            {/* Post actions */}
            {!isEditing && (
              <div className="flex items-center gap-3 mt-2">
                {/* Reply button (top-level posts only) */}
                {showReplyButton && isTopLevel && onReply && (
                  <button
                    onClick={() => setShowReplyForm((v) => !v)}
                    className="text-xs text-gray-500 hover:text-blue-600 transition-colors font-medium"
                  >
                    {showReplyForm ? 'Cancel reply' : (
                      <>
                        Reply
                        {replyCount > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                            {replyCount}
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )}

                {/* Edit button (own non-deleted posts) */}
                {isOwnPost && !post.is_deleted && (
                  <button
                    onClick={() => {
                      setEditContent(post.content);
                      setIsEditing(true);
                    }}
                    className="text-xs text-gray-500 hover:text-blue-600 transition-colors font-medium"
                  >
                    Edit
                  </button>
                )}

                {/* Delete button (leaders only — moderation) */}
                {isLeader && (
                  <button
                    onClick={handleDeleteClick}
                    className="text-xs text-gray-500 hover:text-red-600 transition-colors font-medium"
                  >
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Inline reply form */}
        {showReplyForm && !isEditing && (
          <div className="mt-3 ml-11">
            <ForumComposer
              groupId=""
              parentPostId={post.id}
              onSubmit={handleReplySubmit}
              onCancel={() => setShowReplyForm(false)}
            />
          </div>
        )}
      </div>

      {/* Confirm modal for moderation delete */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Remove"
        cancelText="Cancel"
        variant="danger"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  );
}
