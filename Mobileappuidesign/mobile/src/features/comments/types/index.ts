export type CommentWithAuthor = {
  id: string;
  listingId: string;
  profileId: string;
  content: string;
  createdAt: string;
  parentCommentId: string | null;
  author: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    enterpriseName: string | null;
    enterpriseLogoUrl: string | null;
    avatarUrl: string | null;
    isVerified: boolean | null;
  };
  firstReply?: CommentWithAuthor | null;
  roleLabel?: string;
  replyingToName?: string | null;
  listingHostId?: string | null;
  listingTitle?: string | null;
  listingCoverPhotoUrl?: string | null;
  listingCity?: string | null;
  listingDistrict?: string | null;
};

export type HostCommentThread = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  listingCity: string | null;
  listingDistrict: string | null;
  listingCoverPhotoUrl: string | null;
  rootComment: CommentWithAuthor;
  replies: CommentWithAuthor[];
  replyCount: number;
  incomingReplyCount: number;
  latestReplyAt: string | null;
};
