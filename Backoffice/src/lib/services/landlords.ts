import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '../supabaseClient';
import type { Database } from '../../types/supabase.generated';

type ProfilesTable = Database['public']['Tables']['profiles']['Row'];
type ListingsRow = Database['public']['Tables']['listings']['Row'];

type LandlordSegment = 'premium' | 'core' | 'lite';

export type LandlordStats = {
  activeLandlords: number;
  landlordListings: number;
  landlordVisits: number;
  pendingApplications: number;
};

export type LandlordListItem = {
  id: string;
  fullName: string;
  username: string | null;
  city: string | null;
  phone: string | null;
  landlordStatus: string | null;
  segment: LandlordSegment;
  createdAt: string | null;
  listingStats: LandlordListingStats | null;
};

export type LandlordListingStats = {
  online: number;
  draft: number;
  total: number;
};

export type LandlordBoardListing = {
  id: string;
  title: string;
  city: string;
  district: string;
  propertyType: string;
  pricePerMonth: number | null;
  hostId: string | null;
  hostName: string;
  createdAt: string | null;
  coverPhotoUrl: string | null;
  isAvailable: boolean;
  imagesCount: number;
  videosCount: number;
  visitsCount: number;
};

const EMPTY_STATS: LandlordStats = {
  activeLandlords: 0,
  landlordListings: 0,
  landlordVisits: 0,
  pendingApplications: 0,
};

const LANDLORD_ROLE: NonNullable<ProfilesTable['role']> = 'landlord';
const APPLICATION_PENDING_STATUS = 'pending';
const LONG_TERM_KIND: ListingsRow['rental_kind'] = 'long_term';

export type LandlordProfileData = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  city: string | null;
  phone: string | null;
  landlordStatus: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  avatarUrl: string | null;
  enterpriseName: string | null;
  listings: Array<{
    id: string;
    title: string;
    city: string;
    propertyType: string;
    updatedAt: string;
    createdAt: string;
    pricePerMonth: number | null;
    isAvailable: boolean;
    coverPhotoUrl: string | null;
    status: string | null;
    viewCount?: number;
    likeCount?: number;
    commentCount?: number;
  }>;
  metrics: {
    listingsTotal: number;
    listingsOnline: number;
    listingsDraft: number;
    views: number;
    likes: number;
    comments: number;
    visits: number;
  };
};

export async function fetchLandlordStats(): Promise<LandlordStats> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable, returning fallback stats');
    return EMPTY_STATS;
  }

  try {
    const client = supabase as SupabaseClient<Database>;

    const [activeLandlordsCount, pendingApplicationsCount, listingSummary] = await Promise.all([
      countLandlords(client),
      countPendingApplications(client),
      fetchLandlordListingIds(client),
    ]);

    const visitsCount = await countVisitsForListings(client, listingSummary.listingIds);

    return {
      activeLandlords: activeLandlordsCount,
      landlordListings: listingSummary.listingCount,
      landlordVisits: visitsCount,
      pendingApplications: pendingApplicationsCount,
    };
  } catch (error) {
    console.error('[landlords] fetchLandlordStats failed', error);
    return EMPTY_STATS;
  }
}

async function countRowsByColumn(
  client: SupabaseClient<Database>,
  table: keyof Database['public']['Tables'],
  column: string,
  value: string,
): Promise<number> {
  if (!value) {
    return 0;
  }

  const { count, error } = await client.from(table).select('id', { count: 'exact', head: true }).eq(column, value);
  if (error) {
    console.warn(`[landlords] countRowsByColumn error for ${table}.${column}`, error);
    return 0;
  }
  return count ?? 0;
}

