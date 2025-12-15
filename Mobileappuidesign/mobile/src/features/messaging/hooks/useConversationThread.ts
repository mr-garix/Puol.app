import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  fetchConversationById,
  fetchConversationMessages,
  sendListingMessage,
  softDeleteListingMessage,
} from '../services';
import { supabase } from '@/src/supabaseClient';
import type { ConversationSummary, ListedMessage, SendMessageInput } from '../types';

interface UseConversationThreadResult {
  conversation: ConversationSummary | null;
  messages: ListedMessage[];
  isLoading: boolean;
  isSending: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadConversation: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  sendMessage: (input: Omit<SendMessageInput, 'conversationId' | 'listingId'>) => Promise<void>;
  softDeleteMessage: (messageId: string) => Promise<void>;
}

interface UseConversationThreadArgs {
  conversationId?: string;
  viewerProfileId?: string | null;
}

export const useConversationThread = ({
  conversationId,
  viewerProfileId,
}: UseConversationThreadArgs): UseConversationThreadResult => {
  const [conversation, setConversation] = useState<ConversationSummary | null>(null);
  const [messages, setMessages] = useState<ListedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestConversationIdRef = useRef<string | undefined>(conversationId);
  const pendingMessageCounterRef = useRef(0);
  const dedupeAndSortMessages = useCallback((collection: ListedMessage[]): ListedMessage[] => {
    if (!collection.length) {
      return [];
    }

    const byId = new Map<string, ListedMessage>();
    for (const item of collection) {
      byId.set(item.id, item);
    }

    return Array.from(byId.values()).sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
        return 0;
      }
      return aTime - bTime;
    });
  }, []);

  const mergeMessages = useCallback(
    (current: ListedMessage[], incoming: ListedMessage[]): ListedMessage[] => dedupeAndSortMessages([...current, ...incoming]),
    [dedupeAndSortMessages],
  );

  const removeMessageById = useCallback((current: ListedMessage[], targetId: string): ListedMessage[] => {
    if (!current.length) {
      return current;
    }
    return current.filter((msg) => msg.id !== targetId);
  }, []);

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      setConversation(null);
      setMessages([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    latestConversationIdRef.current = conversationId;

    try {
      const [summary, initialMessages] = await Promise.all([
        fetchConversationById({ conversationId, viewerProfileId: viewerProfileId ?? null }),
        fetchConversationMessages(conversationId),
      ]);

      if (latestConversationIdRef.current === conversationId) {
        setConversation(summary);
        setMessages(dedupeAndSortMessages(initialMessages));
      }
    } catch (err) {
      console.error('[useConversationThread] load error', err);
      setError("Impossible de charger cette conversation pour le moment.");
      setConversation(null);
      setMessages([]);
    } finally {
      if (latestConversationIdRef.current === conversationId) {
        setIsLoading(false);
      }
    }
  }, [conversationId, viewerProfileId, dedupeAndSortMessages]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const channel = supabase
      .channel(`conversation-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'listing_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          try {
            const nextMessages = await fetchConversationMessages(conversationId);
            if (latestConversationIdRef.current !== conversationId) {
              return;
            }
            setMessages((prev) => mergeMessages(prev, nextMessages));
            setConversation((prev) =>
              prev
                ? {
                    ...prev,
                    latestMessage: nextMessages[nextMessages.length - 1] ?? prev.latestMessage,
                  }
                : prev,
            );
          } catch (err) {
            console.error('[useConversationThread] realtime sync error', err);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, mergeMessages]);

  const refreshMessages = useCallback(async () => {
    if (!conversationId) {
      return;
    }
    setIsRefreshing(true);
    try {
      const nextMessages = await fetchConversationMessages(conversationId);
      if (latestConversationIdRef.current === conversationId) {
        setMessages((prev) => mergeMessages(prev, nextMessages));
      }
    } catch (err) {
      console.error('[useConversationThread] refresh error', err);
      setError("Impossible d'actualiser les messages.");
    } finally {
      if (latestConversationIdRef.current === conversationId) {
        setIsRefreshing(false);
      }
    }
  }, [conversationId, mergeMessages]);

  const sendMessage = useCallback(
    async ({ senderProfileId, senderRole, content, inReplyToMessageId, fromAI, escalatedToHost, requiresHostAction, metadata }: Omit<SendMessageInput, 'conversationId' | 'listingId'>) => {
      if (!conversationId || !conversation?.listingId) {
        setError('Conversation indisponible.');
        return;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent.length) {
        return;
      }

      setIsSending(true);
      setError(null);

      let optimisticMessage: ListedMessage | null = null;

      try {
        const requiresHostActionFlag = requiresHostAction ?? false;
        pendingMessageCounterRef.current += 1;
        const pendingId = `pending-${Date.now()}-${pendingMessageCounterRef.current}`;
        optimisticMessage = {
          id: pendingId,
          conversationId,
          listingId: conversation.listingId,
          senderRole,
          senderProfileId,
          content: trimmedContent,
          createdAt: new Date().toISOString(),
          fromAI: Boolean(fromAI),
          escalatedToHost: Boolean(escalatedToHost),
          requiresHostAction: requiresHostActionFlag,
          inReplyToMessageId: inReplyToMessageId ?? null,
          metadata: metadata ?? {},
          author: conversation.viewerRole === senderRole ? conversation.guest ?? conversation.host : null,
        };

        setMessages((prev) => [...prev, optimisticMessage!]);

        const created = await sendListingMessage({
          conversationId,
          listingId: conversation.listingId,
          senderProfileId,
          senderRole,
          content: trimmedContent,
          inReplyToMessageId,
          fromAI,
          escalatedToHost,
          requiresHostAction: requiresHostActionFlag,
          metadata,
        });

        setMessages((prev) => {
          const withoutPending = optimisticMessage ? removeMessageById(prev, optimisticMessage.id) : prev;
          const withoutDuplicate = withoutPending.filter((msg) => msg.id !== created.id);
          return dedupeAndSortMessages([...withoutDuplicate, created]);
        });
        setConversation((prev) => (prev ? { ...prev, latestMessage: created } : prev));

        if (senderRole === 'guest' && conversation.listingId) {
          void (async () => {
            const payload = {
              conversation_id: conversationId,
              listing_id: conversation.listingId,
              guest_profile_id: senderProfileId,
              host_profile_id: conversation.hostProfileId,
              user_message: trimmedContent,
            };

            console.log('[useConversationThread] invoking ai-message', payload);

            try {
              const { data: aiData, error: aiError } = await supabase.functions.invoke('clever-handler', {
                body: payload,
              });

              if (aiError) {
                console.warn('[useConversationThread] ai-message invocation failed (non-blocking)', aiError);
              } else {
                console.log('[useConversationThread] ai-message invocation success', aiData);
              }
            } catch (invokeError) {
              console.warn('[useConversationThread] ai-message invoke threw (non-blocking)', invokeError);
            }
          })();
        }
      } catch (err) {
        console.error('[useConversationThread] send error', err);
        setError("Impossible d'envoyer le message.");
        // On retire le pending message en cas d'erreur
        if (optimisticMessage) {
          setMessages((prev) => removeMessageById(prev, optimisticMessage!.id));
        }
      } finally {
        setIsSending(false);
      }
    },
    [conversation, conversationId, dedupeAndSortMessages, removeMessageById],
  );

  const softDeleteMessageHandler = useCallback(
    async (messageId: string) => {
      try {
        setMessages((prev) => removeMessageById(prev, messageId));
        await softDeleteListingMessage({ messageId });
      } catch (err) {
        console.error('[useConversationThread] soft delete error', err);
        setError('Impossible de supprimer ce message.');
      }
    },
    [removeMessageById],
  );

  const memoizedResult = useMemo(
    () => ({
      conversation,
      messages,
      isLoading,
      isSending,
      isRefreshing,
      error,
      loadConversation,
      refreshMessages,
      sendMessage,
      softDeleteMessage: softDeleteMessageHandler,
    }),
    [conversation, error, isLoading, isRefreshing, isSending, loadConversation, messages, refreshMessages, sendMessage, softDeleteMessageHandler],
  );

  return memoizedResult;
};
