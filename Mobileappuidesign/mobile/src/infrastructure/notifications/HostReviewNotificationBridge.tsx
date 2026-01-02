import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNotifications } from '@/src/contexts/NotificationContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { getHostReviewById } from '@/src/features/reviews/services';
import { supabase } from '@/src/supabaseClient';

const NOTIFIED_REVIEWS_STORAGE_KEY = 'notified_reviews_cache';

const buildSnippet = (comment: string | null | undefined) => {
  if (!comment) {
    return '';
  }
  const trimmed = comment.trim();
  if (!trimmed.length) {
    return '';
  }
  if (trimmed.length <= 90) {
    return trimmed;
  }
  return `${trimmed.slice(0, 87)}…`;
};

const HostReviewNotificationBridge = () => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const { showNotification } = useNotifications();
  const lastNotifiedRef = useRef<string | null>(null);
  const notifiedReviewsRef = useRef<Set<string>>(new Set());
  const [notifiedReviewsLoaded, setNotifiedReviewsLoaded] = useState(false);

  // 💾 Charger le cache des notifications affichées depuis AsyncStorage
  useEffect(() => {
    const loadNotifiedReviews = async () => {
      try {
        const cached = await AsyncStorage.getItem(NOTIFIED_REVIEWS_STORAGE_KEY);
        if (cached) {
          const notifiedIds = JSON.parse(cached) as string[];
          notifiedReviewsRef.current = new Set(notifiedIds);
          console.log('[HostReviewNotificationBridge] Loaded notified reviews from cache:', notifiedIds.length);
        }
      } catch (error) {
        console.error('[HostReviewNotificationBridge] Error loading notified reviews cache:', error);
      } finally {
        setNotifiedReviewsLoaded(true);
      }
    };

    loadNotifiedReviews();
  }, []);

  // 🔔 Écouter les broadcasts pour les nouveaux avis
  useEffect(() => {
    const hostId = supabaseProfile?.id;
    if (!isLoggedIn || !hostId || !notifiedReviewsLoaded) {
      return;
    }

    const channelName = `review-notifications-${hostId}`;
    console.log('[HostReviewNotificationBridge] Setting up broadcast subscription for reviews');
    console.log('[HostReviewNotificationBridge] Listening on channel:', channelName);

    const broadcastChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'new_review' }, (payload: any) => {
        console.log('[HostReviewNotificationBridge] 🎉 Received new review broadcast:', payload);

        const reviewData = payload.payload;
        if (!reviewData) {
          console.log('[HostReviewNotificationBridge] No review data in payload');
          return;
        }

        const notificationKey = `review-${reviewData.reviewId}`;
        if (notifiedReviewsRef.current.has(notificationKey)) {
          console.log('[HostReviewNotificationBridge] Already notified for review:', reviewData.reviewId);
          return;
        }

        const title = `Nouvel avis reçu • ${reviewData.listingTitle}`;
        const message = `${reviewData.rating}/5 • ${reviewData.content}`;

        console.log('[HostReviewNotificationBridge] Showing review notification:', { title, message });

        try {
          showNotification({
            id: `host-review-${reviewData.reviewId}-${Date.now()}`,
            title,
            message,
            action: { type: 'link', href: '/host-reviews' },
          });

          notifiedReviewsRef.current.add(notificationKey);

          // 💾 Sauvegarder le cache
          const notifiedArray = Array.from(notifiedReviewsRef.current);
          AsyncStorage.setItem(NOTIFIED_REVIEWS_STORAGE_KEY, JSON.stringify(notifiedArray)).catch((err) => {
            console.error('[HostReviewNotificationBridge] Error saving notified reviews cache:', err);
          });
          console.log('[HostReviewNotificationBridge] Review notification displayed and cached');
        } catch (error) {
          console.error('[HostReviewNotificationBridge] Error showing review notification:', error);
        }
      })
      .subscribe((status) => {
        console.log('[HostReviewNotificationBridge] Broadcast subscription status:', status);
      });

    return () => {
      console.log('[HostReviewNotificationBridge] Cleaning up broadcast subscription');
      supabase.removeChannel(broadcastChannel);
    };
  }, [isLoggedIn, supabaseProfile?.id, notifiedReviewsLoaded, showNotification]);

  // 🔔 Écouter aussi les postgres_changes comme fallback
  useEffect(() => {
    const hostId = supabaseProfile?.id;
    if (!isLoggedIn || !hostId) {
      return;
    }

    const channel = supabase
      .channel(`host-review-alerts:${hostId}`)
      .on('postgres_changes', { schema: 'public', table: 'reviews', event: 'INSERT' }, async (payload) => {
        const rawId = payload.new?.id;
        if (rawId == null) {
          return;
        }

        const reviewId = rawId.toString();
        if (lastNotifiedRef.current === reviewId) {
          return;
        }

        try {
          const review = await getHostReviewById(reviewId);
          if (!review) {
            return;
          }

          if (review.listingHostId !== hostId) {
            return;
          }

          if (review.authorId === hostId) {
            return;
          }

          const authorName = review.authorName ?? 'Un voyageur';
          const listingTitle = review.listingTitle ?? 'votre logement';
          const rating = Number.isFinite(review.rating) ? Math.max(0, Math.min(5, review.rating)) : 0;
          const snippet = buildSnippet(review.comment);

          const messageParts: string[] = [];
          messageParts.push(`${authorName} a laissé ${rating}/5`);
          if (snippet) {
            messageParts.push(`« ${snippet} »`);
          }

          showNotification({
            id: `host-review-${reviewId}-${Date.now()}`,
            title: `Nouvel avis reçu • ${listingTitle}`,
            message: messageParts.join(' • '),
            action: { type: 'link', href: '/host-reviews' },
          });

          lastNotifiedRef.current = reviewId;
        } catch (error) {
          console.error('[HostReviewNotificationBridge] Unable to handle review payload', error);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isLoggedIn, showNotification, supabaseProfile?.id]);

  return null;
};

export default HostReviewNotificationBridge;
