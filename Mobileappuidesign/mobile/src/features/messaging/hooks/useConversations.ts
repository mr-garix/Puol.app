import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { supabase } from '@/src/supabaseClient';

import { fetchConversationSummaries } from '../services';
import type { ConversationSummary } from '../types';

interface UseConversationsResult {
  conversations: ConversationSummary[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useConversations = (profileId: string | null | undefined): UseConversationsResult => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestedProfileId = useRef<string | null>(null);
  const conversationIdsRef = useRef<string[]>([]);

  const loadConversations = useCallback(
    async ({ initial }: { initial: boolean }) => {
      if (!profileId) {
        setConversations([]);
        setIsLoading(false);
        setIsRefreshing(false);
        setError(null);
        lastRequestedProfileId.current = null;
        conversationIdsRef.current = [];
        return;
      }

      if (initial) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);
      lastRequestedProfileId.current = profileId;

      try {
        const data = await fetchConversationSummaries({ profileId, viewerProfileId: profileId });
        // Double-check that the response still corresponds to the latest profile id request
        if (lastRequestedProfileId.current === profileId) {
          setConversations(data);
          conversationIdsRef.current = data.map((item) => item.id);
        }
      } catch (err) {
        console.error('[useConversations] fetch error', err);
        setError("Impossible de récupérer vos conversations pour le moment.");
        setConversations([]);
        conversationIdsRef.current = [];
      } finally {
        if (lastRequestedProfileId.current === profileId) {
          if (initial) {
            setIsLoading(false);
          } else {
            setIsRefreshing(false);
          }
        }
      }
    },
    [profileId],
  );

  useEffect(() => {
    void loadConversations({ initial: true });
  }, [loadConversations]);

  useEffect(() => {
    if (!profileId) {
      return;
    }

    const handleConversationChange = () => {
      void loadConversations({ initial: false });
    };

    const handleMessageChange = (payload: { new?: { conversation_id?: string }; old?: { conversation_id?: string } }) => {
      const conversationId = payload.new?.conversation_id ?? payload.old?.conversation_id;
      if (conversationId && !conversationIdsRef.current.includes(conversationId)) {
        // Could belong to a new conversation; still refresh to keep list up to date.
        void loadConversations({ initial: false });
        return;
      }
      if (conversationId) {
        void loadConversations({ initial: false });
      }
    };

    const channel = supabase
      .channel(`conversations-feed-${profileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listing_conversations',
          filter: `guest_profile_id=eq.${profileId}`,
        },
        handleConversationChange,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listing_conversations',
          filter: `host_profile_id=eq.${profileId}`,
        },
        handleConversationChange,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listing_messages',
        },
        handleMessageChange,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadConversations, profileId]);

  const refresh = useCallback(async () => {
    await loadConversations({ initial: false });
  }, [loadConversations]);

  const memoizedResult = useMemo(
    () => ({
      conversations,
      isLoading,
      isRefreshing,
      error,
      refresh,
    }),
    [conversations, error, isLoading, isRefreshing, refresh],
  );

  return memoizedResult;
};
