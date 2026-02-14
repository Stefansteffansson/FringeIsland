'use client';

import { useState } from 'react';

interface ForumComposerProps {
  groupId: string;
  parentPostId?: string | null;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
}

const MAX_CHARS = 10000;

export default function ForumComposer({
  groupId,
  parentPostId = null,
  onSubmit,
  onCancel,
  placeholder,
}: ForumComposerProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReply = parentPostId !== null && parentPostId !== undefined;
  const defaultPlaceholder = isReply ? 'Write a reply...' : 'Write a post...';
  const charsRemaining = MAX_CHARS - content.length;
  const isEmpty = content.trim().length === 0;

  const handleSubmit = async () => {
    if (isEmpty || loading) return;

    setLoading(true);
    setError(null);

    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (err: any) {
      console.error('Error submitting post:', err);
      setError(err.message || 'Failed to post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => {
            if (e.target.value.length <= MAX_CHARS) {
              setContent(e.target.value);
              if (error) setError(null);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || defaultPlaceholder}
          rows={isReply ? 3 : 4}
          disabled={loading}
          className={`w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {/* Character count — shown when nearing limit */}
        {content.length > MAX_CHARS * 0.8 && (
          <span
            className={`absolute bottom-3 right-3 text-xs ${
              charsRemaining < 100 ? 'text-red-500' : 'text-gray-400'
            }`}
          >
            {charsRemaining.toLocaleString()} left
          </span>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {isReply ? 'Ctrl+Enter to reply' : 'Ctrl+Enter to post'}
        </p>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={() => {
                setContent('');
                setError(null);
                onCancel();
              }}
              disabled={loading}
              className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isEmpty || loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isReply ? 'Replying...' : 'Posting...'}
              </span>
            ) : (
              isReply ? 'Reply' : 'Post'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
