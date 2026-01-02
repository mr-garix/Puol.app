import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';
import { sendHeartbeat } from '@/src/utils/heartbeat';

type Tables = Database['public']['Tables'];
type ProfilesRow = Tables['profiles']['Row'];
type ReviewsRow = Tables['reviews']['Row'];
type BookingsRow = Tables['bookings']['Row'];

const REVIEWS_SELECT = `
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
    avatar_url,
    created_at
  )
`;

const VALIDATED_BOOKING_STATUSES = ['confirmed', 'completed'] as const;
const POSITIVE_PAYMENT_STATUSES = ['paid', 'completed', 'succeeded'] as const;

const normalizeStatus = (value?: string | null) => (value ?? '').toLowerCase();

const isValidatedBooking = (booking: Partial<BookingsRow>) => {
  const normalizedStatus = normalizeStatus(booking.status);
  if (normalizedStatus === 'cancelled') {
    return false;
  }

  if (VALIDATED_BOOKING_STATUSES.includes(normalizedStatus as (typeof VALIDATED_BOOKING_STATUSES)[number])) {
    return true;
  }

  const normalizedPayment = normalizeStatus((booking as { payment_status?: string | null }).payment_status);
  if (POSITIVE_PAYMENT_STATUSES.includes(normalizedPayment as (typeof POSITIVE_PAYMENT_STATUSES)[number])) {
    return true;
  }

  return false;
};

const buildAuthorName = (profile: ProfilesRow | null | undefined) => {
  if (!profile) {
    return null;
  }

  const first = profile.first_name?.trim();
  const last = profile.last_name?.trim();
  if (first && last) {
    return `${first} ${last}`;
  }

  const username = profile.username?.trim();
  if (username) {
    return username;
  }

  return first ?? last ?? null;
};

type ReviewSelectRecord = ReviewsRow & {
  author?: ProfilesRow | ProfilesRow[] | null;
};

type OwnerReply = {
  content: string;
  createdAt: string | null;
};

export type ListingReview = {
  id: string;
  listingId: string;
  authorId: string | null;
  rating: number;
  createdAt: string | null;
  comment: string | null;
  authorName: string | null;
  authorAvatarUrl: string | null;
  authorJoinedAt: string | null;
  ownerReply: OwnerReply | null;
  isMine: boolean;
};

type EligibilityStatus = 'unknown' | 'not_authenticated' | 'eligible' | 'no_booking';

type EligibilityState = {
  status: EligibilityStatus;
  canReview: boolean;
};

type HookState = {
  reviews: ListingReview[];
  averageRating: number;
  totalCount: number;
  userReview: ListingReview | null;
  eligibility: EligibilityState;
  isLoading: boolean;
  isRefreshing: boolean;
  isSubmitting: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  submitReview: (input: { rating: number; comment: string | null }) => Promise<boolean>;
};

const mapReviewRecord = (
  record: ReviewSelectRecord,
  listingId: string,
  currentUserId: string | null,
): ListingReview => {
  const ratingValue = Number(record.rating ?? 0);
  const safeRating = Number.isFinite(ratingValue) ? Math.max(0, Math.min(5, ratingValue)) : 0;

  const authorRecord = Array.isArray(record.author) ? record.author[0] : record.author;

  const recordId = (() => {
    if (typeof record.id === 'string') {
      return record.id;
    }
    if (record.id != null) {
      return String(record.id);
    }
    const suffix = record.author_id ?? Math.random().toString(36).slice(2);
    return `${listingId}-review-${suffix}`;
  })();

  return {
    id: recordId,
    listingId,
    authorId: record.author_id ?? null,
    rating: safeRating,
    createdAt: record.created_at ?? null,
    comment: record.comment ?? null,
    authorName: buildAuthorName(authorRecord ?? null),
    authorAvatarUrl: authorRecord?.avatar_url ?? null,
    authorJoinedAt: authorRecord?.created_at ?? null,
    ownerReply: record.owner_reply
      ? {
          content: record.owner_reply,
          createdAt: record.owner_reply_at ?? null,
        }
      : null,
    isMine: currentUserId != null && record.author_id === currentUserId,
  } satisfies ListingReview;
};

const defaultEligibilityForUser = (currentUserId: string | null): EligibilityState =>
  currentUserId
    ? { status: 'unknown', canReview: false }
    : { status: 'not_authenticated', canReview: false };

