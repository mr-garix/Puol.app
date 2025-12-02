export type HostLikeActivity = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  listingCoverPhotoUrl: string | null;
  listingCity: string | null;
  listingDistrict: string | null;
  liker: {
    id: string;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    avatarUrl: string | null;
    enterpriseName: string | null;
  };
  createdAt: string;
};

export type HostLikeSummary = {
  total: number;
  byListing: Record<string, number>;
};
