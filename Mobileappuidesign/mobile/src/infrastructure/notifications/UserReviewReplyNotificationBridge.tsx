import { useEffect, useRef } from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
import { useNotifications } from '@/src/contexts/NotificationContext';
import { getUserReviewReplyById } from '@/src/features/reviews/services';
import { supabase } from '@/src/supabaseClient';

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
              title: `Nouvelle réponse d’hôte • ${listingLabel}`,
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
