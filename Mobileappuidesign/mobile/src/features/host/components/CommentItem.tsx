import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Comment } from './types';

interface CommentItemProps {
  comment: Comment;
  onLike: (commentId: string) => void;
  onReply: (commentId: string) => void;
  onDelete?: (commentId: string) => void;
  isReply?: boolean;
  currentUserId?: string;
  variant?: 'default' | 'preview';
  isHighlighted?: boolean;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onLike,
  onReply,
  onDelete,
  isReply = false,
  currentUserId,
  variant = 'default',
  isHighlighted = false,
}) => {
  const [likeAnimation] = useState(new Animated.Value(1));
  const [highlightAnimation] = useState(() => new Animated.Value(0));
  const isOwnComment = currentUserId === comment.userId;
  const isPreview = variant === 'preview';
  const displayRoleLabel = useMemo(() => {
    const label = comment.roleLabel?.trim();
    if (!label) return undefined;
    return label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
  }, [comment.roleLabel]);

  const avatarSource = useMemo(() => {
    const uri = comment.userAvatar?.trim();
    if (uri) {
      return { uri };
    }
    return {
      uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&q=80&auto=format',
    };
  }, [comment.userAvatar]);

  const handleLike = () => {
    Animated.sequence([
      Animated.timing(likeAnimation, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(likeAnimation, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    onLike(comment.id);
  };

  useEffect(() => {
    if (isHighlighted) {
      highlightAnimation.stopAnimation(() => {
        highlightAnimation.setValue(1);
        Animated.timing(highlightAnimation, {
          toValue: 0,
          duration: 1400,
          useNativeDriver: false,
        }).start();
      });
    } else {
      highlightAnimation.stopAnimation(() => {
        highlightAnimation.setValue(0);
      });
    }
  }, [isHighlighted, highlightAnimation]);

  const highlightStyles = {
    backgroundColor: highlightAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: ['transparent', 'rgba(46,204,113,0.16)'],
    }),
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "À l'instant";
    if (diffInMinutes < 60) return `${diffInMinutes}min`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        isReply && styles.replyContainer,
        isPreview && styles.previewContainer,
        styles.highlightWrapper,
        highlightStyles,
      ]}
    >
      <Image
        source={avatarSource}
        style={[styles.avatar, (isPreview || isReply) && styles.replyAvatar]}
      />

      <View
        style={[
          styles.contentContainer,
          (isPreview || isReply) && styles.replyContentContainer,
        ]}
      >
        <View style={styles.headerRow}>
          <View style={styles.userInfo}>
            <View style={styles.userMetaRow}>
              <Text
                style={[styles.userName, (isPreview || isReply) && styles.replyUserName]}
              >
                {comment.userName}
              </Text>
              {comment.userIsVerified && (
                <Image
                  source={require('@/assets/icons/feed-icon-verified.png')}
                  style={[styles.verifiedIcon, (isPreview || isReply) && styles.replyVerifiedIcon]}
                  resizeMode="contain"
                />
              )}
              {!!displayRoleLabel && (
                <Text style={[styles.rolePill, (isPreview || isReply) && styles.replyRolePill]}>{displayRoleLabel}</Text>
              )}
            </View>
            <Text
              style={[styles.timestamp, (isPreview || isReply) && styles.replyTimestamp]}
            >
              {getTimeAgo(comment.timestamp)}
            </Text>
          </View>

          {isOwnComment && onDelete && !isPreview && (
            <TouchableOpacity
              onPress={() => onDelete(comment.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteButton}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text
          style={[
            styles.commentText,
            (isPreview || isReply) && styles.replyCommentText,
            isReply && styles.replyCommentSpacing,
          ]}
          numberOfLines={isPreview ? 2 : undefined}
        >
          {comment.replyingToName ? (
            <Text style={styles.replyingMention}>@{comment.replyingToName} </Text>
          ) : null}
          {comment.text}
        </Text>

        {!isPreview && (
          <View style={[styles.actionsRow, isReply && styles.replyActionsRow]}>
            <TouchableOpacity
              onPress={handleLike}
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
                <Text
                  style={[
                    styles.heartIcon,
                    comment.isLiked && styles.heartIconActive,
                    isReply && styles.replyHeartIcon,
                  ]}
                >
                  {comment.isLiked ? '♥' : '♡'}
                </Text>
              </Animated.View>
              {comment.likes > 0 && (
                <Text
                  style={[
                    styles.actionText,
                    comment.isLiked && styles.likedText,
                  ]}
                >
                  {comment.likes}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onReply(comment.id)}
              style={[styles.actionButton, isReply && styles.replyActionButton]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.actionText, isReply && styles.replyActionText]}>Répondre</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  highlightWrapper: {
    borderRadius: 18,
  },
  previewContainer: {
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  replyContainer: {
    marginTop: 2,
    alignSelf: 'center',
    width: '88%',
    paddingHorizontal: 2,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
  },
  replyAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
  },
  replyContentContainer: {
    marginLeft: 6,
    paddingRight: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
    columnGap: 6,
  },
  userMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 6,
  },
  userName: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  previewUserName: {
    fontSize: 12,
  },
  replyUserName: {
    fontSize: 12.2,
    fontWeight: '600',
  },
  verifiedIcon: {
    width: 14,
    height: 14,
    marginLeft: 4,
  },
  replyVerifiedIcon: {
    width: 12,
    height: 12,
  },
  rolePill: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '700',
    color: '#1F8A5B',
    backgroundColor: '#E7F5ED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    textAlign: 'center',
    minWidth: 64,
  },
  replyRolePill: {
    fontSize: 10,
    paddingHorizontal: 5,
    minWidth: 56,
  },
  timestamp: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#999999',
    marginLeft: 8,
  },
  replyTimestamp: {
    fontSize: 11,
  },
  deleteButton: {
    fontSize: 24,
    color: '#999999',
    fontWeight: '300',
    paddingHorizontal: 4,
  },
  commentText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
    marginBottom: 8,
  },
  replyCommentText: {
    fontSize: 13.5,
    color: '#1F1F1F',
    lineHeight: 20,
  },
  replyCommentSpacing: {
    marginBottom: 2,
  },
  replyingMention: {
    color: '#2ECC71',
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  replyActionsRow: {
    marginTop: -3,
  },
  replyActionButton: {
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  replyActionText: {
    fontSize: 12,
    color: '#6D6D6D',
    fontWeight: '500',
  },
  likedText: {
    color: '#2ECC71',
    fontWeight: '600',
  },
  heartIcon: {
    fontSize: 20,
    color: '#9AA2AD',
    marginRight: 8,
    fontWeight: '400',
  },
  heartIconActive: {
    color: '#2ECC71',
  },
  replyHeartIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  repliesContainer: {
    marginTop: 0,
  },
  previewRepliesContainer: {
    marginTop: 0,
  },
});
