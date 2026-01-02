import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNotifications } from '@/src/contexts/NotificationContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { getCommentById } from '@/src/features/comments/services';
import { supabase } from '@/src/supabaseClient';

const NOTIFIED_COMMENTS_STORAGE_KEY = 'notified_comments_cache';

const HostCommentNotificationBridge = () => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const { showNotification } = useNotifications();
  const latestNotifiedIdRef = useRef<string | null>(null);
  const notifiedCommentsRef = useRef<Set<string>>(new Set());
  const [notifiedCommentsLoaded, setNotifiedCommentsLoaded] = useState(false);

  // 💾 Charger le cache des notifications affichées depuis AsyncStorage
  useEffect(() => {
    const loadNotifiedComments = async () => {
      try {
        const cached = await AsyncStorage.getItem(NOTIFIED_COMMENTS_STORAGE_KEY);
        if (cached) {
          const notifiedIds = JSON.parse(cached) as string[];
          notifiedCommentsRef.current = new Set(notifiedIds);
          console.log('[HostCommentNotificationBridge] Loaded notified comments from cache:', notifiedIds.length);
        }
      } catch (error) {
        console.error('[HostCommentNotificationBridge] Error loading notified comments cache:', error);
      } finally {
        setNotifiedCommentsLoaded(true);
      }
    };

    loadNotifiedComments();
  }, []);

  // 🔔 Écouter les broadcasts pour les nouveaux commentaires
  useEffect(() => {
    if (!isLoggedIn || !supabaseProfile?.id || !notifiedCommentsLoaded) {
      return;
    }

    const hostId = supabaseProfile.id;
    const channelName = `comment-notifications-${hostId}`;

    console.log('[HostCommentNotificationBridge] Setting up broadcast subscription for comments');
    console.log('[HostCommentNotificationBridge] Listening on channel:', channelName);

    const broadcastChannel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'new_comment' }, (payload: any) => {
        console.log('[HostCommentNotificationBridge] 🎉 Received new comment broadcast:', payload);

        const commentData = payload.payload;
        if (!commentData) {
          console.log('[HostCommentNotificationBridge] No comment data in payload');
          return;
        }

        const notificationKey = `comment-${commentData.commentId}`;
        if (notifiedCommentsRef.current.has(notificationKey)) {
          console.log('[HostCommentNotificationBridge] Already notified for comment:', commentData.commentId);
          return;
        }

        const title = `Nouveau commentaire • ${commentData.listingTitle}`;
        const message = `${commentData.authorName}: ${commentData.content}`;

        console.log('[HostCommentNotificationBridge] Showing comment notification:', { title, message });

        try {
          showNotification({
            id: `host-comment-${commentData.commentId}-${Date.now()}`,
            title,
            message,
            action: { type: 'link', href: '/host-comments' },
          });

          notifiedCommentsRef.current.add(notificationKey);

          // 💾 Sauvegarder le cache
          const notifiedArray = Array.from(notifiedCommentsRef.current);
          AsyncStorage.setItem(NOTIFIED_COMMENTS_STORAGE_KEY, JSON.stringify(notifiedArray)).catch((err) => {
            console.error('[HostCommentNotificationBridge] Error saving notified comments cache:', err);
          });
          console.log('[HostCommentNotificationBridge] Comment notification displayed and cached');
        } catch (error) {
          console.error('[HostCommentNotificationBridge] Error showing comment notification:', error);
        }
      })
      .subscribe((status) => {
        console.log('[HostCommentNotificationBridge] Broadcast subscription status:', status);
      });

    return () => {
      console.log('[HostCommentNotificationBridge] Cleaning up broadcast subscription');
      supabase.removeChannel(broadcastChannel);
    };
  }, [isLoggedIn, supabaseProfile?.id, notifiedCommentsLoaded, showNotification]);

  // 🔔 Écouter aussi les postgres_changes comme fallback
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
