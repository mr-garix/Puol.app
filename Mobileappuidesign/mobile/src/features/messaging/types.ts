import type { Json, Tables } from '@/src/types/supabase.generated';

export type ListingConversationRow = Tables<'listing_conversations'>;
export type ListingMessageRow = Tables<'listing_messages'>;

export type ConversationParticipant = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  username: string | null;
  role?: string | null;
  hostStatus?: string | null;
  landlordStatus?: string | null;
};

export type ConversationListingSummary = {
  id: string;
  title: string | null;
  city: string | null;
  district: string | null;
  coverPhotoUrl: string | null;
  hostId: string | null;
};

export type MessageMetadata = Json | null;

export type MessageAuthor = ConversationParticipant | null;

export type ListedMessage = {
  id: string;
  conversationId: string;
  listingId: string;
  senderRole: string;
  senderProfileId: string | null;
  content: string;
  createdAt: string;
  fromAI: boolean;
  escalatedToHost: boolean;
  requiresHostAction: boolean;
  inReplyToMessageId: string | null;
  metadata: MessageMetadata;
  author: MessageAuthor;
};

export type ConversationSummary = {
  id: string;
  listingId: string;
  guestProfileId: string;
  hostProfileId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  listing: ConversationListingSummary | null;
  guest: ConversationParticipant | null;
  host: ConversationParticipant | null;
  latestMessage: ListedMessage | null;
  viewerRole: 'guest' | 'host' | 'unknown';
  requiresHostActionPending: boolean;
};

export type SendMessageInput = {
  conversationId: string;
  listingId: string;
  senderProfileId: string;
  senderRole: 'guest' | 'host' | 'ai' | 'system';
  content: string;
  inReplyToMessageId?: string | null;
  fromAI?: boolean;
  escalatedToHost?: boolean;
  requiresHostAction?: boolean;
  metadata?: MessageMetadata;
};

export type SoftDeleteMessageInput = {
  messageId: string;
};
