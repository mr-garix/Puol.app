import { supabase } from '@/src/supabaseClient';
import type { Database, Json } from '@/src/types/supabase.generated';
import type {
  ConversationListingSummary,
  ConversationParticipant,
  ConversationSummary,
  ListedMessage,
  ListingConversationRow,
  MessageAuthor,
  MessageMetadata,
  SendMessageInput,
  SoftDeleteMessageInput,
} from './types';

const MESSAGE_SELECT = `
  id,
  conversation_id,
  listing_id,
  sender_role,
  sender_profile_id,
  content,
  created_at,
  from_ai,
  escalated_to_host,
  requires_host_action,
  in_reply_to_message_id,
  metadata,
  is_deleted,
  author:profiles!listing_messages_sender_profile_id_fkey (
    id,
    first_name,
    last_name,
    avatar_url,
    username,
    role,
    host_status,
    landlord_status
  )
`;

const CONVERSATION_SELECT = `
  id,
  listing_id,
  guest_profile_id,
  host_profile_id,
  status,
  created_at,
  updated_at,
  listing:listings!listing_conversations_listing_id_fkey (
    id,
    title,
    city,
    district,
    cover_photo_url,
    host_id
  ),
  guest:profiles!listing_conversations_guest_profile_id_fkey (
    id,
    first_name,
    last_name,
    avatar_url,
    username,
    role,
    host_status,
    landlord_status
  ),
  host:profiles!listing_conversations_host_profile_id_fkey (
    id,
    first_name,
    last_name,
    avatar_url,
    username,
    role,
    host_status,
    landlord_status
  )
`;

type ProfilesRow = Database['public']['Tables']['profiles']['Row'];
type ListingsRow = Database['public']['Tables']['listings']['Row'];
type ListingMessagesRow = Database['public']['Tables']['listing_messages']['Row'];

type ConversationRecord = {
  id: string;
  listing_id: string;
  guest_profile_id: string;
  host_profile_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  listing?: ListingsRow | ListingsRow[] | null;
  guest?: ProfilesRow | ProfilesRow[] | null;
  host?: ProfilesRow | ProfilesRow[] | null;
};

type ConversationQueryRow = ConversationRecord;

type MessageQueryRow = ListingMessagesRow & {
  author?: ProfilesRow | ProfilesRow[] | null;
};

const resolveProfile = (value?: ProfilesRow | ProfilesRow[] | null): ProfilesRow | null => {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
};

const mapParticipant = (profile: ProfilesRow | null): ConversationParticipant | null => {
  if (!profile) return null;
  return {
    id: profile.id,
    firstName: profile.first_name,
    lastName: profile.last_name,
    avatarUrl: profile.avatar_url,
    username: profile.username,
    role: profile.role ?? null,
    hostStatus: profile.host_status ?? null,
    landlordStatus: profile.landlord_status ?? null,
  };
};

const mapListing = (listing: ListingsRow | null): ConversationListingSummary | null => {
  if (!listing) return null;
  return {
    id: listing.id,
    title: listing.title ?? null,
    city: listing.city ?? null,
    district: listing.district ?? null,
    coverPhotoUrl: listing.cover_photo_url ?? null,
    hostId: listing.host_id ?? null,
  };
};

const normalizeMetadata = (metadata: MessageMetadata): MessageMetadata => {
  if (!metadata || typeof metadata !== 'object') {
    return metadata ?? null;
  }
  return metadata as Json;
};

const mapMessage = (row: MessageQueryRow): ListedMessage | null => {
  if (row.is_deleted) {
    return null;
  }
  const authorRecord = resolveProfile(row.author ?? null);
  const author: MessageAuthor = mapParticipant(authorRecord);

  return {
    id: row.id,
    conversationId: row.conversation_id,
    listingId: row.listing_id,
    senderRole: row.sender_role,
    senderProfileId: row.sender_profile_id,
    content: row.content,
    createdAt: row.created_at,
    fromAI: Boolean(row.from_ai),
    escalatedToHost: Boolean(row.escalated_to_host),
    requiresHostAction: Boolean(row.requires_host_action),
    inReplyToMessageId: row.in_reply_to_message_id,
    metadata: normalizeMetadata(row.metadata as MessageMetadata),
    author,
  };
};

const mapConversation = (
  record: ConversationQueryRow,
  latestMessage: ListedMessage | null,
  viewerProfileId: string | null,
): ConversationSummary => {
  const listingRecord = Array.isArray(record.listing) ? record.listing[0] ?? null : (record.listing ?? null);
  const guestRecord = resolveProfile(record.guest ?? null);
  const hostRecord = resolveProfile(record.host ?? null);

  let viewerRole: ConversationSummary['viewerRole'] = 'unknown';
  if (viewerProfileId) {
    if (record.guest_profile_id === viewerProfileId) {
      viewerRole = 'guest';
    } else if (record.host_profile_id === viewerProfileId) {
      viewerRole = 'host';
    }
  }

  return {
    id: record.id,
    listingId: record.listing_id,
    guestProfileId: record.guest_profile_id,
    hostProfileId: record.host_profile_id,
    status: record.status,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    listing: mapListing(listingRecord),
    guest: mapParticipant(guestRecord),
    host: mapParticipant(hostRecord),
    latestMessage,
    viewerRole,
    requiresHostActionPending: Boolean(latestMessage?.requiresHostAction),
  };
};