export async function fetchLandlordProfileData(landlordId: string): Promise<LandlordProfileData | null> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable, returning null profile detail');
    return null;
  }

  try {
    const client = supabase as SupabaseClient<Database>;

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select(
        'id, first_name, last_name, username, city, phone, landlord_status, created_at, updated_at, avatar_url, enterprise_name',
      )
      .eq('id', landlordId)
      .single();

    if (profileError) {
      console.warn('[landlords] fetchLandlordProfileData profile error', profileError);
      return null;
    }

    if (!profile) {
      return null;
    }

    const { data: listingsData, error: listingsError } = await client
      .from('listings')
      .select('id, title, city, property_type, updated_at, created_at, price_per_month, is_available, cover_photo_url, status')
      .eq('host_id', landlordId)
      .eq('rental_kind', LONG_TERM_KIND)
      .order('updated_at', { ascending: false });

    if (listingsError) {
      console.warn('[landlords] fetchLandlordProfileData listings error', listingsError);
    }

    const listings = (listingsData ?? []).map(listing => ({
      id: listing.id,
      title: listing.title,
      city: listing.city,
      propertyType: listing.property_type,
      updatedAt: listing.updated_at,
      createdAt: listing.created_at,
      pricePerMonth: listing.price_per_month,
      isAvailable: listing.is_available,
      coverPhotoUrl: listing.cover_photo_url,
      status: listing.status,
    })) ?? [];

    const listingIds = listings.map(listing => listing.id).filter(Boolean);

    const engagements = await Promise.all(
      listings.map(async listing => {
        const [views, likes, comments] = await Promise.all([
          countRowsByColumn(client, 'listing_views', 'listing_id', listing.id),
          countRowsByColumn(client, 'listing_likes', 'listing_id', listing.id),
          countRowsByColumn(client, 'listing_comments', 'listing_id', listing.id),
        ]);
        return { listingId: listing.id, views, likes, comments };
      }),
    );

    const engagementMap = new Map(engagements.map(item => [item.listingId, item]));

    const listingsWithMetrics = listings.map(listing => {
      const engagement = engagementMap.get(listing.id) ?? { views: 0, likes: 0, comments: 0 };
      return {
        ...listing,
        viewCount: engagement.views,
        likeCount: engagement.likes,
        commentCount: engagement.comments,
      };
    });

    const visitsResult = listingIds.length
      ? await client
          .from('rental_visits')
          .select('id', { count: 'exact', head: true })
          .in('rental_listing_id', listingIds)
      : { count: 0 };

    const listingsOnline = listings.filter(listing => listing.isAvailable || isListingStatusOnline(listing.status)).length;
    const listingsDraft = listings.length - listingsOnline;

    const viewsTotal = engagements.reduce((sum, item) => sum + item.views, 0);
    const likesTotal = engagements.reduce((sum, item) => sum + item.likes, 0);
    const commentsTotal = engagements.reduce((sum, item) => sum + item.comments, 0);

    return {
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      username: profile.username,
      city: profile.city,
      phone: profile.phone,
      landlordStatus: profile.landlord_status,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
      avatarUrl: profile.avatar_url,
      enterpriseName: profile.enterprise_name,
      listings: listingsWithMetrics,
      metrics: {
        listingsTotal: listings.length,
        listingsOnline,
        listingsDraft,
        views: viewsTotal,
        likes: likesTotal,
        comments: commentsTotal,
        visits: visitsResult?.count ?? 0,
      },
    };
  } catch (error) {
    console.error('[landlords] fetchLandlordProfileData failed', error);
    return null;
  }
}

function isListingStatusOnline(status?: string | null): boolean {
  if (!status) {
    return false;
  }

  const normalized = status.trim().toLowerCase();
  return [
    'online',
    'en ligne',
    'active',
    'actif',
    'approved',
    'published',
    'ouverte',
    'open',
  ].some(keyword => normalized.includes(keyword));
}

async function fetchListingStatsByOwner(
  client: SupabaseClient<Database>,
  ownerIds: string[],
): Promise<Record<string, LandlordListingStats>> {
  const { data, error } = await client
    .from('listings')
    .select('host_id, status, rental_kind, is_furnished')
    .in('host_id', ownerIds)
    .or('is_furnished.eq.false,rental_kind.eq.long_term');

  if (error) {
    console.warn('[landlords] fetchListingStatsByOwner error', error);
    return {};
  }

  const stats: Record<string, LandlordListingStats> = {};
  (data ?? []).forEach(listing => {
    const ownerId = listing.host_id;
    if (!ownerId) {
      return;
    }
    const bucket = stats[ownerId] ?? { online: 0, draft: 0, total: 0 };
    bucket.total += 1;
    const normalized = normalizeListingStatus(listing.status);
    if (normalized === 'online') {
      bucket.online += 1;
    } else if (normalized === 'draft') {
      bucket.draft += 1;
    }
    stats[ownerId] = bucket;
  });

  return stats;
}

