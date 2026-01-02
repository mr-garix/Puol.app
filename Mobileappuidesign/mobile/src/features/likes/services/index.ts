import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';
import type { HostLikeActivity, HostLikeSummary } from '../types';
import { sendHeartbeat } from '@/src/utils/heartbeat';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * Récupère le nombre de likes pour une annonce.
 */
export async function getListingLikeCount(listingId: string): Promise<number> {
  const { count, error } = await supabase
    .from('listing_likes')
    .select('*', { count: 'exact', head: true })
    .eq('listing_id', listingId);

  if (error) {
    console.error('[likes] getListingLikeCount error', error);
    return 0;
  }

  return count ?? 0;
}

/**
 * Vérifie si l'utilisateur courant a liké une annonce.
 */
export async function hasUserLikedListing(listingId: string, profileId?: string | null): Promise<boolean> {
  if (!profileId) {
    console.log('[likes] hasUserLikedListing skipped (no profile)', { listingId });
    return false;
  }

  const { data, error } = await supabase
    .from('listing_likes')
    .select('id')
    .eq('listing_id', listingId)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('[likes] hasUserLikedListing error', error);
    return false;
  }

  return Boolean(data);
}

/**
 * Ajoute un like (si pas déjà liké) ou retire le like (si déjà liké).
 * Retourne le nouveau statut (true = liké, false = non liké).
 */
export async function toggleListingLike(listingId: string, profileId: string): Promise<boolean> {
  if (!profileId) {
    console.warn('[likes] toggleListingLike called without profileId, skipping', { listingId });
    return false;
  }

  // Vérifie si un like existe déjà
  const { data: existing, error: fetchError } = await supabase
    .from('listing_likes')
    .select('id')
    .eq('listing_id', listingId)
    .eq('profile_id', profileId)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('[likes] toggleListingLike fetch error', fetchError);
    throw fetchError;
  }

  if (existing) {
    // Unlike : suppression
    const { error: deleteError } = await supabase
      .from('listing_likes')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      console.error('[likes] unlike error', deleteError);
      throw deleteError;
    }

    console.log('[likes] unliked', { listingId, profileId });
    return false;
  } else {
    // Like : insertion
    const { error: insertError } = await supabase
      .from('listing_likes')
      .insert({
        listing_id: listingId,
        profile_id: profileId,
      });

    if (insertError) {
      console.error('[likes] like error', insertError);
      throw insertError;
    }

    console.log('[likes] liked', { listingId, profileId });
    // Envoyer le heartbeat (user connecté ou visiteur anonyme)
    await sendHeartbeat(profileId || null);
    return true;
  }
}

type HostLikeRow = {
  id: number | string;
  listing_id: string | number | null;
  created_at: string;
  profile_id: string;
  listing:
    | {
        id: string | number;
        title: string | null;
        cover_photo_url: string | null;
        city: string | null;
        district: string | null;
        host_id: string | null;
        rental_kind?: string | null;
      }
    | Array<{
        id: string | number;
        title: string | null;
        cover_photo_url: string | null;
        city: string | null;
        district: string | null;
        host_id: string | null;
        rental_kind?: string | null;
      }>
    | null;
  liker:
    | {
        id: string;
        username: string | null;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
        enterprise_name: string | null;
      }
    | Array<{
        id: string;
        username: string | null;
        first_name: string | null;
        last_name: string | null;
        avatar_url: string | null;
        enterprise_name: string | null;
      }>
    | null;
};

const EMPTY_SUMMARY: HostLikeSummary = { total: 0, byListing: {} };

const mapHostLikeRowToActivity = (row: HostLikeRow): HostLikeActivity | null => {
  const listingRecord = Array.isArray(row.listing) ? row.listing[0] : row.listing;
  if (!listingRecord || !listingRecord.id) {
    return null;
  }

  const likerRecord = Array.isArray(row.liker) ? row.liker[0] : row.liker;

  return {
    id: row.id.toString(),
    listingId: listingRecord.id.toString(),
    listingTitle: listingRecord.title ?? null,
    listingCoverPhotoUrl: listingRecord.cover_photo_url ?? null,
    listingCity: listingRecord.city ?? null,
    listingDistrict: listingRecord.district ?? null,
    liker: {
      id: likerRecord?.id ?? 'unknown',
      username: likerRecord?.username ?? null,
      firstName: likerRecord?.first_name ?? null,
      lastName: likerRecord?.last_name ?? null,
      avatarUrl: likerRecord?.avatar_url ?? null,
      enterpriseName: likerRecord?.enterprise_name ?? null,
    },
    createdAt: row.created_at,
  } satisfies HostLikeActivity;
};

const buildHostLikeSummary = (activities: HostLikeActivity[]): HostLikeSummary => {
  const byListing = activities.reduce<Record<string, number>>((acc, activity) => {
    if (!activity.listingId) {
      return acc;
    }
    acc[activity.listingId] = (acc[activity.listingId] ?? 0) + 1;
    return acc;
  }, {});

  return {
    total: activities.length,
    byListing,
  } satisfies HostLikeSummary;
};

interface LikeActivityFilters {
  hostId: string;
  rentalKind?: string | null;
}

const LISTING_LIKES_SELECT = `
  id,
  listing_id,
  profile_id,
  created_at,
  listing:listings!inner(
    id,
    title,
    cover_photo_url,
    city,
    district,
    host_id,
    rental_kind
  ),
  liker:profiles(
    id,
    username,
    first_name,
    last_name,
    avatar_url,
    enterprise_name
  )
` as const;

const fetchLikeActivities = async ({ hostId, rentalKind }: LikeActivityFilters) => {
  let query = supabase
    .from('listing_likes')
    .select(LISTING_LIKES_SELECT)
    .eq('listing.host_id', hostId)
    .neq('profile_id', hostId)
    .order('created_at', { ascending: false });

  if (rentalKind) {
    query = query.eq('listing.rental_kind', rentalKind);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[likes] fetchLikeActivities error', error);
    throw error;
  }

  const rows = (data ?? []) as HostLikeRow[];
  const activities = rows
    .map((row) => {
      try {
        return mapHostLikeRowToActivity(row);
      } catch (mappingError) {
        console.warn('[likes] Unable to map host like row', mappingError, row);
        return null;
      }
    })
    .filter((activity): activity is HostLikeActivity => Boolean(activity));

  return {
    activities,
    summary: buildHostLikeSummary(activities),
  };
};

export const getHostLikeActivities = async (
  hostId: string | null | undefined,
): Promise<{ activities: HostLikeActivity[]; summary: HostLikeSummary }> => {
  if (!hostId) {
    return { activities: [], summary: EMPTY_SUMMARY };
  }

  return fetchLikeActivities({ hostId });
};

export const getLandlordLikeActivities = async (
  landlordId: string | null | undefined,
): Promise<{ activities: HostLikeActivity[]; summary: HostLikeSummary }> => {
  if (!landlordId) {
    return { activities: [], summary: EMPTY_SUMMARY };
  }

  return fetchLikeActivities({ hostId: landlordId, rentalKind: 'long_term' });
};
