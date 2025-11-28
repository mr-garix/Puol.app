// Types pour le système de commentaires PUOL

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userIsVerified: boolean;
  text: string;
  timestamp: Date;
  likes: number;
  isLiked: boolean;
  replies?: Comment[];
}

export interface CommentStats {
  totalComments: number;
  comments: Comment[];
}

export interface CommentSystemProps {
  propertyId: string;
  initialComments?: Comment[];
  onCommentAdded?: (comment: Comment) => void;
  onCommentDeleted?: (commentId: string) => void;
  onCommentLiked?: (commentId: string) => void;
}