const parseDate = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const isCompletedOrPastStay = (row: Partial<BookingsRow>) => {
  const status = (row.status ?? '').toLowerCase();
  const checkout =
    parseDate((row as any).checkout_date) ??
    parseDate((row as any).check_out) ??
    parseDate((row as any).checkout);

  // Vérifier si le statut indique un séjour complété
  const isCompletedStatus = status === 'completed' || status === 'finished' || status === 'checked_out';
  
  // Vérifier si la date de checkout est passée (le séjour est terminé)
  // Important : on accepte aussi les séjours "confirmed" si la date de checkout est passée
  const isPastCheckout = checkout ? checkout.getTime() <= Date.now() : false;

  // L'utilisateur peut laisser un avis si :
  // 1. Le statut est 'completed/finished/checked_out' OU
  // 2. La date de checkout est passée (peu importe le statut, tant qu'il n'est pas 'cancelled')
  const isNotCancelled = status !== 'cancelled' && status !== 'rejected';
  
  return isCompletedStatus || (isPastCheckout && isNotCancelled);
};

const checkUserEligibility = async (listingId: string, currentUserId: string): Promise<EligibilityState> => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id,status,payment_status,checkout_date')
      .eq('listing_id', listingId)
      .eq('guest_profile_id', currentUserId)
      .limit(25);

    if (error) {
      console.error('[useListingReviews] eligibility query error', error);
      throw error;
    }

    const rows = (data ?? []) as Partial<BookingsRow>[];
    console.log('[useListingReviews] Checking eligibility for reviews:', {
      listingId,
      currentUserId,
      bookingsFound: rows.length,
      bookings: rows.map(row => ({
        id: row.id,
        status: row.status,
        checkout_date: (row as any).checkout_date,
        isEligible: isCompletedOrPastStay(row),
      })),
    });

    const hasEligibleBooking = rows.some(isCompletedOrPastStay);

    return hasEligibleBooking
      ? { status: 'eligible', canReview: true }
      : { status: 'no_booking', canReview: false };
  } catch (err) {
    console.error('[useListingReviews] eligibility error', err);
    return { status: 'unknown', canReview: false };
  }
};

