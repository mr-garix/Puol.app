import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';
import type { CommentWithAuthor, HostCommentThread } from '../types';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

const extractMentionFromContent = (rawContent: string | null | undefined) => {
  const fallbackContent = typeof rawContent === 'string' ? rawContent : '';
  const mentionRegex = /^@\[(.+?)]\s*(.*)$/s;
  const match = mentionRegex.exec(fallbackContent.trimStart());

  if (!match) {
    return {
      content: fallbackContent,
      mentionName: null,
    };
  }

  const [, rawName, rest] = match;
  return {
    content: rest.trimStart(),
    mentionName: rawName.trim() || null,
  };
};

type CommentThreadOptions = {
  rentalKind?: string | null;
};

const fetchCommentThreads = async (
  hostId: string,
  options?: CommentThreadOptions,
): Promise<HostCommentThread[]> => {
  if (!hostId) {
    return [];
  }

  const rentalKindFilter = options?.rentalKind ?? null;
  const normalizedHostId = hostId.toString();

  let query = supabase
    .from('listing_comments')
    .select(`
      id,
      listing_id,
      profile_id,
      content,
      created_at,
      parent_comment_id,
      author:profiles!inner(
        id,
        username,
        first_name,
        last_name,
        enterprise_name,
        enterprise_logo_url,
        avatar_url,
        is_certified
      ),
      listing:listings(
        id,
        title,
        cover_photo_url,
        city,
        district,
        host_id
      )
    `)
    .is('parent_comment_id', null)
    .eq('listing.host_id', hostId)
    .neq('profile_id', hostId)
    .order('created_at', { ascending: false });

  if (rentalKindFilter) {
    query = query.eq('listing.rental_kind', rentalKindFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching host comment threads (roots):', error);
    throw error;
  }

  const rows = (data ?? []) as Array<
    {
      id: number | string;
      listing_id: string | number | null;
      profile_id: string;
      content: string;
      created_at: string;
      parent_comment_id: null;
      author: any;
      listing:
        | {
            id: string | number;
            title: string | null;
            cover_photo_url: string | null;
            city: string | null;
            district: string | null;
            host_id: string | null;
          }
        | Array<{
            id: string | number;
            title: string | null;
            cover_photo_url: string | null;
            city: string | null;
            district: string | null;
            host_id: string | null;
          }>
        | null;
    }
  >;

  if (!rows.length) {
    return [];
  }

  const parentIds = rows
    .map((row) => Number(row.id))
    .filter((value): value is number => Number.isFinite(value));

  let repliesByParent: Record<string, CommentWithAuthor[]> = {};

  if (parentIds.length) {
    const { data: repliesData, error: repliesError } = await supabase
      .from('listing_comments')
      .select(`
        id,
        listing_id,
        profile_id,
        content,
        created_at,
        parent_comment_id,
        author:profiles!inner(
          id,
          username,
          first_name,
          last_name,
          enterprise_name,
          enterprise_logo_url,
          avatar_url,
          is_certified
        )
      `)
      .in('parent_comment_id', parentIds)
      .order('created_at', { ascending: true });

    if (repliesError) {
      console.error('Error fetching replies for host comment threads:', repliesError);
      throw repliesError;
    }

    const replyRows = (repliesData ?? []) as Array<
      {
        id: number | string;
        listing_id: string | number | null;
        profile_id: string;
        content: string;
        created_at: string;
        parent_comment_id: number | string | null;
        author: any;
      }
    >;

    repliesByParent = replyRows.reduce<Record<string, CommentWithAuthor[]>>((acc, reply) => {
      const parentKey = reply.parent_comment_id != null ? reply.parent_comment_id.toString() : null;
      if (!parentKey) {
        return acc;
      }
      const authorRecord = Array.isArray(reply.author) ? reply.author[0] : reply.author;
      const mappedReply = mapCommentRowToCommentWithAuthor({ ...reply, author: authorRecord ?? {} });
      acc[parentKey] = acc[parentKey] ?? [];
      acc[parentKey].push(mappedReply);
      return acc;
    }, {});
  }

  const threads: HostCommentThread[] = rows
    .map((row) => {
      const authorRecord = Array.isArray(row.author) ? row.author[0] : row.author;
      const rootComment = mapCommentRowToCommentWithAuthor({ ...row, author: authorRecord ?? {} });
      const listing = Array.isArray(row.listing) ? row.listing[0] : row.listing;
      const listingId = listing?.id ?? row.listing_id ?? '';
      const replies = repliesByParent[row.id.toString()] ?? [];
      const incomingReplies = replies.filter((reply) => reply.author.id !== hostId);
      const latestReplyAt = replies.length
        ? replies[replies.length - 1].createdAt
        : rootComment.createdAt;

      return {
        id: row.id.toString(),
        listingId: listingId.toString(),
        listingTitle: listing?.title ?? null,
        listingCity: listing?.city ?? null,
        listingDistrict: listing?.district ?? null,
        listingCoverPhotoUrl: listing?.cover_photo_url ?? null,
        rootComment,
        replies,
        replyCount: replies.length,
        incomingReplyCount: incomingReplies.length,
        latestReplyAt,
      } satisfies HostCommentThread;
    })
    .filter((thread) => {
      const ownerId = thread.rootComment.listingHostId ?? null;
      if (!ownerId) {
        return false;
      }
      return ownerId === normalizedHostId;
    });

  return threads.sort((a, b) => {
    const aTime = new Date(a.latestReplyAt ?? a.rootComment.createdAt).getTime();
    const bTime = new Date(b.latestReplyAt ?? b.rootComment.createdAt).getTime();
    return bTime - aTime;
  });
};

export const getHostCommentThreads = async (hostId: string): Promise<HostCommentThread[]> =>
  fetchCommentThreads(hostId);

export const getLandlordCommentThreads = async (landlordId: string): Promise<HostCommentThread[]> =>
  fetchCommentThreads(landlordId, { rentalKind: 'long_term' });
const mapCommentRowToCommentWithAuthor = (comment: any): CommentWithAuthor => {
  const { content, mentionName } = extractMentionFromContent(comment.content);

  const listingRecord = Array.isArray(comment.listing) ? comment.listing[0] : comment.listing;
  const rawListingId = listingRecord?.id ?? comment.listing_id;
  const listingId = rawListingId != null ? rawListingId.toString() : '';
  const listingHostId = listingRecord?.host_id ?? comment.listing_host_id ?? null;

  return {
    id: comment.id.toString(),
    listingId,
    profileId: comment.profile_id,
    content,
    createdAt: comment.created_at,
    parentCommentId: comment.parent_comment_id != null ? comment.parent_comment_id.toString() : null,
    author: {
      id: comment.author.id,
      username: comment.author.username,
      firstName: comment.author.first_name,
      lastName: comment.author.last_name,
      enterpriseName: comment.author.enterprise_name,
      enterpriseLogoUrl: comment.author.enterprise_logo_url,
      avatarUrl: comment.author.avatar_url ?? null,
      isVerified: comment.author.is_certified ?? null,
    },
    replyingToName:
      mentionName ??
      (comment.replying_to_comment
        ? buildDisplayName(comment.replying_to_comment.author)
        : null),
    listingHostId: listingHostId != null ? listingHostId.toString() : null,
    listingTitle:
      listingRecord?.title ?? comment.listing_title ?? null,
    listingCoverPhotoUrl:
      listingRecord?.cover_photo_url ?? comment.listing_cover_photo_url ?? null,
    listingCity:
      listingRecord?.city ?? comment.listing_city ?? null,
    listingDistrict:
      listingRecord?.district ?? comment.listing_district ?? null,
  };
};

export type CommentConversation = {
  id: string;
  listingId: string;
  listingTitle: string | null;
  listingCity: string | null;
  listingDistrict: string | null;
  listingCoverPhotoUrl: string | null;
  listingHostId: string | null;
  content: string;
  createdAt: string;
  replyCount: number;
  latestReplyAt: string | null;
  firstReply?: CommentWithAuthor | null;
  latestReply?: CommentWithAuthor | null;
  recentReplies?: CommentWithAuthor[];
};

const buildDisplayName = (author: any): string | null => {
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
  const enterprise = author.enterprise_name?.trim();
  if (enterprise) {
    return enterprise;
  }
  return null;
};

export const getListingComments = async (listingId: string): Promise<CommentWithAuthor[]> => {
  const { data, error } = await supabase
    .from('listing_comments')
    .select(`
      id,
      listing_id,
      profile_id,
      content,
      created_at,
      parent_comment_id,
      author:profiles!inner(
        id,
        username,
        first_name,
        last_name,
        enterprise_name,
        enterprise_logo_url,
        avatar_url,
        is_certified
      )
    `)
    .eq('listing_id', listingId)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  if (error) {
    console.error('Error fetching listing comments:', error);
    throw error;
  }

  return data.map(mapCommentRowToCommentWithAuthor);
};

export const getListingCommentCounts = async (listingIds: string[]): Promise<Record<string, number>> => {
  if (!listingIds.length) {
    return {};
  }

  const { data, error } = await supabase
    .from('listing_comments')
    .select('listing_id')
    .in('listing_id', listingIds);

  if (error) {
    console.error('Error fetching listing comment counts:', error);
    throw error;
  }

  const rows = (data ?? []) as Tables<'listing_comments'>[];

  return rows.reduce<Record<string, number>>((acc, row) => {
    const listingId = row.listing_id;
    if (!listingId) {
      return acc;
    }
    acc[listingId] = (acc[listingId] ?? 0) + 1;
    return acc;
  }, {});
};

export const getCommentReplyCounts = async (listingId: string): Promise<Record<string, number>> => {
  if (!listingId) {
    return {};
  }

  const { data, error } = await supabase
    .from('listing_comments')
    .select('parent_comment_id')
    .eq('listing_id', listingId)
    .not('parent_comment_id', 'is', null);

  if (error) {
    console.error('Error fetching comment reply counts:', error);
    throw error;
  }

  const rows = (data ?? []) as Tables<'listing_comments'>[];

  return rows.reduce<Record<string, number>>((acc, row) => {
    const parentId = row.parent_comment_id;
    if (!parentId) {
      return acc;
    }
    const key = parentId.toString();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
};

export const getReplyCountForComment = async (commentId: string): Promise<number> => {
  const numericId = Number(commentId);
  if (!Number.isFinite(numericId)) {
    return 0;
  }

  const { count, error } = await supabase
    .from('listing_comments')
    .select('id', { count: 'exact', head: true })
    .eq('parent_comment_id', numericId);

  if (error) {
    console.error('Error fetching reply count for comment:', error);
    throw error;
  }

  return count ?? 0;
};

export const getFirstRepliesForComments = async (
  commentIds: string[],
): Promise<Record<string, CommentWithAuthor>> => {
  if (!commentIds.length) {
    return {};
  }

  const numericIds = commentIds
    .map((id) => Number(id))
    .filter((value) => Number.isFinite(value)) as number[];

  if (!numericIds.length) {
    return {};
  }

  const { data, error } = await supabase
    .from('listing_comments')
    .select(`
      id,
      listing_id,
      profile_id,
      content,
      created_at,
      parent_comment_id,
      author:profiles!inner(
        id,
        username,
        first_name,
        last_name,
        enterprise_name,
        enterprise_logo_url,
        avatar_url,
        is_certified
      )
    `)
    .in('parent_comment_id', numericIds)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching first replies for comments:', error);
    throw error;
  }

  const rows = (data ?? []) as Tables<'listing_comments'>[];
  const result: Record<string, CommentWithAuthor> = {};

  rows.forEach((row: any) => {
    const parentKey = row.parent_comment_id?.toString();
    if (!parentKey || result[parentKey]) {
      return;
    }

    result[parentKey] = mapCommentRowToCommentWithAuthor(row);
  });

  return result;
};

export const getCommentReplies = async (parentCommentId: string): Promise<CommentWithAuthor[]> => {
  const { data, error } = await supabase
    .from('listing_comments')
    .select(`
      id,
      listing_id,
      profile_id,
      content,
      created_at,
      parent_comment_id,
      author:profiles!inner(
        id,
        username,
        first_name,
        last_name,
        enterprise_name,
        enterprise_logo_url,
        avatar_url,
        is_certified
      )
    `)
    .eq('parent_comment_id', parseInt(parentCommentId))
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching comment replies:', error);
    throw error;
  }

  return data.map(mapCommentRowToCommentWithAuthor);
};

export const createListingComment = async (
  listingId: string,
  content: string,
  profileId: string,
  parentCommentId?: string | null,
): Promise<CommentWithAuthor> => {
  if (!profileId) {
    throw new Error('auth_profile_missing');
  }

  const commentData: Database['public']['Tables']['listing_comments']['Insert'] = {
    listing_id: listingId,
    profile_id: profileId,
    content: content.trim(),
    parent_comment_id: parentCommentId ? parseInt(parentCommentId) : null,
  };

  const { data, error } = await supabase
    .from('listing_comments')
    .insert(commentData)
    .select(`
      id,
      listing_id,
      profile_id,
      content,
      created_at,
      parent_comment_id,
      author:profiles!inner(
        id,
        username,
        first_name,
        last_name,
        enterprise_name,
        enterprise_logo_url,
        avatar_url,
        is_certified
      )
    `)
    .single();

  if (error) {
    console.error('Error creating comment:', error);
    throw error;
  }

  const authorRecord = Array.isArray(data.author) ? data.author[0] : data.author;

  return mapCommentRowToCommentWithAuthor({
    ...data,
    author: authorRecord ?? {},
  });
};

export const getCommentById = async (commentId: string): Promise<CommentWithAuthor | null> => {
  const numericId = Number(commentId);
  if (!Number.isFinite(numericId)) {
    return null;
  }

  const { data, error } = await supabase
    .from('listing_comments')
    .select(`
      id,
      listing_id,
      profile_id,
      content,
      created_at,
      parent_comment_id,
      author:profiles!inner(
        id,
        username,
        first_name,
        last_name,
        enterprise_name,
        enterprise_logo_url,
        avatar_url,
        is_certified
      ),
      listing:listings(
        id,
        host_id
      )
    `)
    .eq('id', numericId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching comment by id:', error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapCommentRowToCommentWithAuthor(data);
};

export const getUserCommentConversations = async (profileId: string): Promise<CommentConversation[]> => {
  if (!profileId) {
    return [];
  }

  const { data, error } = await supabase
    .from('listing_comments')
    .select(
      `
        id,
        listing_id,
        profile_id,
        content,
        created_at
      `,
    )
    .eq('profile_id', profileId)
    .is('parent_comment_id', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching user comment conversations:', error);
    throw error;
  }

  const rows = (data ?? []) as Array<{
    id: number | string;
    listing_id: string | null;
    content: string;
    created_at: string;
  }>;

  if (!rows.length) {
    return [];
  }

  const parentIds = rows
    .map((row) => Number(row.id))
    .filter((value): value is number => Number.isFinite(value));

  if (!parentIds.length) {
    return [];
  }

  const listingIds = Array.from(
    new Set(rows.map((row) => row.listing_id).filter((value): value is string => Boolean(value))),
  );

  const listingsById: Record<
    string,
    {
      id: string;
      title: string | null;
      cover_photo_url: string | null;
      city: string | null;
      district: string | null;
      host_id: string | null;
    }
  > = {};

  if (listingIds.length) {
    const { data: listingData, error: listingError } = await supabase
      .from('listings')
      .select('id, title, cover_photo_url, city, district, host_id')
      .in('id', listingIds);

    if (listingError) {
      console.error('Error fetching listings for comment conversations:', listingError);
      throw listingError;
    }

    for (const listing of listingData ?? []) {
      listingsById[listing.id] = listing;
    }
  }

  const { data: repliesData, error: repliesError } = await supabase
    .from('listing_comments')
    .select(
      `
        id,
        listing_id,
        profile_id,
        content,
        created_at,
        parent_comment_id,
        author:profiles!inner(
          id,
          username,
          first_name,
          last_name,
          enterprise_name,
          enterprise_logo_url,
          avatar_url,
          is_certified
        )
      `,
    )
    .in('parent_comment_id', parentIds)
    .neq('profile_id', profileId);

  if (repliesError) {
    console.error('Error fetching replies for user comment conversations:', repliesError);
    throw repliesError;
  }

  const replyRows = (repliesData ?? []) as Array<
    {
      id: number | string;
      listing_id: string | null;
      profile_id: string;
      content: string;
      created_at: string;
      parent_comment_id: number | string | null;
      author: any;
    }
  >;

  if (!replyRows.length) {
    return [];
  }

  const repliesByParent = replyRows.reduce<Record<string, typeof replyRows>>((acc, reply) => {
    const parentKey = reply.parent_comment_id != null ? reply.parent_comment_id.toString() : null;
    if (!parentKey) {
      return acc;
    }
    acc[parentKey] = acc[parentKey] ?? [];
    acc[parentKey].push(reply);
    return acc;
  }, {});

  const toCommentWithAuthor = (reply: any) => {
    const authorRecord = Array.isArray(reply.author) ? reply.author[0] : reply.author;
    return mapCommentRowToCommentWithAuthor({
      ...reply,
      author: authorRecord ?? {},
    });
  };

  const conversations = rows
    .map((row) => {
      const parentKey = row.id.toString();
      const otherReplies = repliesByParent[parentKey] ?? [];

      if (!otherReplies.length) {
        return null;
      }

      const sortedReplies = [...otherReplies].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
      const formattedReplies = sortedReplies.map((replyRow) => toCommentWithAuthor(replyRow));
      const firstReply = formattedReplies[0] ?? null;
      const latestReply = formattedReplies[formattedReplies.length - 1] ?? null;

      const listing = row.listing_id ? listingsById[row.listing_id] : null;

      return {
        id: row.id.toString(),
        listingId: listing?.id ?? row.listing_id ?? '',
        listingTitle: listing?.title ?? null,
        listingCity: listing?.city ?? null,
        listingDistrict: listing?.district ?? null,
        listingCoverPhotoUrl: listing?.cover_photo_url ?? null,
        listingHostId: listing?.host_id ?? null,
        content: row.content,
        createdAt: row.created_at,
        replyCount: formattedReplies.length,
        latestReplyAt: latestReply?.createdAt ?? null,
        firstReply,
        latestReply,
        recentReplies: formattedReplies,
      } satisfies CommentConversation;
    })
    .filter(Boolean) as CommentConversation[];

  return conversations.sort((a, b) => {
    const aTime = a.latestReplyAt ? new Date(a.latestReplyAt).getTime() : new Date(a.createdAt).getTime();
    const bTime = b.latestReplyAt ? new Date(b.latestReplyAt).getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });
};

export const deleteListingComment = async (commentId: string): Promise<void> => {
  const numericId = Number(commentId);
  if (!Number.isFinite(numericId)) {
    throw new Error('invalid_comment_id');
  }

  const { error } = await supabase
    .from('listing_comments')
    .delete()
    .eq('id', numericId);

  if (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};
