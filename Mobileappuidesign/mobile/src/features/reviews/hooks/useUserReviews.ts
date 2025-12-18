import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';

type Tables = Database['public']['Tables'];
type ReviewsRow = Tables['reviews']['Row'];
type ListingsRow = Tables['listings']['Row'];

type RawUserReviewRow = ReviewsRow & {
  listing?: ListingsRow | ListingsRow[] | null;
};

export type UserReview = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  listingLocation: string | null;
  listingCoverPhotoUrl: string | null;
  rating: number;
  comment: string | null;
  createdAt: string | null;
};

type FetchParams = {
  initial: boolean;
};

type UseUserReviewsResult = {
  reviews: UserReview[];
  averageRating: number;
  totalCount: number;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const USER_REVIEWS_SELECT = `
  id,
  listing_id,
  author_id,
  rating,
  comment,
  created_at,
  listing:listings!inner (
    id,
    title,
    city,
    district,
    cover_photo_url
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

const resolveListing = (listing: RawUserReviewRow['listing']): ListingsRow | null => {
  if (!listing) {
    return null;
  }
  if (Array.isArray(listing)) {
    return listing[0] ?? null;
  }
  return listing;
};

const buildLocationLabel = (listing: ListingsRow | null): string | null => {
  if (!listing) {
    return null;
  }
  const city = listing.city?.trim();
  const district = listing.district?.trim();
  if (city && district) {
    return `${city} · ${district}`;
  }
  return city ?? district ?? null;
};

const mapRowToUserReview = (row: RawUserReviewRow): UserReview => {
  const listingRecord = resolveListing(row.listing ?? null);
  const ratingValue = Number(row.rating ?? 0);
  const rating = Number.isFinite(ratingValue) ? Math.max(0, Math.min(5, ratingValue)) : 0;

  return {
    id: toStringId(row.id),
    listingId: toStringId(listingRecord?.id ?? row.listing_id ?? null),
    listingTitle: listingRecord?.title ?? null,
    listingLocation: buildLocationLabel(listingRecord),
    listingCoverPhotoUrl: listingRecord?.cover_photo_url ?? null,
    rating,
    comment: row.comment ?? null,
    createdAt: row.created_at ?? null,
  };
};

export const useUserReviews = (userId?: string | null): UseUserReviewsResult => {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const computeAggregates = useCallback((items: UserReview[]) => {
    const count = items.length;
    const sum = items.reduce((acc, item) => acc + item.rating, 0);
    const average = count === 0 ? 0 : Math.round((sum / count) * 10) / 10;

    setTotalCount(count);
    setAverageRating(average);
  }, []);

  const fetchReviews = useCallback(
    async ({ initial }: FetchParams) => {
      if (!userId) {
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
          .select(USER_REVIEWS_SELECT)
          .eq('author_id', userId)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        const rows = (data ?? []) as RawUserReviewRow[];
        const mapped = rows
          .map((row) => {
            try {
              return mapRowToUserReview(row);
            } catch (mappingError) {
              console.warn('[useUserReviews] Unable to map review row', mappingError, row);
              return null;
            }
          })
          .filter((value): value is UserReview => value !== null);

        setReviews(mapped);
        computeAggregates(mapped);
      } catch (err) {
        console.error('[useUserReviews] fetch error', err);
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
    [computeAggregates, userId],
  );

  useEffect(() => {
    void fetchReviews({ initial: true });
  }, [fetchReviews]);

  useEffect(() => {
    if (!userId) {
      return;
    }

    const channel = supabase
      .channel(`user-reviews:${userId}`)
      .on(
        'postgres_changes',
        { schema: 'public', table: 'reviews', event: '*', filter: `author_id=eq.${userId}` },
        () => {
          void fetchReviews({ initial: false });
        },
      )
      .subscribe();

    return () => {
      void channel.unsubscribe();
    };
  }, [fetchReviews, userId]);

  const refresh = useCallback(async () => {
    await fetchReviews({ initial: false });
  }, [fetchReviews]);

  return useMemo(
    () => ({
      reviews,
      averageRating,
      totalCount,
      isLoading,
      isRefreshing,
      error,
      refresh,
    }),
    [averageRating, error, isLoading, isRefreshing, refresh, reviews, totalCount],
  );
};
