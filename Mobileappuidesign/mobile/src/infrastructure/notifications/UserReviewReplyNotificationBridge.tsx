import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useAuth } from '@/src/contexts/AuthContext';
import { useNotifications } from '@/src/contexts/NotificationContext';
import { getUserReviewReplyById } from '@/src/features/reviews/services';
import { supabase } from '@/src/supabaseClient';

const NOTIFIED_REVIEW_REPLIES_STORAGE_KEY = 'notified_review_replies_cache';

const buildSnippet = (value?: string | null) => {
  if (!value) {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed.length) {
    return '';
  }
  if (trimmed.length <= 90) {
    return trimmed;
  }
  return `${trimmed.slice(0, 87)}…`;
};

const UserReviewReplyNotificationBridge = () => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const { showNotification } = useNotifications();
  const lastNotifiedRef = useRef<string | null>(null);
  const notifiedRepliesRef = useRef<Set<string>>(new Set());
  const [notifiedRepliesLoaded, setNotifiedRepliesLoaded] = useState(false);

  // 💾 Charger le cache des notifications affichées depuis AsyncStorage
  useEffect(() => {
    const loadNotifiedReplies = async () => {
      try {
        const cached = await AsyncStorage.getItem(NOTIFIED_REVIEW_REPLIES_STORAGE_KEY);
        if (cached) {
          const notifiedIds = JSON.parse(cached) as string[];
          notifiedRepliesRef.current = new Set(notifiedIds);
          console.log('[UserReviewReplyNotificationBridge] Loaded notified replies from cache:', notifiedIds.length);
        }
      } catch (error) {
        console.error('[UserReviewReplyNotificationBridge] Error loading notified replies cache:', error);
      } finally {
        setNotifiedRepliesLoaded(true);
      }
    };

    loadNotifiedReplies();
  }, []);

  // 🔔 Écouter les broadcasts pour les réponses aux avis
  useEffect(() => {
    const userId = supabaseProfile?.id;
    if (!isLoggedIn || !userId || !notifiedRepliesLoaded) {
      return;
    }

    const channelName = `review-reply-notifications-${userId}`;
    console.log('[UserReviewReplyNotificationBridge] Setting up broadcast subscription for review replies');
    console.log('[UserReviewReplyNotificationBridge] Listening on channel:', channelName);

    const broadcastChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'new_review_reply' }, (payload: any) => {
        console.log('[UserReviewReplyNotificationBridge] 🎉 Received new review reply broadcast:', payload);

        const replyData = payload.payload;
        if (!replyData) {
          console.log('[UserReviewReplyNotificationBridge] No reply data in payload');
          return;
        }

        const notificationKey = `reply-${replyData.reviewId}`;
        if (notifiedRepliesRef.current.has(notificationKey)) {
          console.log('[UserReviewReplyNotificationBridge] Already notified for reply:', replyData.reviewId);
          return;
        }

        const title = `Nouvelle réponse d'hôte`;
        const message = `${replyData.hostName}: ${replyData.content}`;

        console.log('[UserReviewReplyNotificationBridge] Showing reply notification:', { title, message });

        try {
          showNotification({
            id: `user-review-reply-${replyData.reviewId}-${Date.now()}`,
            title,
            message,
            action: { type: 'link', href: `/property/${replyData.listingId}/reviews` },
          });

          notifiedRepliesRef.current.add(notificationKey);

          // 💾 Sauvegarder le cache
          const notifiedArray = Array.from(notifiedRepliesRef.current);
          AsyncStorage.setItem(NOTIFIED_REVIEW_REPLIES_STORAGE_KEY, JSON.stringify(notifiedArray)).catch((err) => {
            console.error('[UserReviewReplyNotificationBridge] Error saving notified replies cache:', err);
          });
          console.log('[UserReviewReplyNotificationBridge] Reply notification displayed and cached');
        } catch (error) {
          console.error('[UserReviewReplyNotificationBridge] Error showing reply notification:', error);
        }
      })
      .subscribe((status) => {
        console.log('[UserReviewReplyNotificationBridge] Broadcast subscription status:', status);
      });

    return () => {
      console.log('[UserReviewReplyNotificationBridge] Cleaning up broadcast subscription');
      supabase.removeChannel(broadcastChannel);
    };
  }, [isLoggedIn, supabaseProfile?.id, notifiedRepliesLoaded, showNotification]);

  // 🔔 Écouter aussi les postgres_changes comme fallback
  useEffect(() => {
    const userId = supabaseProfile?.id;
    if (!isLoggedIn || !userId) {
      return;
    }

    const channel = supabase
      .channel(`user-review-reply-alerts:${userId}`)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'reviews',
          event: 'UPDATE',
          filter: `author_id=eq.${userId}`,
        },
        async (payload) => {
          const rawId = payload.new?.id;
          if (!rawId) {
            return;
          }

          const reviewId = rawId.toString();
          const previousReply = payload.old?.owner_reply;
          const currentReply = payload.new?.owner_reply;

          if (!currentReply || currentReply === previousReply) {
            return;
          }

          if (lastNotifiedRef.current === `${reviewId}:${currentReply}`) {
            return;
          }

          try {
            const review = await getUserReviewReplyById(reviewId);
            if (!review) {
              return;
            }

            const listingLabel = review.listingTitle ?? 'votre séjour';
            const snippet = buildSnippet(currentReply);
            const href = review.listingId ? `/property/${review.listingId}/reviews` : '/reviews';

            showNotification({
              id: `user-review-reply-${reviewId}-${Date.now()}`,
              title: `Nouvelle réponse d'hôte • ${listingLabel}`,
              message: snippet ? `« ${snippet} »` : 'Votre hôte a répondu à votre avis.',
              action: { type: 'link', href },
            });

            lastNotifiedRef.current = `${reviewId}:${currentReply}`;
          } catch (error) {
            console.error('[UserReviewReplyNotificationBridge] Unable to handle review reply payload', error);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isLoggedIn, showNotification, supabaseProfile?.id]);

  return null;
};

export default UserReviewReplyNotificationBridge;