const hydrateLatestMessages = async (
  conversationIds: string[],
): Promise<Record<string, ListedMessage>> => {
  if (!conversationIds.length) {
    return {};
  }

  const { data, error } = await supabase
    .from('listing_messages')
    .select(MESSAGE_SELECT)
    .in('conversation_id', conversationIds)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as MessageQueryRow[];
  const latestByConversation: Record<string, ListedMessage> = {};

  for (const row of rows) {
    if (latestByConversation[row.conversation_id]) {
      continue;
    }
    const mapped = mapMessage(row);
    if (mapped) {
      latestByConversation[row.conversation_id] = mapped;
    }
  }

  return latestByConversation;
};

export const ensureListingConversation = async ({
  listingId,
  guestProfileId,
  hostProfileId,
}: {
  listingId: string;
  guestProfileId: string;
  hostProfileId: string;
}): Promise<ListingConversationRow> => {
  const existing = await supabase
    .from('listing_conversations')
    .select('*')
    .eq('listing_id', listingId)
    .eq('guest_profile_id', guestProfileId)
    .eq('host_profile_id', hostProfileId)
    .maybeSingle<ListingConversationRow>();

  if (existing.error) {
    throw existing.error;
  }

  if (existing.data) {
    return existing.data;
  }

  const now = new Date().toISOString();
  const insertResult = await supabase
    .from('listing_conversations')
    .insert({
      listing_id: listingId,
      guest_profile_id: guestProfileId,
      host_profile_id: hostProfileId,
      status: 'open',
      created_at: now,
      updated_at: now,
    })
    .select('*')
    .single<ListingConversationRow>();

  if (insertResult.error || !insertResult.data) {
    throw insertResult.error ?? new Error('Impossible de créer la conversation.');
  }

  return insertResult.data;
};

export const fetchConversationSummaries = async ({
  profileId,
  viewerProfileId,
}: {
  profileId: string;
  viewerProfileId: string;
}): Promise<ConversationSummary[]> => {
  const { data, error } = await supabase
    .from('listing_conversations')
    .select(CONVERSATION_SELECT)
    .or(`guest_profile_id.eq.${profileId},host_profile_id.eq.${profileId}`)
    .order('updated_at', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as ConversationQueryRow[];
  if (!rows.length) {
    return [];
  }

  const conversationIds = rows.map((row) => row.id);
  const latestMessagesByConversation = await hydrateLatestMessages(conversationIds);

  return rows
    .map((row) => {
      const latestMessage = latestMessagesByConversation[row.id] ?? null;
      return mapConversation(row, latestMessage, viewerProfileId);
    })
    .filter((conversation) => conversation.latestMessage !== null);
};

export const fetchConversationById = async ({
  conversationId,
  viewerProfileId,
}: {
  conversationId: string;
  viewerProfileId: string | null;
}): Promise<ConversationSummary | null> => {
  const { data, error } = await supabase
    .from('listing_conversations')
    .select(CONVERSATION_SELECT)
    .eq('id', conversationId)
    .maybeSingle<ConversationQueryRow>();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const latestByConversation = await hydrateLatestMessages([conversationId]);
  const latestMessage = latestByConversation[conversationId] ?? null;

  return mapConversation(data, latestMessage ?? null, viewerProfileId ?? null);
};

export const fetchConversationMessages = async (conversationId: string): Promise<ListedMessage[]> => {
  const { data, error } = await supabase
    .from('listing_messages')
    .select(MESSAGE_SELECT)
    .eq('conversation_id', conversationId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as MessageQueryRow[];
  return rows
    .map((row) => mapMessage(row))
    .filter((value): value is ListedMessage => value !== null);
};

export const sendListingMessage = async ({
  conversationId,
  listingId,
  senderProfileId,
  senderRole,
  content,
  inReplyToMessageId = null,
  fromAI = false,
  escalatedToHost = false,
  requiresHostAction,
  metadata,
}: SendMessageInput & { requiresHostAction?: boolean }): Promise<ListedMessage> => {
  const now = new Date().toISOString();
  const payload = {
    conversation_id: conversationId,
    listing_id: listingId,
    sender_role: senderRole,
    sender_profile_id: senderProfileId,
    content,
    created_at: now,
    from_ai: fromAI,
    escalated_to_host: escalatedToHost,
    requires_host_action: requiresHostAction ?? senderRole === 'guest',
    in_reply_to_message_id: inReplyToMessageId ?? null,
    metadata: metadata ?? {},
    is_deleted: false,
  } satisfies Database['public']['Tables']['listing_messages']['Insert'];

  const { data, error } = await supabase
    .from('listing_messages')
    .insert(payload)
    .select(MESSAGE_SELECT)
    .single<MessageQueryRow>();

  if (error || !data) {
    throw error ?? new Error('Impossible d\'envoyer le message.');
  }

  await supabase
    .from('listing_conversations')
    .update({ updated_at: now })
    .eq('id', conversationId);

  const mapped = mapMessage(data);
  if (!mapped) {
    throw new Error('Message non disponible après création.');
  }

  return mapped;
};

export const softDeleteListingMessage = async ({ messageId }: SoftDeleteMessageInput): Promise<void> => {
  const { error } = await supabase
    .from('listing_messages')
    .update({ is_deleted: true })
    .eq('id', messageId);

  if (error) {
    throw error;
  }
};
