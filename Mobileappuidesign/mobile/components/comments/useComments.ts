import { useState, useCallback } from 'react';
import { Comment } from './types';

// Hook personnalisé pour gérer la logique des commentaires
export const useComments = (initialComments: Comment[] = []) => {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);

  // Générer un ID unique
  const generateId = () => {
    return `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  // Ajouter un commentaire
  const addComment = useCallback((text: string, replyToId?: string) => {
    const newComment: Comment = {
      id: generateId(),
      userId: 'current_user_id', // TODO: à remplacer par l'ID utilisateur réel
      userName: 'Utilisateur actuel', // TODO: à remplacer par le nom réel
      userAvatar: 'https://i.pravatar.cc/150?img=1', // TODO: à remplacer par l'avatar réel
      userIsVerified: true, // TODO: à remplacer par le statut réel
      text,
      timestamp: new Date(),
      likes: 0,
      isLiked: false,
      replies: [],
    };

    setComments((prevComments) => {
      if (!replyToId) {
        // Commentaire principal
        return [...prevComments, newComment];
      } else {
        // Réponse à un commentaire
        return addReplyToComment(prevComments, replyToId, newComment);
      }
    });
  }, []);

  // Ajouter une réponse à un commentaire spécifique
  const addReplyToComment = (
    commentsList: Comment[],
    targetId: string,
    reply: Comment,
  ): Comment[] => {
    return commentsList.map((comment) => {
      if (comment.id === targetId) {
        return {
          ...comment,
          replies: [...(comment.replies || []), reply],
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: addReplyToComment(comment.replies, targetId, reply),
        };
      }
      return comment;
    });
  };

  // Liker/Unliker un commentaire
  const toggleLikeComment = useCallback((commentId: string) => {
    setComments((prevComments) => toggleLikeInComments(prevComments, commentId));
  }, []);

  const toggleLikeInComments = (
    commentsList: Comment[],
    targetId: string,
  ): Comment[] => {
    return commentsList.map((comment) => {
      if (comment.id === targetId) {
        return {
          ...comment,
          isLiked: !comment.isLiked,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: toggleLikeInComments(comment.replies, targetId),
        };
      }
      return comment;
    });
  };

  // Supprimer un commentaire
  const deleteComment = useCallback((commentId: string) => {
    setComments((prevComments) => deleteCommentFromList(prevComments, commentId));
  }, []);

  const deleteCommentFromList = (
    commentsList: Comment[],
    targetId: string,
  ): Comment[] => {
    return commentsList
      .filter((comment) => comment.id !== targetId)
      .map((comment) => {
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: deleteCommentFromList(comment.replies, targetId),
          };
        }
        return comment;
      });
  };

  // Ouvrir/Fermer le modal des commentaires
  const openComments = useCallback(() => {
    setIsCommentsVisible(true);
  }, []);

  const closeComments = useCallback(() => {
    setIsCommentsVisible(false);
  }, []);

  // Obtenir le nombre total de commentaires (incluant les réponses)
  const getTotalCommentsCount = (commentsList: Comment[]): number => {
    return commentsList.reduce((total, comment) => {
      const repliesCount = comment.replies
        ? getTotalCommentsCount(comment.replies)
        : 0;
      return total + 1 + repliesCount;
    }, 0);
  };

  return {
    comments,
    isCommentsVisible,
    totalCommentsCount: getTotalCommentsCount(comments),
    addComment,
    toggleLikeComment,
    deleteComment,
    openComments,
    closeComments,
  };
};