export const useListingReviews = (listingId?: string | null, currentUserId?: string | null): HookState => {
  const [reviews, setReviews] = useState<ListingReview[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [userReview, setUserReview] = useState<ListingReview | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityState>(defaultEligibilityForUser(currentUserId ?? null));
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveListingId = listingId ?? null;
  const effectiveUserId = currentUserId ?? null;

  const computeAggregates = useCallback((items: ListingReview[]) => {
    const count = items.length;
    const sum = items.reduce((acc, review) => acc + review.rating, 0);
    const average = count === 0 ? 0 : Math.round((sum / count) * 10) / 10;

    setTotalCount(count);
    setAverageRating(average);
  }, []);

  const fetchReviews = useCallback(
    async ({ initial }: { initial: boolean }) => {
      if (!effectiveListingId) {
        setReviews([]);
        setAverageRating(0);
        setTotalCount(0);
        setUserReview(null);
        setEligibility(defaultEligibilityForUser(effectiveUserId));
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

      const eligibilityPromise = effectiveUserId
        ? checkUserEligibility(effectiveListingId, effectiveUserId)
        : Promise.resolve(defaultEligibilityForUser(null));

      try {
        const { data, error: fetchError } = await supabase
          .from('reviews')
          .select(REVIEWS_SELECT)
          .eq('listing_id', effectiveListingId)
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw fetchError;
        }

        const rawRecords = (data ?? []) as ReviewSelectRecord[];
        const mapped = rawRecords.map((record) =>
          mapReviewRecord(record, effectiveListingId, effectiveUserId),
        );

        setReviews(mapped);
        setUserReview(mapped.find((review) => review.isMine) ?? null);
        computeAggregates(mapped);
      } catch (err) {
        console.error('[useListingReviews] fetch error', err);
        setError("Impossible de récupérer les avis pour cette annonce.");
        setReviews([]);
        setUserReview(null);
        setAverageRating(0);
        setTotalCount(0);
      } finally {
        eligibilityPromise
          .then((result) => setEligibility(result))
          .catch((eligibilityError) => {
            console.error('[useListingReviews] eligibility promise error', eligibilityError);
            setEligibility({ status: 'unknown', canReview: false });
          })
          .finally(() => {
            if (initial) {
              setIsLoading(false);
            } else {
              setIsRefreshing(false);
            }
          });
      }
    },
    [computeAggregates, effectiveListingId, effectiveUserId],
  );

  useEffect(() => {
    setEligibility(defaultEligibilityForUser(effectiveUserId));
  }, [effectiveUserId]);

  useEffect(() => {
    fetchReviews({ initial: true }).catch((err) => {
      console.error('[useListingReviews] unexpected error', err);
    });
  }, [fetchReviews]);

  const refresh = useCallback(async () => {
    await fetchReviews({ initial: false });
  }, [fetchReviews]);

  const submitReview = useCallback(
    async ({ rating, comment }: { rating: number; comment: string | null }) => {
      if (!effectiveListingId || !effectiveUserId) {
        setError('Vous devez être connecté pour laisser un avis.');
        return false;
      }

      const safeRating = Math.max(1, Math.min(5, Math.round(rating)));
      const trimmedComment = comment?.trim() || null;

      setIsSubmitting(true);
      setError(null);

      try {
        if (userReview) {
          const { error: updateError } = await supabase
            .from('reviews')
            .update({ rating: safeRating, comment: trimmedComment })
            .eq('id', userReview.id)
            .eq('author_id', effectiveUserId);

          if (updateError) {
            throw updateError;
          }
        } else {
          const { data: insertedData, error: insertError } = await supabase
            .from('reviews')
            .insert({
              listing_id: effectiveListingId,
              author_id: effectiveUserId,
              rating: safeRating,
              comment: trimmedComment,
            })
            .select('id, listing_id, author_id, rating, comment, created_at');

          if (insertError) {
            throw insertError;
          }

          // 🔔 Envoyer une notification au HOST quand un nouvel avis est créé
          if (insertedData && insertedData.length > 0) {
            try {
              const review = insertedData[0];
              // Récupérer les informations du listing pour obtenir le host_id
              const { data: listingData, error: listingError } = await supabase
                .from('listings')
                .select('id, title, host_id')
                .eq('id', effectiveListingId)
                .single();

              if (!listingError && listingData && listingData.host_id) {
                const channelName = `review-notifications-${listingData.host_id}`;
                const preview = trimmedComment && trimmedComment.length > 80 
                  ? `${trimmedComment.slice(0, 77)}...` 
                  : trimmedComment || `Note: ${safeRating}/5`;

                console.log('[useListingReviews] Broadcasting review notification to host:', {
                  hostId: listingData.host_id,
                  channelName,
                  reviewId: review.id,
                });

                await supabase.channel(channelName).send({
                  type: 'broadcast',
                  event: 'new_review',
                  payload: {
                    reviewId: review.id,
                    listingId: effectiveListingId,
                    listingTitle: listingData.title,
                    authorId: effectiveUserId,
                    rating: safeRating,
                    content: preview,
                    hostProfileId: listingData.host_id,
                    createdAt: new Date().toISOString(),
                  }
                }).catch((err) => {
                  console.error('[useListingReviews] Error broadcasting review notification:', err);
                });
              }
            } catch (notificationError) {
              console.error('[useListingReviews] Error sending review notification:', notificationError);
              // Ne pas échouer la création d'avis si la notification échoue
            }
          }
        }

        await fetchReviews({ initial: false });
        // Envoyer le heartbeat (user connecté ou visiteur anonyme)
        if (effectiveUserId) {
          await sendHeartbeat(effectiveUserId);
        }
        return true;
      } catch (err) {
        console.error('[useListingReviews] submit error', err);
        setError('Impossible d’enregistrer votre avis pour le moment.');
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [effectiveListingId, effectiveUserId, fetchReviews, userReview],
  );

  return useMemo(
    () => ({
      reviews,
      averageRating,
      totalCount,
      userReview,
      eligibility,
      isLoading,
      isRefreshing,
      isSubmitting,
      error,
      refresh,
      submitReview,
    }),
    [
      averageRating,
      eligibility,
      error,
      isLoading,
      isRefreshing,
      isSubmitting,
      refresh,
      reviews,
      submitReview,
      totalCount,
      userReview,
    ],
  );
};
