import { useEffect, useRef } from 'react';

import { useNotifications } from '@/src/contexts/NotificationContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { getHostReviewById } from '@/src/features/reviews/services';
import { supabase } from '@/src/supabaseClient';

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
