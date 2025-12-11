import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getListingComments,
  getCommentReplies,
  createListingComment,
  getCommentReplyCounts,
  getFirstRepliesForComments,
  getCommentById,
  deleteListingComment,
  getReplyCountForComment,
  getHostCommentThreads,
  getLandlordCommentThreads,
} from '../services';
import type { CommentWithAuthor, HostCommentThread } from '../types';
import { supabase } from '@/src/supabaseClient';
import { useNotifications } from '@/src/contexts/NotificationContext';

export const useComments = (listingId: string, profileId?: string | null, listingHostId?: string | null) => {
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [replies, setReplies] = useState<Record<string, CommentWithAuthor[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [firstReplies, setFirstReplies] = useState<Record<string, CommentWithAuthor>>({});
  const [commentLikes, setCommentLikes] = useState<Record<string, { liked: boolean; count: number }>>({});
  const [loadedListingId, setLoadedListingId] = useState<string | null>(null);
  const previousListingIdRef = useRef<string | null>(null);
  const commentsRef = useRef<CommentWithAuthor[]>(comments);
  const repliesRef = useRef<Record<string, CommentWithAuthor[]>>(replies);
  const { showNotification } = useNotifications();

  const storageKey = useMemo(() => (listingId ? `commentLikes:${listingId}` : null), [listingId]);

  const persistLikes = useCallback(
    async (nextLikes: Record<string, { liked: boolean; count: number }>) => {
      if (!storageKey) return;
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify(nextLikes));
      } catch (error) {
        console.warn('Failed to persist comment likes', error);
      }
    },
    [storageKey],
  );

  const loadStoredLikes = useCallback(async () => {
    if (!storageKey) {
      setCommentLikes({});
      return;
    }

    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { liked: boolean; count: number }>;
        setCommentLikes(parsed);
      } else {
        setCommentLikes({});
      }
    } catch (error) {
      console.warn('Failed to load stored comment likes', error);
      setCommentLikes({});
    }
  }, [storageKey]);

  const totalCommentsCount = useMemo(() => {
    const topLevelCount = comments.length;
    const repliesTotal = Object.values(replyCounts).reduce((sum, count) => sum + count, 0);
    return topLevelCount + repliesTotal;
  }, [comments, replyCounts]);

  const getListingIdFromRecord = useCallback((record: Record<string, unknown> | null | undefined): string | null => {
    if (!record) {
      return null;
    }
    const candidate = (record as { listing_id?: string | number | null }).listing_id;
    if (candidate == null) {
      return null;
    }
    return typeof candidate === 'string' ? candidate : candidate.toString();
  }, []);

  const getCommentIdFromRecord = useCallback((record: Record<string, unknown> | null | undefined): string | null => {
    if (!record) {
      return null;
    }
    const candidate = (record as { id?: string | number | null }).id;
    if (candidate == null) {
      return null;
    }
    return typeof candidate === 'string' ? candidate : candidate.toString();
  }, []);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  useEffect(() => {
    repliesRef.current = replies;
  }, [replies]);

  const isCommentTracked = useCallback((commentId: string | null | undefined): boolean => {
    if (!commentId) {
      return false;
    }
    if (commentsRef.current.some((comment) => comment.id === commentId)) {
      return true;
    }

    return Object.values(repliesRef.current).some((replyList) => replyList.some((reply) => reply.id === commentId));
  }, []);

  useEffect(() => {
    if (previousListingIdRef.current === listingId) {
      return;
    }

    previousListingIdRef.current = listingId ?? null;

    setLoadedListingId(null);
    setComments([]);
    setReplies({});
    setReplyCounts({});
    setFirstReplies({});
    setCommentLikes({});
  }, [listingId]);

  const loadComments = useCallback(async () => {
    if (!listingId) return;

    setIsLoading(true);
    try {
      const fetchedComments = await getListingComments(listingId);
      const decorated = fetchedComments.map((comment) => ({
        ...comment,
        roleLabel: listingHostId && comment.author.id === listingHostId ? 'Créateur' : undefined,
      }));
      setComments(decorated);
      const replyCountMap = await getCommentReplyCounts(listingId);
      setReplyCounts(replyCountMap);
      setReplies({});
      const commentIds = fetchedComments.map((comment) => comment.id);
      const previewReplies = await getFirstRepliesForComments(commentIds);
      setFirstReplies(previewReplies);
      setLoadedListingId(listingId);
      await loadStoredLikes();
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setIsLoading(false);
    }
  }, [listingId, listingHostId, loadStoredLikes]);

  const loadReplies = useCallback(async (commentId: string) => {
    const existingReplies = replies[commentId];
    if (existingReplies && (existingReplies.length > 0 || (replyCounts[commentId] ?? 0) === 0)) {
      return;
    }

    try {
      const fetchedReplies = await getCommentReplies(commentId);
      const decoratedReplies = fetchedReplies.map((reply) => ({
        ...reply,
        roleLabel: listingHostId && reply.author.id === listingHostId ? 'Créateur' : undefined,
      }));
      setReplies((prev) => ({ ...prev, [commentId]: decoratedReplies }));
      setReplyCounts((prev) => ({ ...prev, [commentId]: fetchedReplies.length }));
      if (fetchedReplies.length) {
        setFirstReplies((prev) => ({ ...prev, [commentId]: fetchedReplies[0] }));
      }
    } catch (error) {
      console.error('Failed to load replies:', error);
    }
  }, [listingHostId, replies, replyCounts]);

  const addComment = useCallback(async (content: string, parentCommentId?: string | null, replyingToName?: string | null) => {
    if (!listingId || !content.trim()) return;
    if (!profileId) {
      throw new Error('auth_profile_missing');
    }

    setIsSubmitting(true);
    try {
      const newComment = await createListingComment(listingId, content.trim(), profileId, parentCommentId);
      const enrichedComment = replyingToName ? { ...newComment, replyingToName } : newComment;

      if (parentCommentId) {
        setReplies((prev) => {
          const existingReplies = prev[parentCommentId] ?? [];
          return {
            ...prev,
            [parentCommentId]: [...existingReplies, enrichedComment],
          };
        });

        setReplyCounts((prev) => ({
          ...prev,
          [parentCommentId]: (prev[parentCommentId] ?? 0) + 1,
        }));

        const parentAuthorId = comments.find((comment) => comment.id === parentCommentId)?.author.id;
        if (parentAuthorId && parentAuthorId !== profileId) {
          const parentComment = comments.find((comment) => comment.id === parentCommentId);
          const preview = enrichedComment.content.length > 80
            ? `${enrichedComment.content.slice(0, 77)}...`
            : enrichedComment.content;

          showNotification({
            id: `comment-reply-${parentCommentId}-${Date.now()}`,
            title: 'Nouvelle réponse à votre commentaire',
            message:
              parentComment?.author.username
                ? `${parentComment.author.username} vous a répondu : ${preview}`
                : preview || 'Appuyez pour consulter la réponse reçue.',
            action: { type: 'link', href: '/comments' },
          });
        }

        setFirstReplies((prev) => {
          const currentFirst = prev[parentCommentId];
          return {
            ...prev,
            [parentCommentId]: currentFirst ?? enrichedComment,
          };
        });
      } else {
        setComments((prev) => [enrichedComment, ...prev]);
      }

      await loadStoredLikes();
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [listingId, loadStoredLikes, profileId]);

  const prependOrMergeComment = useCallback((incoming: CommentWithAuthor) => {
    const parentId = incoming.parentCommentId;

    if (!parentId) {
      setComments((prev) => {
        const exists = prev.some((comment) => comment.id === incoming.id);
        if (exists) {
          return prev;
        }
        return [incoming, ...prev];
      });
      return;
    }

    let inserted = false;
    let nextRepliesLength = 0;
    setReplies((prev) => {
      const existing = prev[parentId] ?? [];
      const alreadyPresent = existing.some((reply) => reply.id === incoming.id);
      if (alreadyPresent) {
        return prev;
      }
      inserted = true;
      nextRepliesLength = existing.length + 1;
      return {
        ...prev,
        [parentId]: [...existing, incoming],
      };
    });

    if (!inserted) {
      return;
    }

    setReplyCounts((prev) => ({
      ...prev,
      [parentId]: Math.max(nextRepliesLength, prev[parentId] ?? 0),
    }));

    setFirstReplies((prev) => {
      if (prev[parentId]) {
        return prev;
      }
      return {
        ...prev,
        [parentId]: incoming,
      };
    });
  }, []);

  const removeCommentLocally = useCallback((commentId: string, parentCommentId: string | null) => {
    if (!parentCommentId) {
      setComments((prev) => prev.filter((comment) => comment.id !== commentId));
      setReplies((prev) => {
        if (!prev[commentId]) {
          return prev;
        }
        const { [commentId]: _removed, ...rest } = prev;
        return rest;
      });
      setReplyCounts((prev) => {
        if (!(commentId in prev)) {
          return prev;
        }
        const { [commentId]: _removed, ...rest } = prev;
        return rest;
      });
      setFirstReplies((prev) => {
        if (!(commentId in prev)) {
          return prev;
        }
        const { [commentId]: _removed, ...rest } = prev;
        return rest;
      });
      return;
    }

    const parentId = parentCommentId;
    let nextRepliesForParent: CommentWithAuthor[] | undefined;

    setReplies((prev) => {
      const existing = prev[parentId] ?? [];
      const filtered = existing.filter((reply) => reply.id !== commentId);
      if (existing.length === filtered.length) {
        nextRepliesForParent = existing;
        return prev;
      }
      nextRepliesForParent = filtered;
      if (!filtered.length) {
        const { [parentId]: _removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [parentId]: filtered,
      };
    });

    setReplyCounts((prev) => {
      const current = prev[parentId] ?? 0;
      if (current <= 1) {
        const { [parentId]: _removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [parentId]: current - 1,
      };
    });

    setFirstReplies((prev) => {
      const currentFirst = prev[parentId];
      if (!currentFirst || currentFirst.id !== commentId) {
        return prev;
      }
      const nextFirst = nextRepliesForParent?.[0];
      if (!nextFirst) {
        const { [parentId]: _removed, ...rest } = prev;
        return rest;
      }
      return {
        ...prev,
        [parentId]: nextFirst,
      };
    });
  }, []);

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!listingId || !commentId) {
        return;
      }

      let parentCommentId: string | null = null;
      const isTopLevel = comments.some((comment) => comment.id === commentId);

      if (!isTopLevel) {
        for (const [parentId, replyList] of Object.entries(replies)) {
          if (replyList.some((reply) => reply.id === commentId)) {
            parentCommentId = parentId;
            break;
          }
        }
      }

      try {
        await deleteListingComment(commentId);
        removeCommentLocally(commentId, parentCommentId);
      } catch (error) {
        console.error('Failed to delete comment:', error);
        throw error;
      }
    },
    [comments, listingId, removeCommentLocally, replies],
  );

  useEffect(() => {
    if (!listingId) {
      return;
    }

    const channel = supabase
      .channel(`listing_comments:${listingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listing_comments',
        },
        async (payload) => {
          const eventListingId = getListingIdFromRecord(payload.new) ?? getListingIdFromRecord(payload.old);
          const targetCommentId = getCommentIdFromRecord(payload.new) ?? getCommentIdFromRecord(payload.old);

          if (eventListingId && eventListingId !== listingId) {
            return;
          }

          if (!eventListingId && !isCommentTracked(targetCommentId)) {
            return;
          }

          if (payload.eventType === 'INSERT') {
            const newId = payload.new?.id?.toString();
            if (!newId) {
              return;
            }
            try {
              const fresh = await getCommentById(newId);
              if (fresh) {
                const roleLabel = listingHostId && fresh.author.id === listingHostId ? 'Créateur' : undefined;
                prependOrMergeComment({ ...fresh, roleLabel });

                if (fresh.parentCommentId) {
                  try {
                    const accurateCount = await getReplyCountForComment(fresh.parentCommentId);
                    setReplyCounts((prev) => ({
                      ...prev,
                      [fresh.parentCommentId as string]: accurateCount,
                    }));
                  } catch (error) {
                    console.warn('Failed to refresh reply count for insert', error);
                  }
                }
              }
            } catch (error) {
              console.warn('Failed to fetch inserted comment', error);
            }
          }

          if (payload.eventType === 'DELETE') {
            const deletedParentId = payload.old?.parent_comment_id?.toString() ?? null;
            const deletedId = payload.old?.id?.toString();
            if (!deletedId) {
              return;
            }
            removeCommentLocally(deletedId, deletedParentId);
            try {
              await loadComments();
            } catch (error) {
              console.warn('Failed to refresh comments after delete', error);
            }
          }

          if (payload.eventType === 'UPDATE') {
            const updatedId = payload.new?.id?.toString();
            if (!updatedId) {
              return;
            }
            try {
              const fresh = await getCommentById(updatedId);
              if (!fresh) {
                return;
              }
              const roleLabel = listingHostId && fresh.author.id === listingHostId ? 'Créateur' : undefined;
              setComments((prev) => prev.map((comment) => (comment.id === updatedId ? { ...fresh, roleLabel } : comment)));
              const parentId = fresh.parentCommentId;
              if (parentId) {
                setReplies((prev) => {
                  const existing = prev[parentId] ?? [];
                  const nextReplies = existing.map((reply) =>
                    reply.id === updatedId ? { ...fresh, roleLabel } : reply,
                  );
                  return {
                    ...prev,
                    [parentId]: nextReplies,
                  };
                });

                try {
                  const accurateCount = await getReplyCountForComment(parentId);
                  setReplyCounts((prev) => ({
                    ...prev,
                    [parentId]: accurateCount,
                  }));
                } catch (error) {
                  console.warn('Failed to refresh reply count for update', error);
                }
              }
            } catch (error) {
              console.warn('Failed to refresh updated comment', error);
            }
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [getCommentIdFromRecord, getListingIdFromRecord, isCommentTracked, listingId, listingHostId, prependOrMergeComment, removeCommentLocally, loadComments]);

  useEffect(() => {
    loadStoredLikes();
  }, [loadStoredLikes]);

  const toggleCommentLike = useCallback(
    (commentId: string) => {
      setCommentLikes((prev) => {
        const current = prev[commentId] ?? { liked: false, count: 0 };
        const nextLiked = !current.liked;
        const nextCount = nextLiked ? current.count + 1 : Math.max(0, current.count - 1);
        const nextState = {
          ...prev,
          [commentId]: { liked: nextLiked, count: nextCount },
        };
        void persistLikes(nextState);
        return nextState;
      });
    },
    [persistLikes],
  );

  const isCommentLiked = useCallback(
    (commentId: string) => commentLikes[commentId]?.liked ?? false,
    [commentLikes],
  );

  const getCommentLikeCount = useCallback(
    (commentId: string) => commentLikes[commentId]?.count ?? 0,
    [commentLikes],
  );

  return {
    comments,
    replies,
    isLoading,
    isSubmitting,
    loadComments,
    loadReplies,
    addComment,
    deleteComment,
    getRepliesForComment: (commentId: string) => replies[commentId] || [],
    hasReplies: (commentId: string) => Boolean(replyCounts[commentId] ?? 0),
    getReplyCount: (commentId: string) => replyCounts[commentId] ?? 0,
    getFirstReply: (commentId: string) => firstReplies[commentId] ?? null,
    totalCommentsCount,
    loadedListingId,
    toggleCommentLike,
    isCommentLiked,
    getCommentLikeCount,
  };
};

export const useHostCommentThreads = (hostId?: string | null) => {
  const [threads, setThreads] = useState<HostCommentThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const loadThreads = useCallback(async () => {
    if (!hostId) {
      setThreads([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getHostCommentThreads(hostId);
      setThreads(data);
    } catch (error) {
      console.error('Failed to load host comment threads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!hostId) {
      return;
    }

    const channel = supabase
      .channel(`host-comments:${hostId}`)
      .on('postgres_changes', { schema: 'public', table: 'listing_comments', event: '*' }, () => {
        void loadThreads();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hostId, loadThreads]);

  const totalCount = useMemo(
    () => threads.reduce((acc, thread) => acc + 1 + (thread.replies?.length ?? 0), 0),
    [threads],
  );

  return {
    threads,
    isLoading,
    refresh: loadThreads,
    totalCount,
  };
};

export const useLandlordCommentThreads = (landlordId?: string | null) => {
  const [threads, setThreads] = useState<HostCommentThread[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadThreads = useCallback(async () => {
    if (!landlordId) {
      setThreads([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getLandlordCommentThreads(landlordId);
      setThreads(data);
    } catch (error) {
      console.error('Failed to load landlord comment threads:', error);
    } finally {
      setIsLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (!landlordId) {
      return undefined;
    }

    const channel = supabase
      .channel(`landlord-comments:${landlordId}`)
      .on('postgres_changes', { schema: 'public', table: 'listing_comments', event: '*' }, () => {
        void loadThreads();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [landlordId, loadThreads]);

  const totalCount = useMemo(
    () => threads.reduce((acc, thread) => acc + 1 + (thread.replies?.length ?? 0), 0),
    [threads],
  );

  return {
    threads,
    isLoading,
    refresh: loadThreads,
    totalCount,
  };
};