function normalizeListingStatus(status?: string | null): 'online' | 'draft' | 'other' {
  const value = status?.trim().toLowerCase();
  if (!value) {
    return 'other';
  }

  const onlineKeywords = [
    'online',
    'en ligne',
    'active',
    'actif',
    'approved',
    'approuvée',
    'approuvee',
    'approved_publication',
    'validée',
    'validee',
    'validated',
    'published',
    'publiée',
    'publique',
    'available',
    'disponible',
    'live',
  ];
  const draftKeywords = [
    'draft',
    'en brouillon',
    'brouillon',
    'pending',
    'en attente',
    'waiting',
    'review',
    'in_review',
    'submitted',
    'submission',
    'moderation',
    'suspendue',
    'suspendu',
    'paused',
    'offline',
  ];

  if (onlineKeywords.some(keyword => value.includes(keyword))) {
    return 'online';
  }
  if (draftKeywords.some(keyword => value.includes(keyword))) {
    return 'draft';
  }
  return 'other';
}

export async function fetchLandlordListingsLive(): Promise<LandlordBoardListing[]> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable, returning empty landlord listings');
    return [];
  }

  try {
    const client = supabase as SupabaseClient<Database>;
    const { data, error } = await client
      .from('listings')
      .select(
        'id, title, city, district, property_type, price_per_month, host_id, created_at, cover_photo_url, status, is_available, is_furnished, rental_kind',
      )
      .eq('is_furnished', false)
      .eq('rental_kind', LONG_TERM_KIND)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[landlords] fetchLandlordListingsLive error', error);
      return [];
    }

    const listings = (data ?? []).filter((item): item is ListingsRow => Boolean(item?.id));
    if (!listings.length) {
      return [];
    }

    const listingIds = listings.map((listing) => listing.id).filter((id): id is string => Boolean(id));

    const hostIds = Array.from(new Set(listings.map((listing) => listing.host_id).filter((id): id is string => Boolean(id))));
    const hostNameMap = new Map<string, string>();
    const mediaCountMap = new Map<string, { photos: number; videos: number }>();
    const visitsCountMap = new Map<string, number>();

    if (hostIds.length) {
      const { data: hostsData, error: hostsError } = await client
        .from('profiles')
        .select('id, first_name, last_name, username')
        .in('id', hostIds);

      if (hostsError) {
        console.warn('[landlords] fetchLandlordListingsLive host lookup error', hostsError);
      }

      (hostsData ?? []).forEach((host) => {
        const parts = [host.first_name, host.last_name]
          .map((part) => part?.trim())
          .filter((part): part is string => Boolean(part));
        const fullName = parts.join(' ');
        const fallback = host.username?.trim();
        hostNameMap.set(host.id, fullName || fallback || 'Bailleur PUOL');
      });
    }

    if (listingIds.length) {
      const { data: mediaData, error: mediaError } = await client
        .from('listing_media')
        .select('listing_id, media_type')
        .in('listing_id', listingIds);

      if (mediaError) {
        console.warn('[landlords] fetchLandlordListingsLive media lookup error', mediaError);
      }

      (mediaData ?? []).forEach((media) => {
        const listingId = media.listing_id;
        if (!listingId) return;
        const entry = mediaCountMap.get(listingId) ?? { photos: 0, videos: 0 };
        const mediaType = media.media_type?.toLowerCase() ?? '';
        if (mediaType.includes('video')) {
          entry.videos += 1;
        } else {
          entry.photos += 1;
        }
        mediaCountMap.set(listingId, entry);
      });

      const { data: visitsData, error: visitsError } = await client
        .from('rental_visits')
        .select('rental_listing_id')
        .in('rental_listing_id', listingIds);

      if (visitsError) {
        console.warn('[landlords] fetchLandlordListingsLive visits lookup error', visitsError);
      }

      (visitsData ?? []).forEach((visit) => {
        const listingId = visit.rental_listing_id;
        if (!listingId) return;
        visitsCountMap.set(listingId, (visitsCountMap.get(listingId) ?? 0) + 1);
      });
    }

    return listings.map((listing) => ({
      id: listing.id,
      title: listing.title?.trim() || 'Annonce PUOL',
      city: listing.city?.trim() || '—',
      district: listing.district?.trim() || '—',
      propertyType: listing.property_type?.trim() || 'Bien',
      pricePerMonth: listing.price_per_month ?? null,
      hostId: listing.host_id,
      hostName: listing.host_id ? hostNameMap.get(listing.host_id) ?? 'Bailleur PUOL' : 'Bailleur PUOL',
      createdAt: listing.created_at ?? null,
      coverPhotoUrl: listing.cover_photo_url ?? null,
      isAvailable: listing.is_available ?? false,
      imagesCount: mediaCountMap.get(listing.id)?.photos ?? 0,
      videosCount: mediaCountMap.get(listing.id)?.videos ?? 0,
      visitsCount: visitsCountMap.get(listing.id) ?? 0,
    }));
  } catch (error) {
    console.warn('[landlords] fetchLandlordListingsLive unexpected error', error);
    return [];
  }
}

