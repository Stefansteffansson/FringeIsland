'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMessaging } from '@/lib/messaging/MessagingContext';
import { createClient } from '@/lib/supabase/client';
import type { DirectMessage } from '@/lib/messaging/MessagingContext';

interface OtherUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

export default function ConversationPage() {
  const params = useParams();
  const conversationId = params.conversationId as string;
  const { user, loading: authLoading } = useAuth();
  const { userProfileId, refreshUnreadCount } = useMessaging();
  const router = useRouter();
  const supabase = createClient();

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch conversation data
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!userProfileId || !conversationId) return;

    let cancelled = false;

    const fetchConversation = async () => {
      try {
        // Fetch conversation to verify access and get other participant
        const { data: conv, error: convErr } = await supabase
          .from('conversations')
          .select('*')
          .eq('id', conversationId)
          .single();

        if (convErr || !conv) {
          setError('Conversation not found.');
          setLoading(false);
          return;
        }

        // Get other participant
        const otherUserId = conv.participant_1 === userProfileId
          ? conv.participant_2
          : conv.participant_1;

        const { data: userData } = await supabase
          .from('users')
          .select('id, full_name, avatar_url')
          .eq('id', otherUserId)
          .single();

        if (!cancelled) {
          setOtherUser(userData || { id: otherUserId, full_name: 'Unknown User', avatar_url: null });
        }

        // Fetch messages
        const { data: msgs, error: msgsErr } = await supabase
          .from('direct_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (msgsErr) throw msgsErr;

        if (!cancelled) {
          setMessages(msgs || []);
        }

        // Mark conversation as read
        const isP1 = conv.participant_1 === userProfileId;
        const readField = isP1 ? 'participant_1_last_read_at' : 'participant_2_last_read_at';

        await supabase
          .from('conversations')
          .update({ [readField]: new Date().toISOString() })
          .eq('id', conversationId);

        // Refresh unread count in nav
        refreshUnreadCount();
      } catch (err) {
        console.error('Error fetching conversation:', err);
        if (!cancelled) setError('Failed to load conversation.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchConversation();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, userProfileId, conversationId, router, supabase]);

  // Realtime subscription for new messages in this conversation
  useEffect(() => {
    if (!conversationId || !userProfileId) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as DirectMessage;
          setMessages((prev) => {
            // Avoid duplicates (our own optimistic insert)
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // If the message is from the other user, mark as read immediately
          if (newMsg.sender_id !== userProfileId) {
            const { data: conv } = await supabase
              .from('conversations')
              .select('participant_1')
              .eq('id', conversationId)
              .single();

            if (conv) {
              const isP1 = conv.participant_1 === userProfileId;
              const readField = isP1 ? 'participant_1_last_read_at' : 'participant_2_last_read_at';
              await supabase
                .from('conversations')
                .update({ [readField]: new Date().toISOString() })
                .eq('id', conversationId);
            }

            refreshUnreadCount();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, userProfileId, supabase]);

  const handleSend = async () => {
    if (!newMessage.trim() || !userProfileId || sending) return;

    setSending(true);
    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { data, error: sendErr } = await supabase
        .from('direct_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: userProfileId,
          content,
        })
        .select()
        .single();

      if (sendErr) throw sendErr;

      // Optimistic: add to local messages if not already there via Realtime
      if (data) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev;
          return [...prev, data];
        });
      }

      // Update sender's last_read_at so their own message doesn't show as unread
      const { data: conv } = await supabase
        .from('conversations')
        .select('participant_1')
        .eq('id', conversationId)
        .single();

      if (conv) {
        const isP1 = conv.participant_1 === userProfileId;
        const readField = isP1 ? 'participant_1_last_read_at' : 'participant_2_last_read_at';
        await supabase
          .from('conversations')
          .update({ [readField]: new Date().toISOString() })
          .eq('id', conversationId);
      }

      inputRef.current?.focus();
    } catch (err: any) {
      console.error('Error sending message:', err);
      setNewMessage(content); // Restore the message
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{error}</h2>
          <Link
            href="/messages"
            className="inline-block mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Back to Messages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex flex-col">
      {/* Conversation Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link
            href="/messages"
            className="text-gray-500 hover:text-gray-700 transition-colors p-1"
            aria-label="Back to messages"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </Link>

          {otherUser && (
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500">
                {otherUser.avatar_url ? (
                  <Image
                    src={otherUser.avatar_url}
                    alt={otherUser.full_name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                    {otherUser.full_name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="font-semibold text-gray-900">{otherUser.full_name}</h2>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm">
                No messages yet. Send the first message!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === userProfileId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                      isMine
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-md'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        isMine ? 'text-blue-200' : 'text-gray-400'
                      }`}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="flex-1 resize-none border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent max-h-32"
              style={{ minHeight: '42px' }}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}
