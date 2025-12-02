import { useEffect, useRef } from 'react';

import { useNotifications } from '@/src/contexts/NotificationContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { getCommentById } from '@/src/features/comments/services';
import { supabase } from '@/src/supabaseClient';

const HostCommentNotificationBridge = () => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const { showNotification } = useNotifications();
  const latestNotifiedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !supabaseProfile?.id) {
      return;
    }

    const hostId = supabaseProfile.id;

    const channel = supabase
      .channel(`host-comment-alerts:${hostId}`)
      .on('postgres_changes', { schema: 'public', table: 'listing_comments', event: 'INSERT' }, async (payload) => {
        const rawId = payload.new?.id;
        if (rawId == null) {
          return;
        }

        const commentId = rawId.toString();

        // Avoid duplicate notifications when the real-time layer replays the same event
        if (latestNotifiedIdRef.current === commentId) {
          return;
        }

        try {
          const comment = await getCommentById(commentId);
          if (!comment) {
            return;
          }

          if (comment.listingHostId !== hostId || comment.profileId === hostId) {
            return;
          }

          const authorName = buildDisplayName(comment.author);
          const isReply = Boolean(comment.parentCommentId);
          const snippet = buildSnippet(comment.content);
          const listingLabel = comment.listingTitle ?? 'votre annonce';
          const titleBase = isReply ? 'Nouvelle réponse' : 'Nouveau commentaire';
          const title = `${titleBase} • ${listingLabel}`;
          const message = snippet ? `${authorName}: ${snippet}` : `${authorName} vous a écrit.`;

          showNotification({
            id: `host-comment-${commentId}-${Date.now()}`,
            title,
            message,
            action: { type: 'link', href: '/host-comments' },
          });

          latestNotifiedIdRef.current = commentId;
        } catch (error) {
          console.error('[HostCommentNotificationBridge] Unable to handle comment payload', error);
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isLoggedIn, showNotification, supabaseProfile?.id]);

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
  return 'Un voyageur';
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

export default HostCommentNotificationBridge;
