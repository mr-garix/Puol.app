import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';

type Tables = Database['public']['Tables'];
type ReviewsRow = Tables['reviews']['Row'];
type ProfilesRow = Tables['profiles']['Row'];
type ListingsRow = Tables['listings']['Row'];

type RawHostReviewRow = ReviewsRow & {
  author?: ProfilesRow | ProfilesRow[] | null;
  listing?: ListingsRow | ListingsRow[] | null;
};

type OwnerReply = {
  content: string;
  createdAt: string | null;
};

export type HostReview = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  listingCity: string | null;
  listingDistrict: string | null;
  listingCoverPhotoUrl: string | null;
  authorId: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  rating: number;
  comment: string | null;
  createdAt: string | null;
  ownerReply: OwnerReply | null;
};

type FetchParams = {
  initial: boolean;
};

type SubmitReplyInput = {
  reviewId: string;
  content: string;
};

type UseHostReviewsResult = {
  reviews: HostReview[];
  averageRating: number;
  totalCount: number;
  pendingCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  submitReply: (input: SubmitReplyInput) => Promise<boolean>;
};

const HOST_REVIEWS_SELECT = `
  id,
  listing_id,
  author_id,
  rating,
  comment,
  created_at,
  owner_reply,
  owner_reply_at,
  author:profiles!reviews_author_id_fkey (
    id,
    username,
    first_name,
    last_name,
    avatar_url
  ),
  listing:listings!inner (
    id,
    title,
    city,
    district,
    cover_photo_url,
    host_id
  )
`;

const toStringId = (value: string | number | null | undefined): string => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  return '';
};

const resolveAuthor = (author: RawHostReviewRow['author']): ProfilesRow | null => {
  if (!author) {
    return null;
  }
  if (Array.isArray(author)) {
    return author[0] ?? null;
  }
  return author;
};

const resolveListing = (listing: RawHostReviewRow['listing']): ListingsRow | null => {
  if (!listing) {
    return null;
  }
  if (Array.isArray(listing)) {
    return listing[0] ?? null;
  }
  return listing;
};

const buildAuthorName = (author: ProfilesRow | null): string | null => {
  if (!author) {
    return null;
  }
  const first = author.first_name?.trim();
  const last = author.last_name?.trim();
  if (first && last) {
    return `${first} ${last}`;
  }
  const username = author.username?.trim();
  if (username) {
    return username;
  }
  return first ?? last ?? null;
};

const mapRowToHostReview = (row: RawHostReviewRow): HostReview => {
  const authorRecord = resolveAuthor(row.author ?? null);
  const listingRecord = resolveListing(row.listing ?? null);

  const ratingValue = Number(row.rating ?? 0);
  const rating = Number.isFinite(ratingValue) ? Math.max(0, Math.min(5, ratingValue)) : 0;

  return {
    id: toStringId(row.id),
    listingId: toStringId(listingRecord?.id ?? row.listing_id ?? null),
    listingTitle: listingRecord?.title ?? null,
    listingCity: listingRecord?.city ?? null,
    listingDistrict: listingRecord?.district ?? null,
    listingCoverPhotoUrl: listingRecord?.cover_photo_url ?? null,
    authorId: row.author_id ?? null,
    authorName: buildAuthorName(authorRecord),
    authorAvatarUrl: authorRecord?.avatar_url ?? null,
    rating,
    comment: row.comment ?? null,
    createdAt: row.created_at ?? null,
    ownerReply: row.owner_reply
      ? {
          content: row.owner_reply,
          createdAt: row.owner_reply_at ?? null,
        }
      : null,
  };
};

export const useHostReviews = (hostId?: string | null): UseHostReviewsResult => {
  const [reviews, setReviews] = useState<HostReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const computeAggregates = useCallback((items: HostReview[]) => {
    const count = items.length;
    const sum = items.reduce((acc, item) => acc + item.rating, 0);
    const average = count === 0 ? 0 : Math.round((sum / count) * 10) / 10;

    setTotalCount(count);
    setAverageRating(average);
  }, []);

  const fetchReviews = useCallback(
    async ({ initial }: FetchParams) => {
      if (!hostId) {
        setReviews([]);
        setAverageRating(0);
        setTotalCount(0);
        setError(null);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (initial) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('reviews')
          .select(HOST_REVIEWS_SELECT)
          .eq('listing.host_id', hostId)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        const rows = (data ?? []) as RawHostReviewRow[];
        const mapped = rows
          .map((row) => {
            try {
              return mapRowToHostReview(row);
            } catch (mappingError) {
              console.warn('[useHostReviews] Unable to map review row', mappingError, row);
              return null;
            }
          })
          .filter((value): value is HostReview => value !== null);

        setReviews(mapped);
        computeAggregates(mapped);
      } catch (err) {
        console.error('[useHostReviews] fetch error', err);
        setError("Impossible de récupérer vos avis pour le moment.");
        setReviews([]);
        setAverageRating(0);
        setTotalCount(0);
      } finally {
        if (initial) {
          setIsLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    [computeAggregates, hostId],
  );

  useEffect(() => {
    void fetchReviews({ initial: true });
  }, [fetchReviews]);

  const refresh = useCallback(async () => {
    await fetchReviews({ initial: false });
  }, [fetchReviews]);

  const submitReply = useCallback(
    async ({ reviewId, content }: SubmitReplyInput) => {
      const trimmed = content.trim();
      if (!reviewId || !trimmed.length) {
        return false;
      }
      try {
        const { error: updateError } = await supabase
          .from('reviews')
          .update({ owner_reply: trimmed, owner_reply_at: new Date().toISOString() })
          .eq('id', reviewId);

        if (updateError) {
          throw updateError;
        }

        await fetchReviews({ initial: false });
        return true;
      } catch (err) {
        console.error('[useHostReviews] submit reply error', err);
        setError('Impossible d\'enregistrer votre réponse.');
        return false;
      }
    },
    [fetchReviews],
  );

  const pendingCount = useMemo(() => reviews.filter((review) => !review.ownerReply).length, [reviews]);

  return {
    reviews,
    averageRating,
    totalCount,
    pendingCount,
    isLoading,
    isRefreshing,
    error,
    refresh,
    submitReply,
  };
};
