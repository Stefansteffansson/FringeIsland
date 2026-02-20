'use client';

import { useState, useEffect } from 'react';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  onSend: (content: string) => Promise<void>;
}

export default function MessageModal({
  isOpen,
  onClose,
  selectedCount,
  onSend,
}: MessageModalProps) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setContent('');
      setError(null);
      setSending(false);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !sending) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, sending, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = content.trim();
    if (!trimmed) {
      setError('Message cannot be empty.');
      return;
    }

    setError(null);
    setSending(true);
    try {
      await onSend(trimmed);
    } catch (err: any) {
      setError(err.message || 'Failed to send messages.');
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={sending ? undefined : onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in duration-200">
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Send Direct Message
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Send an individual DM to each of the {selectedCount} selected user{selectedCount !== 1 ? 's' : ''}.
          Each user will receive the message in their own 1:1 conversation with you.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Message */}
          <div className="mb-4">
            <label htmlFor="dm-content" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="dm-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your message..."
              rows={5}
              disabled={sending}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y disabled:bg-gray-50 disabled:text-gray-400"
              autoFocus
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                `Send to ${selectedCount} User${selectedCount !== 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
