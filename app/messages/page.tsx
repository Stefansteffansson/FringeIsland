'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/AuthContext';
import { useMessaging } from '@/lib/messaging/MessagingContext';
import { createClient } from '@/lib/supabase/client';

interface ConversationItem {
  id: string;
  otherUser: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderId: string | null;
  isUnread: boolean;
}

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const { userProfileId, refreshUnreadCount } = useMessaging();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (!userProfileId) return;

    const fetchConversations = async () => {
      try {
        // Fetch all conversations for the current user
        const { data: convs, error: convErr } = await supabase
          .from('conversations')
          .select('*')
          .order('last_message_at', { ascending: false, nullsFirst: false });

        if (convErr) throw convErr;

        if (!convs || convs.length === 0) {
          setConversations([]);
          setLoading(false);
          return;
        }

        // Get other participants' user IDs
        const otherUserIds = convs.map((c: any) =>
          c.participant_1 === userProfileId ? c.participant_2 : c.participant_1
        );

        // Fetch user profiles (otherUserIds are personal_group_ids)
        const { data: users, error: usersErr } = await supabase
          .from('users')
          .select('personal_group_id, full_name, avatar_url')
          .in('personal_group_id', otherUserIds);

        if (usersErr) throw usersErr;

        // Fetch last message for each conversation
        const conversationIds = convs.map((c: any) => c.id);
        const lastMessages: Record<string, { content: string; sender_group_id: string }> = {};

        for (const convId of conversationIds) {
          const { data: msgs } = await supabase
            .from('direct_messages')
            .select('content, sender_group_id')
            .eq('conversation_id', convId)
            .order('created_at', { ascending: false })
            .limit(1);

          if (msgs && msgs.length > 0) {
            lastMessages[convId] = { content: msgs[0].content, sender_group_id: msgs[0].sender_group_id };
          }
        }

        // Build conversation items
        const items: ConversationItem[] = convs.map((c: any) => {
          const otherUserId = c.participant_1 === userProfileId ? c.participant_2 : c.participant_1;
          const otherUserData = (users || []).find((u: any) => u.personal_group_id === otherUserId);
          const isP1 = c.participant_1 === userProfileId;
          const lastReadAt = isP1 ? c.participant_1_last_read_at : c.participant_2_last_read_at;

          const isUnread = c.last_message_at && (!lastReadAt ||
            new Date(c.last_message_at).getTime() > new Date(lastReadAt).getTime());

          const lastMsg = lastMessages[c.id];

          return {
            id: c.id,
            otherUser: {
              id: otherUserId,
              full_name: otherUserData?.full_name || 'Unknown User',
              avatar_url: otherUserData?.avatar_url || null,
            },
            lastMessageAt: c.last_message_at,
            lastMessagePreview: lastMsg?.content
              ? (lastMsg.content.length > 80 ? lastMsg.content.slice(0, 80) + '...' : lastMsg.content)
              : null,
            lastMessageSenderId: lastMsg?.sender_group_id || null,
            isUnread: !!isUnread,
          };
        });

        setConversations(items);
      } catch (err) {
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [user, authLoading, userProfileId, router, supabase]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Messages
          </h1>
          <p className="text-gray-600">
            Your conversations
          </p>
        </div>

        {/* Conversations List */}
        {conversations.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">💬</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              No Conversations Yet
            </h2>
            <p className="text-gray-600 mb-8">
              Start a conversation by visiting a group member's profile and clicking "Send Message".
            </p>
            <Link
              href="/groups"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all shadow-md"
            >
              View My Groups
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-100">
            {conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/messages/${conv.id}`}
                className={`block px-6 py-4 hover:bg-gray-50 transition-colors ${
                  conv.isUnread ? 'bg-blue-50/50 hover:bg-blue-50/70' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <div className="relative w-12 h-12 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0">
                    {conv.otherUser.avatar_url ? (
                      <Image
                        src={conv.otherUser.avatar_url}
                        alt={conv.otherUser.full_name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                        {conv.otherUser.full_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className={`text-sm truncate ${
                        conv.isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                      }`}>
                        {conv.otherUser.full_name}
                      </h3>
                      {conv.lastMessageAt && (
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {formatTime(conv.lastMessageAt)}
                        </span>
                      )}
                    </div>
                    {conv.lastMessagePreview && (
                      <p className={`text-sm mt-0.5 truncate ${
                        conv.isUnread ? 'text-gray-700 font-medium' : 'text-gray-500'
                      }`}>
                        {conv.lastMessageSenderId === userProfileId ? 'You: ' : ''}
                        {conv.lastMessagePreview}
                      </p>
                    )}
                  </div>

                  {/* Unread dot */}
                  {conv.isUnread && (
                    <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}
