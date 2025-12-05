import { supabase } from '@/src/supabaseClient';

export type HostReviewRecord = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string | null;
  listingId: string;
  listingTitle: string | null;
  listingHostId: string | null;
  authorId: string | null;
  authorName: string | null;
};

export type UserReviewReplyRecord = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  replyContent: string | null;
  replyAt: string | null;
};

const buildAuthorName = (author: {
  first_name: string | null;
  last_name: string | null;
  username: string | null;
} | null): string | null => {
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

export const getHostReviewById = async (reviewId: string): Promise<HostReviewRecord | null> => {
  if (!reviewId) {
    return null;
  }

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
        id,
        rating,
        comment,
        created_at,
        listing_id,
        author_id,
        listing:listings!inner(
          id,
          title,
          host_id
        ),
        author:profiles!reviews_author_id_fkey(
          id,
          first_name,
          last_name,
          username
        )
      `,
    )
    .eq('id', reviewId)
    .maybeSingle();

  if (error) {
    console.error('[getHostReviewById] Supabase error', error);
    return null;
  }

  if (!data) {
    return null;
  }

  const listingRecord = Array.isArray(data.listing) ? data.listing[0] ?? null : data.listing ?? null;
  const authorRecord = Array.isArray(data.author) ? data.author[0] ?? null : data.author ?? null;

  return {
    id: data.id?.toString() ?? reviewId,
    rating: Number(data.rating ?? 0),
    comment: data.comment ?? null,
    createdAt: data.created_at ?? null,
    listingId: listingRecord?.id?.toString() ?? (data.listing_id?.toString?.() ?? ''),
    listingTitle: listingRecord?.title ?? null,
    listingHostId: listingRecord?.host_id?.toString() ?? null,
    authorId: data.author_id ?? null,
    authorName: buildAuthorName(authorRecord ?? null),
  };
};

export const getUserReviewReplyById = async (reviewId: string): Promise<UserReviewReplyRecord | null> => {
  if (!reviewId) {
    return null;
  }

  const { data, error } = await supabase
    .from('reviews')
    .select(
      `
        id,
        listing_id,
        owner_reply,
        owner_reply_at,
        listing:listings!inner(
          id,
          title
        )
      `,
    )
    .eq('id', reviewId)
    .maybeSingle();

  if (error) {
    console.error('[getUserReviewReplyById] Supabase error', error);
    return null;
  }

  if (!data) {
    return null;
  }

  const listingRecord = Array.isArray(data.listing) ? data.listing[0] ?? null : data.listing ?? null;

  return {
    id: data.id?.toString() ?? reviewId,
    listingId: listingRecord?.id?.toString() ?? (data.listing_id?.toString?.() ?? ''),
    listingTitle: listingRecord?.title ?? null,
    replyContent: data.owner_reply ?? null,
    replyAt: data.owner_reply_at ?? null,
  } satisfies UserReviewReplyRecord;
};
