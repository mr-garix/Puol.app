import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import { CommentWithAuthor } from '../../comments/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

interface CommentBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  comments: CommentWithAuthor[];
  replies: Record<string, CommentWithAuthor[]>;
  onAddComment: (text: string, replyToId?: string | null, replyingToName?: string | null) => Promise<void>;
  onLoadReplies: (commentId: string) => Promise<void>;
  getRepliesForComment: (commentId: string) => CommentWithAuthor[];
  hasReplies: (commentId: string) => boolean;
  isLoading?: boolean;
  isSubmitting?: boolean;
  initialCommentId?: string | null;
  currentUserId?: string;
  currentUserAvatar?: string;
  propertyTitle?: string;
  getReplyCount?: (commentId: string) => number;
  totalCommentsCount?: number;
  getFirstReply?: (commentId: string) => CommentWithAuthor | null;
  onToggleCommentLike?: (commentId: string) => void;
  isCommentLiked?: (commentId: string) => boolean;
  getCommentLikeCount?: (commentId: string) => number;
  listingHostId?: string | null;
  onDeleteComment?: (commentId: string) => Promise<void> | void;
  highlightReplyId?: string | null;
  onAuthorPress?: (profileId: string) => void;
}

export const CommentBottomSheet: React.FC<CommentBottomSheetProps> = ({
  visible,
  onClose,
  comments,
  replies,
  onAddComment,
  onLoadReplies,
  getRepliesForComment,
  hasReplies,
  isLoading = false,
  isSubmitting = false,
  initialCommentId,
  currentUserId,
  currentUserAvatar,
  propertyTitle = 'Commentaires',
  getReplyCount,
  totalCommentsCount,
  getFirstReply,
  onToggleCommentLike,
  isCommentLiked,
  getCommentLikeCount,
  listingHostId,
  onDeleteComment,
  highlightReplyId,
  onAuthorPress,
}) => {
  const router = useRouter();
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    userName: string;
    rootCommentId: string;
  } | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [highlightedReplyId, setHighlightedReplyId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastHighlightIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!visible || !initialCommentId) {
      return;
    }

    setExpandedReplies((prev) => {
      if (prev.has(initialCommentId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(initialCommentId);
      return next;
    });
  }, [visible, initialCommentId]);

  useEffect(() => {
    if (!visible || !initialCommentId || !comments.length) {
      return;
    }

    const loadAndScroll = async () => {
      const existingReplies = getRepliesForComment(initialCommentId);
      if (!existingReplies?.length && hasReplies(initialCommentId)) {
        try {
          await onLoadReplies(initialCommentId);
        } catch (error) {
          console.warn('Failed to load replies for initial comment', error);
        }
      }

      const commentIndex = comments.findIndex((comment) => comment.id === initialCommentId);
      if (commentIndex !== -1) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: commentIndex,
            animated: true,
            viewPosition: 0.5,
          });
        }, 300);
      }
    };

    loadAndScroll();
  }, [visible, initialCommentId, comments, getRepliesForComment, hasReplies, onLoadReplies]);

  useEffect(() => {
    if (!visible) {
      setHighlightedReplyId(null);
      lastHighlightIdRef.current = null;
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = null;
      }
      return;
    }

    if (!highlightReplyId || !initialCommentId) {
      return;
    }

    if (lastHighlightIdRef.current === highlightReplyId) {
      return;
    }

    lastHighlightIdRef.current = highlightReplyId;

    const expandAndHighlight = async () => {
      try {
        const existingReplies = getRepliesForComment(initialCommentId);
        const alreadyLoaded = existingReplies?.some((reply) => reply.id === highlightReplyId);
        if (!alreadyLoaded) {
          await onLoadReplies(initialCommentId);
        }
      } catch (error) {
        console.warn('Failed to preload replies for highlight', error);
      }

      setExpandedReplies((prev) => {
        const next = new Set(prev);
        next.add(initialCommentId);
        return next;
      });

      setHighlightedReplyId(highlightReplyId);

      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
      highlightTimerRef.current = setTimeout(() => {
        setHighlightedReplyId(null);
        highlightTimerRef.current = null;
      }, 3500);

      setTimeout(() => {
        const index = comments.findIndex((comment) => comment.id === initialCommentId);
        if (index !== -1) {
          flatListRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.4 });
        }
      }, 350);
    };

    expandAndHighlight();
  }, [visible, highlightReplyId, initialCommentId, comments, getRepliesForComment, onLoadReplies]);

  const pan = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<CommentWithAuthor>>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(pan, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      pan.setValue(BOTTOM_SHEET_MAX_HEIGHT);
      opacity.setValue(0);
    }
  }, [visible, opacity, pan]);

  const closeSheet = (afterClose?: () => void) => {
    Animated.parallel([
      Animated.timing(pan, {
        toValue: BOTTOM_SHEET_MAX_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
      setReplyingTo(null);
      setExpandedReplies(new Set());
      if (afterClose) {
        InteractionManager.runAfterInteractions(afterClose);
      }
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_evt, gesture) => {
        if (gesture.dy > 0) {
          pan.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_evt, gesture) => {
        if (gesture.dy > 100 || gesture.vy > 0.5) {
          closeSheet();
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
            tension: 50,
            friction: 8,
          }).start();
        }
      },
    }),
  ).current;

  const handleAddComment = async (text: string) => {
    try {
      await onAddComment(text, replyingTo?.rootCommentId ?? replyingTo?.id, replyingTo?.userName ?? null);
      setReplyingTo(null);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleReply = (commentId: string, userName: string, rootCommentId: string) => {
    setReplyingTo({
      id: commentId,
      userName,
      rootCommentId,
    });
  };

  const handleToggleReplies = async (commentId: string) => {
    const isCurrentlyExpanded = expandedReplies.has(commentId);
    const existingReplies = getRepliesForComment(commentId);
    const replyCount = getReplyCount ? getReplyCount(commentId) : existingReplies.length;

    if (!isCurrentlyExpanded) {
      setExpandedReplies((prev) => new Set([...prev, commentId]));

      if (replyCount > 0 && existingReplies.length === 0) {
        await onLoadReplies(commentId);
      }
    } else {
      setExpandedReplies((prev) => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  const handleAuthorPressFromComment = (profileId: string) => {
    console.log('[CommentBottomSheet] onAuthorPress received', {
      profileId,
      hasProfileId: Boolean(profileId),
    });
    if (!profileId) {
      return;
    }
    const normalizedProfileId = String(profileId);
    closeSheet(() => {
      if (onAuthorPress) {
        onAuthorPress(normalizedProfileId);
      } else {
        router.push({ pathname: '/profile/[profileId]', params: { profileId: normalizedProfileId } } as never);
      }
    });
  };

  const renderCommentItem = (
    item: CommentWithAuthor,
    isReply = false,
    parentAuthorName?: string,
    rootCommentId?: string,
  ) => {
    const effectiveRootId = rootCommentId ?? item.id;
    const commentReplies = getRepliesForComment(item.id);
    const isExpanded = expandedReplies.has(item.id);
    const replyCount = getReplyCount ? getReplyCount(item.id) : commentReplies.length;
    const previewReply = !isReply && !isExpanded ? (getFirstReply?.(item.id) ?? commentReplies[0]) : null;
    const authorName = item.author.firstName && item.author.lastName 
      ? `${item.author.firstName} ${item.author.lastName}`
      : item.author.username || item.author.enterpriseName || 'Utilisateur';
    const roleLabel = item.roleLabel || (listingHostId && item.author.id === listingHostId ? 'Créateur' : undefined);
    const replyingToLabel = item.replyingToName ?? parentAuthorName;

    const likeCount = getCommentLikeCount ? getCommentLikeCount(item.id) : 0;
    const liked = isCommentLiked ? isCommentLiked(item.id) : false;

    const handleDelete = async () => {
      if (!onDeleteComment) {
        return;
      }
      try {
        await onDeleteComment(item.id);
      } catch (error) {
        console.error('Failed to delete comment from bottom sheet:', error);
      }
    };

    const isHighlighted = highlightedReplyId === item.id;

    const normalizedAuthorId = (() => {
      const raw = item.author?.id ?? item.profileId ?? item.listingHostId ?? '';
      if (!raw) {
        console.log('[CommentBottomSheet] Missing author id for comment', {
          commentId: item.id,
          author: item.author,
          profileId: item.profileId,
          listingHostId: item.listingHostId,
        });
      }
      return raw ? String(raw) : '';
    })();

    return (
      <View key={item.id} style={[isReply && styles.replyItem]}>
        <CommentItem
          comment={{
            id: item.id,
            userId: normalizedAuthorId,
            userName: authorName,
            userAvatar: item.author.avatarUrl || item.author.enterpriseLogoUrl || undefined,
            userIsVerified: Boolean(item.author.isVerified),
            roleLabel,
            replyingToName: replyingToLabel ?? undefined,
            text: item.content,
            timestamp: new Date(item.createdAt),
            likes: likeCount,
            isLiked: liked,
          }}
          onLike={(commentId) => onToggleCommentLike?.(commentId)}
          onReply={() => handleReply(item.id, authorName, effectiveRootId)}
          onDelete={currentUserId && currentUserId === item.author.id ? () => void handleDelete() : undefined}
          currentUserId={currentUserId}
          isReply={isReply}
          isHighlighted={isHighlighted}
          onAuthorPress={handleAuthorPressFromComment}
        />

        {!isReply && previewReply && (
          <View style={styles.previewReplyWrapper}>
            {(() => {
              const previewAuthorName =
                previewReply.author.firstName && previewReply.author.lastName
                  ? `${previewReply.author.firstName} ${previewReply.author.lastName}`
                  : previewReply.author.username || previewReply.author.enterpriseName || 'Utilisateur';

              return (
                <CommentItem
                  comment={{
                    id: previewReply.id,
                    userId: String(previewReply.author?.id ?? previewReply.profileId ?? previewReply.listingHostId ?? ''),
                    userName:
                      (previewReply.author.firstName && previewReply.author.lastName
                        ? `${previewReply.author.firstName} ${previewReply.author.lastName}`
                        : previewReply.author.username || previewReply.author.enterpriseName || 'Utilisateur'),
                    userAvatar: previewReply.author.avatarUrl || previewReply.author.enterpriseLogoUrl || undefined,
                    userIsVerified: Boolean(previewReply.author.isVerified),
                    roleLabel:
                      previewReply.roleLabel || (listingHostId && previewReply.author.id === listingHostId ? 'Créateur' : undefined),
                    replyingToName: previewReply.replyingToName ?? authorName,
                    text: previewReply.content,
                    timestamp: new Date(previewReply.createdAt),
                    likes: getCommentLikeCount ? getCommentLikeCount(previewReply.id) : 0,
                    isLiked: isCommentLiked ? isCommentLiked(previewReply.id) : false,
                  }}
                  onLike={(commentId) => onToggleCommentLike?.(commentId)}
                  onReply={() => handleReply(previewReply.id, previewAuthorName, effectiveRootId)}
                  onDelete={currentUserId && currentUserId === previewReply.author.id ? () => onDeleteComment?.(previewReply.id) : undefined}
                  currentUserId={currentUserId}
                  variant="preview"
                  isReply
                  isHighlighted={highlightedReplyId === previewReply.id}
                  onAuthorPress={handleAuthorPressFromComment}
                />
              );
            })()}
          </View>
        )}

        {!isReply && replyCount > 0 && (
          <View style={styles.repliesSection}>
            <TouchableOpacity
              style={styles.repliesToggle}
              onPress={() => handleToggleReplies(item.id)}
            >
              <Text style={styles.repliesToggleText}>
                {isExpanded ? 'Masquer' : 'Afficher'} {replyCount} réponse{replyCount > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
            
            {isExpanded && (
              <View style={styles.repliesList}>
                {commentReplies.map(reply => renderCommentItem(reply, true, authorName, effectiveRootId))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  const translateY = pan.interpolate({
    inputRange: [0, BOTTOM_SHEET_MAX_HEIGHT],
    outputRange: [0, BOTTOM_SHEET_MAX_HEIGHT],
    extrapolate: 'clamp',
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={() => closeSheet()}
    >
      <View style={styles.modalContainer}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.5],
              }),
            },
          ]}
        >
          <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => closeSheet()}
              activeOpacity={1}
            />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSheet,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers}>
            <View style={styles.handleContainer}>
              <View style={styles.handle} />
            </View>

            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {totalCommentsCount ?? comments.length} {(totalCommentsCount ?? comments.length) > 1 ? 'commentaires' : 'commentaire'}
              </Text>
              <TouchableOpacity
                onPress={() => closeSheet()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderCommentItem(item, false, undefined, item.id)}
            extraData={{ expandedReplies, highlightedReplyId }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              !isLoading ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>💬</Text>
                  <Text style={styles.emptyTitle}>Aucun commentaire</Text>
                  <Text style={styles.emptySubtitle}>
                    Soyez le premier à commenter
                  </Text>
                </View>
              ) : null
            }
            ListFooterComponent={
              isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Chargement...</Text>
                </View>
              ) : null
            }
          />

          <CommentInput
            onSubmit={handleAddComment}
            placeholder={
              replyingTo
                ? `Répondre à ${replyingTo.userName}...`
                : 'Ajouter un commentaire...'
            }
            userAvatar={currentUserAvatar}
            replyingTo={replyingTo?.userName}
            onCancelReply={() => setReplyingTo(null)}
            disabled={isSubmitting}
          />
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_SHEET_MAX_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#D0D0D0',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F8F8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666666',
    fontWeight: '400',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 16,
  },
  replyItem: {
    marginLeft: 20,
    paddingLeft: 16,
  },
  repliesSection: {
    marginTop: 2,
    marginBottom: 12,
  },
  repliesToggle: {
    paddingVertical: 2,
    alignSelf: 'center',
  },
  repliesToggleText: {
    fontSize: 11,
    color: '#6D6D6D',
    fontWeight: '500',
    textAlign: 'center',
  },
  repliesList: {
    marginTop: 0,
    width: '100%',
    paddingBottom: 20,
  },
  previewReplyWrapper: {
    marginTop: 2,
    alignSelf: 'center',
    width: '92%',
    paddingBottom: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#999999',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#999999',
  },
});
