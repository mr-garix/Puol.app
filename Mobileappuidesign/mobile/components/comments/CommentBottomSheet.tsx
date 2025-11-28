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
} from 'react-native';
import { CommentItem } from './CommentItem';
import { CommentInput } from './CommentInput';
import { Comment } from './types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

interface CommentBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  comments: Comment[];
  onAddComment: (text: string, replyToId?: string) => void;
  onLikeComment: (commentId: string) => void;
  onDeleteComment?: (commentId: string) => void;
  currentUserId?: string;
  currentUserAvatar?: string;
  propertyTitle?: string;
}

export const CommentBottomSheet: React.FC<CommentBottomSheetProps> = ({
  visible,
  onClose,
  comments,
  onAddComment,
  onLikeComment,
  onDeleteComment,
  currentUserId,
  currentUserAvatar,
  propertyTitle = 'Commentaires',
}) => {
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    userName: string;
  } | null>(null);

  const pan = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const listRef = useRef<FlatList<Comment>>(null);

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

  const closeSheet = () => {
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
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      // Cette zone de pan sera appliquée uniquement sur le bloc handle+header,
      // donc on peut accepter le geste systématiquement ici.
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

  const handleAddComment = (text: string) => {
    onAddComment(text, replyingTo?.id);
    setReplyingTo(null);

    setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleReply = (commentId: string) => {
    const comment = findCommentById(comments, commentId);
    if (comment) {
      setReplyingTo({
        id: commentId,
        userName: comment.userName,
      });
    }
  };

  const findCommentById = (
    commentList: Comment[],
    id: string,
  ): Comment | null => {
    for (const comment of commentList) {
      if (comment.id === id) return comment;
      if (comment.replies) {
        const found = findCommentById(comment.replies, id);
        if (found) return found;
      }
    }
    return null;
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
      onRequestClose={closeSheet}
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
            onPress={closeSheet}
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
                {comments.length} {comments.length > 1 ? 'commentaires' : 'commentaire'}
              </Text>
              <TouchableOpacity
                onPress={closeSheet}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeButton}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            ref={listRef}
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CommentItem
                comment={item}
                onLike={onLikeComment}
                onReply={handleReply}
                onDelete={onDeleteComment}
                currentUserId={currentUserId}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>💬</Text>
                <Text style={styles.emptyTitle}>Aucun commentaire</Text>
                <Text style={styles.emptySubtitle}>
                  Soyez le premier à commenter
                </Text>
              </View>
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
});
