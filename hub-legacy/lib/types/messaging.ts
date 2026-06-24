// Messaging-related TypeScript types for FringeIsland (D15 Universal Group Pattern)

/** Conversation record (participant_1/2 reference personal group IDs) */
export interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string | null;
  participant_1_last_read_at: string | null;
  participant_2_last_read_at: string | null;
  created_at: string;
}

/** Direct message (sender_group_id references the sender's personal group) */
export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_group_id: string;
  content: string;
  created_at: string;
}

/** Conversation list item for the messages page */
export interface ConversationItem {
  id: string;
  otherUser: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  lastMessageSenderGroupId: string | null;
  isUnread: boolean;
}

/** Other participant info in a conversation */
export interface OtherUser {
  id: string;
  full_name: string;
  avatar_url: string | null;
}