export async function fetchLandlordsList(): Promise<LandlordListItem[]> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable, returning empty landlords list');
    return [];
  }

  try {
    const client = supabase as SupabaseClient<Database>;
    const { data, error } = await client
      .from('profiles')
      .select('id, first_name, last_name, username, city, phone, landlord_status, created_at, role')
      .eq('role', LANDLORD_ROLE)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[landlords] fetchLandlordsList error', error);
      return [];
    }

    const rows = data ?? [];
    const landlordIds = rows.map(profile => profile.id).filter(Boolean);
    const listingStatsByOwner = landlordIds.length
      ? await fetchListingStatsByOwner(client, landlordIds)
      : {};

    return rows.map(profile => ({
      id: profile.id,
      fullName: [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim() || 'Bailleur PUOL',
      username: profile.username,
      city: profile.city,
      phone: profile.phone,
      landlordStatus: profile.landlord_status,
      segment: resolveSegment(profile.landlord_status),
      createdAt: profile.created_at ?? null,
      listingStats: listingStatsByOwner[profile.id] ?? null,
    }));
  } catch (error) {
    console.error('[landlords] fetchLandlordsList failed', error);
    return [];
  }
}

async function countLandlords(client: SupabaseClient<Database>): Promise<number> {
  const { count, error } = await client
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', LANDLORD_ROLE);

  if (error) {
    console.warn('[landlords] countLandlords error', error);
    return 0;
  }

  return count ?? 0;
}

async function fetchLandlordListingIds(
  client: SupabaseClient<Database>,
): Promise<{ listingIds: string[]; listingCount: number }> {
  const { data, error, count } = await client
    .from('listings')
    .select('id', { count: 'exact' })
    .eq('is_furnished', false)
    .eq('rental_kind', LONG_TERM_KIND);

  if (error) {
    console.warn('[landlords] fetchLandlordListingIds error', error);
    return { listingIds: [], listingCount: 0 };
  }

  const rows = (data ?? []) as Array<{ id: string }>;
  const ids = rows.map(listing => listing.id).filter(Boolean);

  return {
    listingIds: ids,
    listingCount: count ?? ids.length,
  };
}

async function countVisitsForListings(
  client: SupabaseClient<Database>,
  listingIds: string[],
): Promise<number> {
  if (!listingIds.length) {
    return 0;
  }

  const { count, error } = await client
    .from('rental_visits')
    .select('id', { count: 'exact', head: true })
    .in('rental_listing_id', listingIds);

  if (error) {
    console.warn('[landlords] countVisitsForListings error', error);
    return 0;
  }

  return count ?? 0;
}

async function countPendingApplications(client: SupabaseClient<Database>): Promise<number> {
  const { count, error } = await client
    .from('landlord_applications')
    .select('id', { count: 'exact', head: true })
    .eq('status', APPLICATION_PENDING_STATUS);

  if (error) {
    console.warn('[landlords] countPendingApplications error', error);
    return 0;
  }

  return count ?? 0;
}

export function resolveSegment(status?: string | null): LandlordSegment {
  const normalized = status?.toLowerCase().trim();
  switch (normalized) {
    case 'vip':
    case 'premium':
      return 'premium';
    case 'lite':
      return 'lite';
    default:
      return 'core';
  }
}
