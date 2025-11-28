import React, { useState } from 'react';
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
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  onLike,
  onReply,
  onDelete,
  isReply = false,
  currentUserId,
}) => {
  const [likeAnimation] = useState(new Animated.Value(1));
  const isOwnComment = currentUserId === comment.userId;

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
    <View style={[styles.container, isReply && styles.replyContainer]}>
      <Image source={{ uri: comment.userAvatar }} style={styles.avatar} />

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{comment.userName}</Text>
            {comment.userIsVerified && (
              <Image
                source={require('../../assets/icons/feed-icon-verified.png')}
                style={styles.verifiedIcon}
                resizeMode="contain"
              />
            )}
            <Text style={styles.timestamp}>{getTimeAgo(comment.timestamp)}</Text>
          </View>

          {isOwnComment && onDelete && (
            <TouchableOpacity
              onPress={() => onDelete(comment.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.deleteButton}>×</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.commentText}>{comment.text}</Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={handleLike}
            style={styles.actionButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Animated.View style={{ transform: [{ scale: likeAnimation }] }}>
              <Text style={[styles.heartIcon, comment.isLiked && styles.heartIconActive]}>
                {comment.isLiked ? '♥' : '♡'}
              </Text>
            </Animated.View>
            {comment.likes > 0 && (
              <Text
                style={[styles.actionText, comment.isLiked && styles.likedText]}
              >
                {comment.likes}
              </Text>
            )}
          </TouchableOpacity>

          {!isReply && (
            <TouchableOpacity
              onPress={() => onReply(comment.id)}
              style={styles.actionButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.actionText}>Répondre</Text>
            </TouchableOpacity>
          )}
        </View>

        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onLike={onLike}
                onReply={onReply}
                onDelete={onDelete}
                isReply
                currentUserId={currentUserId}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  replyContainer: {
    paddingLeft: 8,
    marginTop: 8,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
  },
  contentContainer: {
    flex: 1,
    marginLeft: 12,
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
  },
  userName: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  verifiedIcon: {
    width: 14,
    height: 14,
    marginLeft: 4,
  },
  timestamp: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#999999',
    marginLeft: 8,
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
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
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
  repliesContainer: {
    marginTop: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#F0F0F0',
    paddingLeft: 12,
  },
});
