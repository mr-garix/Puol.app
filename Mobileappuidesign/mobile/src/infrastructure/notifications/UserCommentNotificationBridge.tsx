import { useEffect, useRef } from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
import { useNotifications } from '@/src/contexts/NotificationContext';
import { getCommentById } from '@/src/features/comments/services';
import { supabase } from '@/src/supabaseClient';

const UserCommentNotificationBridge = () => {
  const { isLoggedIn, supabaseProfile } = useAuth();
  const { showNotification } = useNotifications();
  const lastNotifiedRef = useRef<string | null>(null);

  useEffect(() => {
    const userId = supabaseProfile?.id;
    if (!isLoggedIn || !userId) {
      return;
    }

    const channel = supabase
      .channel(`user-comment-alerts:${userId}`)
      .on('postgres_changes', { schema: 'public', table: 'listing_comments', event: 'INSERT' }, async (payload) => {
        const rawId = payload.new?.id;
        if (!rawId) {
          return;
        }

        const commentId = rawId.toString();
        if (lastNotifiedRef.current === commentId) {
          return;
        }

        try {
          const comment = await getCommentById(commentId);
          if (!comment) {
            return;
          }

          if (!comment.parentCommentId) {
            return;
          }

          if (comment.author.id === userId) {
            return;
          }

          const parent = await getCommentById(comment.parentCommentId);
          if (!parent) {
            return;
          }

          if (parent.author.id !== userId) {
            return;
          }

          const authorName = buildDisplayName(comment.author);
          const listingLabel = comment.listingTitle ?? 'un de vos séjours';
          const snippet = buildSnippet(comment.content);

          showNotification({
            id: `user-comment-reply-${commentId}-${Date.now()}`,
            title: `Nouvelle réponse • ${listingLabel}`,
            message: snippet ? `${authorName}: ${snippet}` : `${authorName} a répondu à votre commentaire.`,
            action: { type: 'link', href: '/comments' },
          });

          lastNotifiedRef.current = commentId;
        } catch (error) {
          console.error('[UserCommentNotificationBridge] Unable to handle comment payload', error);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isLoggedIn, supabaseProfile?.id, showNotification]);

  return null;
};

const buildDisplayName = (author: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  enterpriseName: string | null;
}) => {
  const first = author.firstName?.trim();
  const last = author.lastName?.trim();
  if (first && last) {
    return `${first} ${last}`;
  }
  if (author.username?.trim()) {
    return author.username;
  }
  if (author.enterpriseName?.trim()) {
    return author.enterpriseName;
  }
  return 'Un hôte';
};

const buildSnippet = (content: string) => {
  if (!content) {
    return '';
  }
  const trimmed = content.trim();
  if (trimmed.length <= 90) {
    return trimmed;
  }
  return `${trimmed.slice(0, 87)}…`;
};

export default UserCommentNotificationBridge;
