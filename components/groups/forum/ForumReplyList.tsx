'use client';

import { useState } from 'react';
import ForumPost, { ForumPostData } from './ForumPost';

interface ForumReplyListProps {
  parentPostId: string;
  replies: ForumPostData[];
  isLeader: boolean;
  currentUserId: string;
  onDelete: (postId: string) => Promise<void>;
  onEdit: (postId: string, newContent: string) => Promise<void>;
}

const INITIAL_VISIBLE = 3;

export default function ForumReplyList({
  parentPostId,
  replies,
  isLeader,
  currentUserId,
  onDelete,
  onEdit,
}: ForumReplyListProps) {
  const [showAll, setShowAll] = useState(false);

  if (replies.length === 0) {
    return null;
  }

  const visibleReplies = showAll ? replies : replies.slice(0, INITIAL_VISIBLE);
  const hiddenCount = replies.length - INITIAL_VISIBLE;

  return (
    <div className="mt-2 ml-11 space-y-2">
      {visibleReplies.map((reply) => (
        <ForumPost
          key={reply.id}
          post={reply}
          isLeader={isLeader}
          currentUserId={currentUserId}
          onDelete={onDelete}
          onEdit={onEdit}
          showReplyButton={false}
        />
      ))}

      {/* Show more / show less toggle */}
      {replies.length > INITIAL_VISIBLE && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          {showAll
            ? 'Show fewer replies'
            : `Show ${hiddenCount} more ${hiddenCount === 1 ? 'reply' : 'replies'}`}
        </button>
      )}
    </div>
  );
}
