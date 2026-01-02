type LandlordVisitGuest = Pick<ProfilesTable, 'first_name' | 'last_name' | 'phone'>;

type LandlordVisitListing = Pick<
  ListingsRow,
  'id' | 'host_id' | 'title' | 'city' | 'property_type' | 'cover_photo_url' | 'is_furnished' | 'rental_kind'
>;

type LandlordVisitSupabaseRow = RentalVisitRow & {
  guest_profile?: LandlordVisitGuest | LandlordVisitGuest[] | null;
  rental_listing?: LandlordVisitListing | LandlordVisitListing[] | null;
};

import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '../supabaseClient';
import type { Database } from '../../types/supabase.generated';
import {
  type LandlordListingDetail as LandlordListingDetailType,
  type LandlordMediaAsset,
  type LandlordRequest,
  type LandlordRequestStatus,
  type LandlordRoomBreakdown,
} from '@/components/admin/UsersManagement';
import { type VisitRecord } from '@/components/admin/VisitsManagement';

type ProfilesTable = Database['public']['Tables']['profiles']['Row'];
type ListingsRow = Database['public']['Tables']['listings']['Row'];
type RentalVisitRow = Database['public']['Tables']['rental_visits']['Row'];
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
  avatarUrl?: string | null;
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
  statusRaw: string | null;
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
const LANDLORD_SUPPLY_ROLE: ProfilesTable['supply_role'] = 'landlord';
const APPLICATION_PENDING_STATUS = 'pending';
const LONG_TERM_KIND: ListingsRow['rental_kind'] = 'long_term';
const VISIT_FEE_AMOUNT = 5000;
type ListingRoomRow = Database['public']['Tables']['listing_rooms']['Row'];
type ListingMediaRow = Database['public']['Tables']['listing_media']['Row'];
type ListingFeaturesRow = Database['public']['Tables']['listing_features']['Row'];

type ListingFeatureBooleanColumn = keyof Pick<
  ListingFeaturesRow,
  | 'has_ac'
  | 'has_wifi'
  | 'has_parking'
  | 'generator'
  | 'prepay_meter'
  | 'sonnel_meter'
  | 'water_well'
  | 'water_heater'
  | 'security_guard'
  | 'cctv'
  | 'fan'
  | 'tv'
  | 'smart_tv'
  | 'netflix'
  | 'washing_machine'
  | 'balcony'
  | 'terrace'
  | 'veranda'
  | 'mezzanine'
  | 'garden'
  | 'pool'
  | 'gym'
  | 'rooftop'
  | 'elevator'
  | 'accessible'
  | 'is_roadside'
  | 'within_50m'
>;

type LandlordApplicationProfile = Pick<
  ProfilesTable,
  'id' | 'first_name' | 'last_name' | 'phone' | 'city' | 'avatar_url' | 'landlord_status' | 'role' | 'supply_role'
> & { username: ProfilesTable['username'] };

type LandlordApplicationsSupabaseRow = {
  id: string;
  profile_id: string | null;
  status: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  admin_notes?: string | null;
  profile?: LandlordApplicationProfile | LandlordApplicationProfile[] | null;
};

async function getLandlordProfileIds(client: SupabaseClient<Database>): Promise<string[]> {
  try {
    const { data, error } = await client
      .from('profiles')
      .select('id')
      .eq('role', LANDLORD_ROLE);

    if (error) {
      console.warn('[landlords] getLandlordProfileIds error', error);
      return [];
    }

    return (data ?? []).map((profile) => profile.id).filter((id): id is string => Boolean(id));
  } catch (error) {
    console.warn('[landlords] getLandlordProfileIds failed', error);
    return [];
  }
}

function normalizeLandlordApplicationStatus(status: string | null): LandlordRequestStatus {
  if (!status) {
    return 'pending';
  }

  const value = status.toLowerCase().trim();

  if (['approved', 'approuvé', 'approuve', 'valide', 'validated', 'accepted', 'accepté'].some((keyword) => value.includes(keyword))) {
    return 'approved';
  }

  if (['rejected', 'reject', 'refus', 'declined', 'denied', 'refusé', 'refuse'].some((keyword) => value.includes(keyword))) {
    return 'rejected';
  }

  return 'pending';
}

function formatApplicationDate(isoDate: string | null): string {
  if (!isoDate) {
    return '—';
  }

  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function extractApplicationProfile(profile: LandlordApplicationsSupabaseRow['profile']): LandlordApplicationProfile | null {
  if (!profile) {
    return null;
  }

  if (Array.isArray(profile)) {
    return profile[0] ?? null;
  }

  return profile;
}

function buildApplicationName(firstName: string | null | undefined, lastName: string | null | undefined): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const safeFirst = firstName?.trim() ?? '';
  const safeLast = lastName?.trim() ?? '';

  if (safeFirst || safeLast) {
    return {
      firstName: safeFirst || 'Candidat',
      lastName: safeLast || (safeFirst ? 'PUOL' : 'Bailleur'),
      fullName: [safeFirst, safeLast].filter(Boolean).join(' '),
    };
  }

  return {
    firstName: 'Candidat',
    lastName: 'Bailleur',
    fullName: 'Candidat bailleur',
  };
}

function mapAdminNotesToMotivation(notes: string | null): string {
  if (!notes) {
    return '';
  }

  const trimmed = notes.trim();
  return trimmed.length > 0 ? trimmed : '';
}

export async function fetchLandlordApplications(): Promise<LandlordRequest[]> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable, returning fallback landlord applications');
    return [];
  }

  try {
    const client = supabase as SupabaseClient<Database>;
    const { data, error } = await client
      .from('landlord_applications')
      .select(
        `
          id,
          profile_id,
          status,
          submitted_at,
          reviewed_at,
          admin_notes,
          profile:profiles!landlord_applications_profile_id_fkey (
            id,
            first_name,
            last_name,
            phone,
            city,
            avatar_url,
            landlord_status,
            username,
            role,
            supply_role
          )
        `,
      )
      .order('submitted_at', { ascending: false });

    if (error) {
      console.warn('[landlords] fetchLandlordApplications error', error);
      return [];
    }

    const rows: LandlordApplicationsSupabaseRow[] = data ?? [];

    return rows.map((row) => {
      const profile = extractApplicationProfile(row.profile);
      const { firstName, lastName, fullName } = buildApplicationName(profile?.first_name, profile?.last_name);
      const profileId = row.profile_id ?? profile?.id ?? '';
      const effectiveStatus = normalizeLandlordApplicationStatus(profile?.landlord_status ?? row.status ?? null);

      return {
        id: row.id,
        profileId,
        fullName: fullName || `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        email: '—',
        phone: profile?.phone?.trim() || '—',
        city: profile?.city?.trim() || '—',
        unitsPortfolio: 0,
        propertyTypes: [],
        submittedAt: formatApplicationDate(row.submitted_at ?? null),
        motivation: mapAdminNotesToMotivation(row.admin_notes ?? null),
        documents: [],
        avatarUrl: profile?.avatar_url ?? '',
        status: effectiveStatus,
      } satisfies LandlordRequest;
    });
  } catch (error) {
    console.error('[landlords] fetchLandlordApplications failed', error);
    return [];
  }
}

/**
 * Approuve une candidature bailleur et met à jour le profil correspondant.
 * - landlord_applications.status = 'approved', reviewed_at = now
 * - profiles: role='landlord', supply_role='landlord', landlord_status='approved'
 */
export async function approveLandlordApplication(applicationId: string, profileId: string): Promise<boolean> {
  if (!supabase) {
    console.warn('[landlords] approveLandlordApplication skipped: no Supabase client');
    return false;
  }
  if (!applicationId || !profileId) {
    console.warn('[landlords] approveLandlordApplication skipped: missing identifiers', { applicationId, profileId });
    return false;
  }

  const client = supabase as SupabaseClient<Database>;
  const nowIso = new Date().toISOString();

  const { error: appError } = await client
    .from('landlord_applications')
    .update({ status: 'approved', reviewed_at: nowIso })
    .eq('id', applicationId);

  if (appError) {
    console.warn('[landlords] approveLandlordApplication failed on landlord_applications', appError, { applicationId });
    return false;
  }

  const { error: profileError } = await client
    .from('profiles')
    .update({
      role: LANDLORD_ROLE,
      supply_role: LANDLORD_SUPPLY_ROLE,
      landlord_status: 'approved',
      is_certified: true,
    })
    .eq('id', profileId);

  if (profileError) {
    console.warn('[landlords] approveLandlordApplication failed on profiles', profileError, { profileId });
    return false;
  }

  return true;
}

/**
 * Refuse une candidature bailleur et remet le profil à l’état standard.
 * - landlord_applications.status = 'rejected', reviewed_at = now
 * - profiles: role='guest', supply_role='none', landlord_status='rejected'
 */
export async function rejectLandlordApplication(applicationId: string, profileId: string): Promise<boolean> {
  if (!supabase) {
    console.warn('[landlords] rejectLandlordApplication skipped: no Supabase client');
    return false;
  }
  if (!applicationId || !profileId) {
    console.warn('[landlords] rejectLandlordApplication skipped: missing identifiers', { applicationId, profileId });
    return false;
  }

  const client = supabase as SupabaseClient<Database>;
  const nowIso = new Date().toISOString();

  const { error: appError } = await client
    .from('landlord_applications')
    .update({ status: 'rejected', reviewed_at: nowIso })
    .eq('id', applicationId);

  if (appError) {
    console.warn('[landlords] rejectLandlordApplication failed on landlord_applications', appError, { applicationId });
    return false;
  }

  const { error: profileError } = await client
    .from('profiles')
    .update({
      role: 'guest',
      supply_role: 'none',
      landlord_status: 'rejected',
    })
    .eq('id', profileId);

  if (profileError) {
    console.warn('[landlords] rejectLandlordApplication failed on profiles', profileError, { profileId });
    return false;
  }

  // Après notification de refus, on remet landlord_status à 'none' pour permettre une nouvelle demande
  setTimeout(async () => {
    const { error } = await client.from('profiles').update({ landlord_status: 'none' }).eq('id', profileId);
    if (error) {
      console.warn('[landlords] rejectLandlordApplication reset landlord_status failed', error, { profileId });
    }
  }, 30_000);

  return true;
}

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
      statusRaw: listing.status ?? null,
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
      .select('id, first_name, last_name, username, city, phone, landlord_status, created_at, role, avatar_url')
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
      avatarUrl: profile.avatar_url ?? null,
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

function formatIsoToShortDate(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

type LandlordListingDetailResult = Pick<
  LandlordListingDetailType,
  | 'id'
  | 'title'
  | 'city'
  | 'district'
  | 'price'
  | 'priceType'
  | 'status'
  | 'statusLabel'
  | 'owner'
  | 'ownerLabel'
  | 'createdAt'
  | 'furnished'
  | 'visits'
> & {
  coverUrl: string | null;
  gallery: string[];
  description: string | null;
  occupancy: number;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  bookings: number;
  reviewsCount: number;
  rating: number | null;
  amenities: string[];
  ownerPhone: string | null;
  ownerUsername: string | null;
  ownerProfileId: string | null;
  depositAmount: number | null;
  minLeaseMonths: number | null;
  guestCapacity: number | null;
  propertyType: string | null;
  isCommercial: boolean;
  isAvailable: boolean;
  addressText: string | null;
  googleAddress: string | null;
  formattedAddress: string | null;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
  roomBreakdown: LandlordRoomBreakdown;
  mediaAssets: LandlordMediaAsset[];
  notes: string | null;
  rentalKind: ListingsRow['rental_kind'] | null;
  pricePerNight: number | null;
  surfaceArea: number | null;
  coverFallback?: string | null;
};

const EMPTY_ROOM_BREAKDOWN: LandlordRoomBreakdown = {
  livingRoom: 0,
  bedrooms: 0,
  kitchens: 0,
  bathrooms: 0,
  diningRooms: 0,
  toilets: 0,
};

const FEATURE_LABEL_MAP: Record<ListingFeatureBooleanColumn, string> = {
  has_ac: 'Climatisation',
  has_wifi: 'Wi-Fi',
  has_parking: 'Parking',
  generator: 'Groupe électrogène',
  prepay_meter: 'Compteur prépayé',
  sonnel_meter: 'Compteur SONEL',
  water_well: 'Forage',
  water_heater: 'Chauffe-eau',
  security_guard: 'Gardiennage',
  cctv: 'Caméras de surveillance',
  fan: 'Ventilateur',
  tv: 'Télévision',
  smart_tv: 'Smart TV',
  netflix: 'Netflix',
  washing_machine: 'Machine à laver',
  balcony: 'Balcon',
  terrace: 'Terrasse',
  veranda: 'Véranda',
  mezzanine: 'Mezzanine',
  garden: 'Jardin',
  pool: 'Piscine',
  gym: 'Salle de sport',
  rooftop: 'Rooftop',
  elevator: 'Ascenseur',
  accessible: 'Accès PMR',
  is_roadside: 'En bord de route',
  within_50m: 'À moins de 50 m de la route',
};

const ROAD_DISTANCE_LABELS: Record<string, string> = {
  roadside: 'En bord de route',
  within_50m: 'À moins de 50 m de la route',
  within_100m: 'À 100 m de la route',
  beyond_200m: 'À plus de 200 m de la route',
};

function mapAmenitiesFromFeatures(row?: ListingFeaturesRow | null): string[] {
  if (!row) {
    return [];
  }

  const labels: string[] = [];
  (Object.entries(FEATURE_LABEL_MAP) as [ListingFeatureBooleanColumn, string][]).forEach(([column, label]) => {
    if (row[column]) {
      labels.push(label);
    }
  });

  if (row.near_main_road) {
    const roadLabel = ROAD_DISTANCE_LABELS[row.near_main_road];
    if (roadLabel) {
      labels.push(roadLabel);
    }
  }

  return labels;
}

function mapRoomBreakdown(row?: ListingRoomRow | null): LandlordRoomBreakdown {
  if (!row) {
    return { ...EMPTY_ROOM_BREAKDOWN };
  }
  return {
    livingRoom: row.living_room ?? 0,
    bedrooms: row.bedrooms ?? 0,
    kitchens: row.kitchen ?? 0,
    bathrooms: row.bathrooms ?? 0,
    diningRooms: row.dining_room ?? 0,
    toilets: row.toilets ?? 0,
  };
}

function mapMediaAssets(rows: ListingMediaRow[]): LandlordMediaAsset[] {
  return rows
    .map((row) => ({
      id: row.id,
      type: row.media_type?.toLowerCase().includes('video') ? 'video' as const : 'photo' as const,
      label: row.media_tag ?? 'Média annonce',
      room: row.media_tag ?? null,
      thumbnailUrl: row.thumbnail_url ?? row.media_url ?? '',
      sourceUrl: row.media_url ?? null,
    }))
    .filter((asset) => Boolean(asset.id && asset.thumbnailUrl))
    .map((asset) => ({
      ...asset,
      room: asset.room ?? null,
    }));
}

type AggregatedCounts = {
  views: number;
  likes: number;
  comments: number;
  visits: number;
  bookings: number;
};

function parseSurfaceAreaValue(value?: string | null): number | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) {
    return null;
  }

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const candidate =
        (parsed && (parsed.surfaceArea ?? parsed.surface ?? parsed.area ?? parsed.value)) ?? null;
      if (candidate !== null && candidate !== undefined) {
        const numeric =
          typeof candidate === 'number'
            ? candidate
            : Number(String(candidate).replace(',', '.'));
        return Number.isFinite(numeric) ? numeric : null;
      }
    } catch {
      // Ignore JSON parse errors and continue with pattern-based parsing.
    }
  }

  const normalized = trimmed.replace(',', '.');
  if (/^\d+(\.\d+)?$/.test(normalized)) {
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : null;
  }

  const labelMatch = normalized.match(/surface(?:[_\s:]?area)?\s*[:=]?\s*(\d+(?:\.\d+)?)/i);
  if (labelMatch) {
    return Number(labelMatch[1]);
  }

  const unitMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:m2|m²|metres?|meters?)/i);
  if (unitMatch) {
    return Number(unitMatch[1]);
  }

  return null;
}

function extractSurfaceAreaFromMedia(
  rows: ListingMediaRow[],
  fallback?: number | null,
): number | null {
  if (!rows.length) {
    return fallback ?? null;
  }

  const prioritizedRows = rows.filter((row) =>
    /surface|plan|floor/i.test(row.media_tag ?? ''),
  );
  const rowsToInspect = prioritizedRows.length ? prioritizedRows : rows;

  for (const row of rowsToInspect) {
    const candidate = parseSurfaceAreaValue(row.thumbnail_url);
    if (candidate !== null && candidate > 0) {
      return candidate;
    }
  }

  return fallback ?? null;
}

async function fetchAggregatedCounts(client: SupabaseClient<Database>, listingId: string): Promise<AggregatedCounts> {
  const [viewsResp, likesResp, commentsResp, visitsResp, bookingsResp] = await Promise.all([
    client.from('listing_views').select('id', { count: 'exact', head: true }).eq('listing_id', listingId),
    client.from('listing_likes').select('id', { count: 'exact', head: true }).eq('listing_id', listingId),
    client.from('listing_comments').select('id', { count: 'exact', head: true }).eq('listing_id', listingId),
    client.from('rental_visits').select('id', { count: 'exact', head: true }).eq('rental_listing_id', listingId),
    client.from('bookings').select('id', { count: 'exact', head: true }).eq('listing_id', listingId),
  ]);

  return {
    views: viewsResp.count ?? 0,
    likes: likesResp.count ?? 0,
    comments: commentsResp.count ?? 0,
    visits: visitsResp.count ?? 0,
    bookings: bookingsResp.count ?? 0,
  };
}

async function fetchListingDetailFromSupabase(listingId: string): Promise<LandlordListingDetailResult | null> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable, skipping fetchListingDetailFromSupabase');
    return null;
  }

  const client = supabase as SupabaseClient<Database>;

  const { data, error } = await client
    .from('listings')
    .select(
      'id, title, city, district, price_per_month, price_per_night, status, is_available, property_type, description, cover_photo_url, created_at, address_text, formatted_address, google_address, place_id, latitude, longitude, deposit_amount, min_lease_months, capacity, rental_kind, host_id',
    )
    .eq('id', listingId)
    .maybeSingle();

  if (error) {
    console.warn('[landlords] fetchListingDetailFromSupabase error', error);
    return null;
  }
  if (!data) {
    return null;
  }

  const row = data as ListingsRow;

  const countsPromise = fetchAggregatedCounts(client, listingId);
  const mediaPromise = client
    .from('listing_media')
    .select('id, listing_id, media_type, media_url, thumbnail_url, media_tag, position, created_at')
    .eq('listing_id', listingId)
    .order('position', { ascending: true });
  const roomPromise = client
    .from('listing_rooms')
    .select('*')
    .eq('listing_id', listingId)
    .maybeSingle();
  const featurePromise = client.from('listing_features').select('*').eq('listing_id', listingId).maybeSingle();
  const hostPromise = row.host_id
    ? client.from('profiles').select('id, first_name, last_name, username, phone').eq('id', row.host_id).maybeSingle()
    : Promise.resolve({ data: null, error: null });

  const reviewsPromise = client.from('reviews').select('rating').eq('listing_id', listingId);

  const [counts, mediaResult, roomResult, featureResult, hostResult, reviewsResult] = await Promise.all([
    countsPromise,
    mediaPromise,
    roomPromise,
    featurePromise,
    hostPromise,
    reviewsPromise,
  ]);

  const { views, likes, comments, visits, bookings } = counts;

  const { data: mediaData, error: mediaError } = mediaResult;
  if (mediaError) {
    console.warn('[landlords] fetchListingDetailFromSupabase listing_media error', mediaError);
  }
  const normalizedMediaRows: ListingMediaRow[] = Array.isArray(mediaData)
    ? mediaData
        .filter((item): item is ListingMediaRow => Boolean(item && typeof item === 'object' && 'id' in item))
        .map((item) => ({
          id: item.id,
          listing_id: item.listing_id ?? listingId,
          media_type: item.media_type ?? 'photo',
          media_url: item.media_url ?? '',
          thumbnail_url: item.thumbnail_url ?? item.media_url ?? '',
          media_tag: item.media_tag ?? null,
          position: item.position ?? 0,
          created_at: item.created_at ?? new Date().toISOString(),
        }))
        .filter((row) => Boolean(row.media_url))
    : [];

  const surfaceArea =
    extractSurfaceAreaFromMedia(normalizedMediaRows, null) ??
    null;

  const mediaAssets = normalizedMediaRows.length
    ? mapMediaAssets(normalizedMediaRows).map((asset, index) => ({
        ...asset,
        thumbnailUrl: asset.thumbnailUrl || normalizedMediaRows[index]?.media_url || '',
      }))
    : [];

  // Créer la galerie à partir des médias existants
  const gallery = normalizedMediaRows.length
    ? normalizedMediaRows.map((row) => row.media_url).filter((url) => Boolean(url))
    : [];

  const { data: featureData, error: featureError } = featureResult;
  if (featureError) {
    console.warn('[landlords] fetchListingDetailFromSupabase listing_features error', featureError);
  }
  const normalizedFeatureRow =
    featureData && typeof featureData === 'object' && !Array.isArray(featureData) && 'listing_id' in featureData
      ? (featureData as ListingFeaturesRow)
      : null;
  const amenities: string[] = mapAmenitiesFromFeatures(normalizedFeatureRow);

  const { data: roomData, error: roomError } = roomResult;
  if (roomError) {
    console.warn('[landlords] fetchListingDetailFromSupabase listing_rooms error', roomError);
  }
  const normalizedRoomData =
    roomData && typeof roomData === 'object' && !Array.isArray(roomData) && 'listing_id' in roomData
      ? (roomData as ListingRoomRow)
      : null;
  const roomBreakdown = mapRoomBreakdown(normalizedRoomData);

  const { data: hostData, error: hostError } = hostResult;
  if (hostError) {
    console.warn('[landlords] fetchListingDetailFromSupabase host lookup error', hostError);
  }
  const host = (hostData && typeof hostData === 'object' ? (hostData as ProfilesTable & { phone?: string }) : null) ?? null;
  const ownerName = host
    ? [host.first_name, host.last_name].filter((value) => Boolean(value?.trim())).join(' ').trim() || host.username || 'Bailleur PUOL'
    : 'Bailleur PUOL';

  const { data: reviewsData, error: reviewsError } = reviewsResult;
  if (reviewsError) {
    console.warn('[landlords] fetchListingDetailFromSupabase reviews lookup error', reviewsError);
  }
  const ratings = (reviewsData ?? [])
    .map((item: any) => (typeof item?.rating === 'number' ? item.rating : null))
    .filter((value): value is number => value !== null);
  const reviewsCount = ratings.length;
  const averageRating = reviewsCount ? ratings.reduce((sum, value) => sum + value, 0) / reviewsCount : null;

  const detail: LandlordListingDetailResult = {
    id: row.id,
    title: row.title ?? 'Annonce PUOL',
    city: row.city ?? 'Ville inconnue',
    district: row.district ?? '—',
    price: row.price_per_month ?? row.price_per_night ?? 0,
    priceType: row.price_per_month ? 'mois' : 'jour',
    status: normalizeListingStatus(row.status) === 'online' ? 'approved' : 'pending',
    statusLabel: normalizeListingStatus(row.status),
    owner: ownerName,
    ownerLabel: 'Bailleur',
    createdAt: row.created_at ?? null,
    furnished: Boolean(row.rental_kind && row.rental_kind !== 'long_term'),
    visits,
    coverUrl: row.cover_photo_url ?? gallery[0] ?? null,
    coverFallback: row.cover_photo_url ?? null,
    gallery,
    description: row.description ?? null,
    occupancy: 0,
    viewsCount: views,
    likesCount: likes,
    commentsCount: comments,
    bookings,
    reviewsCount,
    rating: averageRating,
    amenities,
    ownerPhone: host?.phone ?? null,
    ownerUsername: host?.username ?? null,
    ownerProfileId: host?.id ?? null,
    depositAmount: row.deposit_amount ?? null,
    minLeaseMonths: row.min_lease_months ?? null,
    guestCapacity: row.capacity ?? null,
    propertyType: row.property_type ?? null,
    isCommercial: false,
    isAvailable: row.is_available ?? false,
    addressText: row.address_text ?? null,
    googleAddress: row.google_address ?? null,
    formattedAddress: row.formatted_address ?? null,
    placeId: row.place_id ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    roomBreakdown,
    mediaAssets,
    notes: null,
    rentalKind: row.rental_kind ?? null,
    pricePerNight: row.price_per_night ?? null,
    surfaceArea,
  };

  return detail;
}

export async function fetchLandlordListingDetail(listingId: string): Promise<LandlordListingDetailType | null> {
  const liveDetail = await fetchListingDetailFromSupabase(listingId);
  if (!liveDetail) {
    return null;
  }

  const base = createDetailFromLive(liveDetail);
  base.id = liveDetail.id;
  base.title = liveDetail.title;
  base.city = liveDetail.city ?? base.city;
  base.district = liveDetail.district ?? base.district;
  base.price = liveDetail.price ?? base.price;
  base.priceType = liveDetail.priceType ?? base.priceType;
  base.status = liveDetail.status ?? base.status;
  base.statusLabel = liveDetail.statusLabel ?? base.statusLabel;
  base.owner = liveDetail.owner ?? base.owner;
  base.ownerLabel = liveDetail.ownerLabel ?? base.ownerLabel;
  base.createdAt = liveDetail.createdAt ? formatIsoToShortDate(liveDetail.createdAt) : base.createdAt;
  base.furnished = liveDetail.furnished ?? base.furnished;
  base.visits = liveDetail.visits ?? base.visits;
  base.coverUrl = liveDetail.coverUrl ?? liveDetail.coverFallback ?? base.coverUrl;
  base.gallery = liveDetail.gallery.length ? liveDetail.gallery : base.gallery;
  base.description = liveDetail.description ?? base.description;
  base.occupancy = liveDetail.occupancy ?? base.occupancy;
  base.viewsCount = liveDetail.viewsCount ?? base.viewsCount;
  base.likesCount = liveDetail.likesCount ?? base.likesCount ?? 0;
  base.commentsCount = liveDetail.commentsCount ?? base.commentsCount;
  base.bookings = liveDetail.bookings ?? base.bookings;
  if (liveDetail.amenities?.length) base.amenities = liveDetail.amenities;
  base.ownerPhone = liveDetail.ownerPhone ?? base.ownerPhone ?? '';
  base.ownerUsername = liveDetail.ownerUsername ?? base.ownerUsername;
  base.ownerProfileId = liveDetail.ownerProfileId ?? base.ownerProfileId;
  base.depositAmount = liveDetail.depositAmount ?? base.depositAmount;
  base.minLeaseMonths = liveDetail.minLeaseMonths ?? base.minLeaseMonths;
  base.guestCapacity = liveDetail.guestCapacity ?? base.guestCapacity;
  base.propertyType = liveDetail.propertyType ?? base.propertyType;
  base.isCommercial = liveDetail.isCommercial ?? base.isCommercial;
  base.isAvailable = liveDetail.isAvailable ?? base.isAvailable;
  base.addressText = liveDetail.addressText ?? base.addressText;
  base.googleAddress = liveDetail.googleAddress ?? base.googleAddress;
  base.formattedAddress = liveDetail.formattedAddress ?? base.formattedAddress;
  base.placeId = liveDetail.placeId ?? base.placeId;
  base.latitude = liveDetail.latitude ?? base.latitude;
  base.longitude = liveDetail.longitude ?? base.longitude;
  base.roomBreakdown = liveDetail.roomBreakdown ?? base.roomBreakdown;
  base.mediaAssets = liveDetail.mediaAssets.length ? liveDetail.mediaAssets : base.mediaAssets;
  base.notes = liveDetail.notes ?? base.notes;
  base.surfaceArea = liveDetail.surfaceArea ?? base.surfaceArea ?? null;
  return base;
}

function createDetailFromLive(liveDetail: LandlordListingDetailResult): LandlordListingDetailType {
  return {
    id: liveDetail.id,
    title: liveDetail.title,
    type: liveDetail.propertyType ?? 'Bien',
    city: liveDetail.city ?? '—',
    district: liveDetail.district ?? '—',
    price: liveDetail.price ?? 0,
    priceType: liveDetail.priceType ?? 'mois',
    status: liveDetail.status ?? 'approved',
    statusLabel: liveDetail.statusLabel ?? undefined,
    owner: liveDetail.owner ?? 'Bailleur PUOL',
    ownerLabel: liveDetail.ownerLabel ?? 'Bailleur',
    images: 0,
    videos: 0,
    createdAt: liveDetail.createdAt ? formatIsoToShortDate(liveDetail.createdAt) : '—',
    furnished: liveDetail.furnished ?? false,
    visits: liveDetail.visits ?? 0,
    previewUrl: liveDetail.coverUrl ?? '',
    coverUrl: liveDetail.coverUrl ?? '',
    gallery: Array.isArray(liveDetail.gallery) ? liveDetail.gallery : [],
    description: liveDetail.description ?? '',
    occupancy: liveDetail.occupancy ?? 0,
    viewsCount: liveDetail.viewsCount ?? 0,
    likesCount: liveDetail.likesCount ?? 0,
    commentsCount: liveDetail.commentsCount ?? 0,
    bookings: liveDetail.bookings ?? 0,
    reviewsCount: liveDetail.reviewsCount ?? 0,
    rating: liveDetail.rating ?? null,
    amenities: liveDetail.amenities ?? [],
    ownerPhone: liveDetail.ownerPhone ?? '',
    ownerUsername: liveDetail.ownerUsername ?? '',
    ownerProfileId: liveDetail.ownerProfileId ?? undefined,
    currentTenant: null,
    currentLeaseStart: null,
    currentLeaseEnd: null,
    notes: liveDetail.notes ?? '',
    depositAmount: liveDetail.depositAmount ?? null,
    minLeaseMonths: liveDetail.minLeaseMonths ?? null,
    guestCapacity: liveDetail.guestCapacity ?? 0,
    propertyType: liveDetail.propertyType ?? 'Bien',
    isCommercial: liveDetail.isCommercial ?? false,
    isAvailable: liveDetail.isAvailable ?? false,
    surfaceArea: liveDetail.surfaceArea ?? null,
    addressText: liveDetail.addressText ?? '',
    googleAddress: liveDetail.googleAddress ?? undefined,
    formattedAddress: liveDetail.formattedAddress ?? undefined,
    placeId: liveDetail.placeId ?? undefined,
    latitude: liveDetail.latitude ?? undefined,
    longitude: liveDetail.longitude ?? undefined,
    roomBreakdown: liveDetail.roomBreakdown ?? { ...EMPTY_ROOM_BREAKDOWN },
    mediaAssets: liveDetail.mediaAssets ?? [],
  };
}

export async function fetchLandlordVisits(): Promise<VisitRecord[]> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable, skipping fetchLandlordVisits');
    return [];
  }

  const client = supabase as SupabaseClient<Database>;

  try {
    const landlordProfileIds = await getLandlordProfileIds(client);
    if (!landlordProfileIds.length) {
      return [];
    }

    const { data: visits, error } = await client
      .from('rental_visits')
      .select(
        `
        id,
        visit_date,
        visit_time,
        status,
        notes,
        guest_profile:profiles!rental_visits_guest_profile_id_fkey (
          first_name,
          last_name,
          phone
        ),
        rental_listing:listings!rental_visits_rental_listing_id_fkey (
          id,
          host_id,
          title,
          city,
          property_type,
          cover_photo_url,
          is_furnished,
          rental_kind
        )
      `,
      )
      .not('rental_listing.host_id', 'is', null)
      .in('rental_listing.host_id', landlordProfileIds)
      .order('visit_date', { ascending: false })
      .order('visit_time', { ascending: false });

    if (error) {
      console.warn('[landlords] fetchLandlordVisits error', error);
      return [];
    }

    if (!visits || visits.length === 0) {
      return [];
    }

    const mappedVisitsWithOwner = (visits as LandlordVisitSupabaseRow[])
      .filter((visit) => {
        const listing = unwrapJoinedValue(visit.rental_listing);
        return Boolean(listing && listing.host_id);
      })
      .map((visit) => {
        const guestProfile = unwrapJoinedValue(visit.guest_profile);
        const listing = unwrapJoinedValue(visit.rental_listing);

        const visitorName = buildVisitorName(guestProfile);

        return {
          id: visit.id,
          property: listing?.title?.trim() || 'Annonce PUOL',
          propertyImage: listing?.cover_photo_url ?? null,
          propertyType: listing?.property_type ?? null,
          visitor: visitorName,
          date: formatVisitDate(visit.visit_date),
          time: formatVisitTime(visit.visit_time),
          status: mapVisitStatus(visit.status),
          paymentStatus: mapVisitPaymentStatus(visit.status),
          amount: formatFeeAmount(VISIT_FEE_AMOUNT),
          phone: guestProfile?.phone ?? '—',
          city: listing?.city?.trim() || '—',
          hostId: listing?.host_id ?? null,
        } as VisitRecord & { hostId: string | null };
      });

    const hostIds = Array.from(
      new Set(
        mappedVisitsWithOwner
          .map((visit) => visit.hostId)
          .filter((value): value is string => Boolean(value)),
      ),
    );

    const hostProfiles = hostIds.length
      ? await client
          .from('profiles')
          .select('id, first_name, last_name, username, phone, city')
          .in('id', hostIds)
      : { data: [], error: null };

    if (hostProfiles.error) {
      console.warn('[landlords] fetchLandlordVisits host lookup error', hostProfiles.error);
    }

    const hostMap = new Map(
      (hostProfiles.data ?? []).map((host) => [host.id, host]),
    );

    const mappedVisits: VisitRecord[] = mappedVisitsWithOwner.map((visit) => {
      const host = visit.hostId ? hostMap.get(visit.hostId) : undefined;
      return {
        id: visit.id,
        property: visit.property,
        propertyImage: visit.propertyImage,
        propertyType: visit.propertyType,
        visitor: visit.visitor,
        date: visit.date,
        time: visit.time,
        status: visit.status,
        paymentStatus: visit.paymentStatus,
        amount: visit.amount,
        phone: visit.phone,
        city: visit.city,
        landlordName: buildLandlordName(host),
        landlordPhone: host?.phone ?? '—',
        landlordId: host?.id ?? undefined,
        landlordCity: host?.city ?? undefined,
        landlordUsername: host?.username ?? undefined,
      } satisfies VisitRecord;
    });

    return mappedVisits;
  } catch (error) {
    console.warn('[landlords] fetchLandlordVisits failed', error);
    return [];
  }
}

function mapVisitStatus(status: string | null): 'pending' | 'confirmed' | 'cancelled' {
  if (!status) return 'pending';
  
  const normalized = status.toLowerCase().trim();
  if (normalized === 'confirmed' || normalized === 'confirmé' || normalized === 'accepted') {
    return 'confirmed';
  }
  if (normalized === 'cancelled' || normalized === 'annulé' || normalized === 'canceled') {
    return 'cancelled';
  }
  return 'pending';
}

function mapVisitPaymentStatus(status: string | null): VisitRecord['paymentStatus'] {
  const normalized = status?.toLowerCase().trim();
  if (normalized === 'confirmed' || normalized === 'confirmé' || normalized === 'accepted') {
    return 'paid';
  }
  if (normalized === 'cancelled' || normalized === 'annulé' || normalized === 'canceled') {
    return 'refunded';
  }
  return 'pending';
}

function buildVisitorName(guest?: LandlordVisitGuest | null): string {
  if (!guest) {
    return 'Client';
  }
  const tokens = [guest.first_name, guest.last_name]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (tokens.length) {
    return tokens.join(' ');
  }
  return 'Client';
}

function buildLandlordName(host?: { first_name: string | null; last_name: string | null; username: string | null } | null): string {
  if (!host) {
    return 'Bailleur PUOL';
  }
  const tokens = [host.first_name, host.last_name]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));
  if (tokens.length) {
    return tokens.join(' ');
  }
  return host.username?.trim() || 'Bailleur PUOL';
}

function formatVisitDate(raw: string | null): string {
  if (!raw) {
    return '—';
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatVisitTime(raw: string | null): string {
  if (!raw) {
    return '—';
  }
  return raw;
}

function unwrapJoinedValue<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value.length ? value[0] ?? null : null;
  }
  return value ?? null;
}

function formatFeeAmount(value: number): string {
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

export async function checkIfListingIsAssigned(listingId: string): Promise<boolean> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable');
    return false;
  }

  try {
    const client = supabase as SupabaseClient<Database>;
    const { data, error } = await client
      .from('rental_leases')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .eq('status', 'active');

    if (error) {
      console.warn('[landlords] checkIfListingIsAssigned error', error);
      return false;
    }

    return (data?.length ?? 0) > 0;
  } catch (error) {
    console.error('[landlords] checkIfListingIsAssigned failed', error);
    return false;
  }
}

export type CreateRentalLeaseInput = {
  listing_id: string;
  tenant_profile_id: string;
  owner_profile_id: string;
  start_date: string;
  end_date?: string;
  rent_monthly: number;
  platform_fee_total: number;
  months_count: number;
  total_rent: number;
  currency?: string;
  status?: string;
};

export async function createRentalLease(input: CreateRentalLeaseInput): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable');
    return { success: false, error: 'Supabase client unavailable' };
  }

  try {
    const client = supabase as SupabaseClient<Database>;
    const { error } = await client
      .from('rental_leases')
      .insert([
        {
          listing_id: input.listing_id,
          tenant_profile_id: input.tenant_profile_id,
          owner_profile_id: input.owner_profile_id,
          start_date: input.start_date,
          end_date: input.end_date || null,
          rent_monthly: input.rent_monthly,
          platform_fee_total: input.platform_fee_total,
          months_count: input.months_count,
          total_rent: input.total_rent,
          currency: input.currency || 'XAF',
          status: input.status || 'active',
        },
      ]);

    if (error) {
      console.warn('[landlords] createRentalLease error', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[landlords] createRentalLease failed', error);
    return { success: false, error: String(error) };
  }
}

export async function updateListingStatus(listingId: string, status: string): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable');
    return { success: false, error: 'Supabase client unavailable' };
  }

  try {
    const client = supabase as SupabaseClient<Database>;
    console.log('[landlords] Updating listing', listingId, 'to status:', status);
    
    const { data, error } = await client
      .from('listings')
      .update({ status })
      .eq('id', listingId)
      .select();

    if (error) {
      console.warn('[landlords] updateListingStatus error', error);
      return { success: false, error: error.message };
    }

    console.log('[landlords] Listing updated successfully:', data);
    return { success: true };
  } catch (error) {
    console.error('[landlords] updateListingStatus failed', error);
    return { success: false, error: String(error) };
  }
}

export type TenantProfile = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  username: string | null;
};

export async function fetchTenantProfiles(searchQuery?: string): Promise<TenantProfile[]> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable');
    return [];
  }

  try {
    const client = supabase as SupabaseClient<Database>;
    let query = client
      .from('profiles')
      .select('id, first_name, last_name, phone, username')
      .not('phone', 'is', null);

    if (searchQuery) {
      const normalized = searchQuery.toLowerCase().trim();
      query = query.or(
        `first_name.ilike.%${normalized}%,last_name.ilike.%${normalized}%,phone.ilike.%${normalized}%,username.ilike.%${normalized}%`
      );
    }

    const { data, error } = await query.limit(10);

    if (error) {
      console.warn('[landlords] fetchTenantProfiles error', error);
      return [];
    }

    return (data ?? []).map((profile) => ({
      id: profile.id,
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      phone: profile.phone || '',
      username: profile.username,
    }));
  } catch (error) {
    console.error('[landlords] fetchTenantProfiles failed', error);
    return [];
  }
}

export type LandlordRentalMetrics = {
  landlordId: string;
  landlordName: string;
  landlordPhone: string | null;
  landlordCity: string | null;
  totalLeases: number;
  totalTenants: number;
  totalRevenue: number;
  avgMonthlyRevenue: number;
};

export type LandlordMetricsResult = {
  metricsMap: Map<string, LandlordRentalMetrics>;
  totalLandlordsCount: number;
};

export async function fetchLandlordRentalMetrics(): Promise<LandlordMetricsResult> {
  if (!supabase) {
    console.warn('[landlords] Supabase client unavailable');
    return { metricsMap: new Map(), totalLandlordsCount: 0 };
  }

  try {
    const client = supabase as SupabaseClient<Database>;
    
    // Récupérer le nombre total de landlords (profils avec statut landlord)
    const { count: landlordCount, error: countError } = await client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'landlord');

    if (countError) {
      console.warn('[landlords] fetchLandlordRentalMetrics error counting landlords', countError);
    }

    // Récupérer tous les baux
    const { data: leases, error: leasesError } = await client
      .from('rental_leases')
      .select('id, owner_profile_id, tenant_profile_id, total_rent, platform_fee_total, created_at');

    if (leasesError) {
      console.warn('[landlords] fetchLandlordRentalMetrics error fetching leases', leasesError);
      return { metricsMap: new Map(), totalLandlordsCount: landlordCount || 0 };
    }

    if (!leases || leases.length === 0) {
      console.log('[landlords] Aucun bail trouvé dans rental_leases');
      return { metricsMap: new Map(), totalLandlordsCount: landlordCount || 0 };
    }

    // Grouper par landlord et calculer les métriques
    const metricsMap = new Map<string, LandlordRentalMetrics & { tenantIds: Set<string> }>();

    (leases ?? []).forEach((lease: any) => {
      const landlordId = lease.owner_profile_id;
      
      if (!landlordId) {
        return;
      }

      const key = landlordId;
      const existing = metricsMap.get(key);

      if (existing) {
        existing.totalLeases += 1;
        existing.totalRevenue += lease.total_rent || 0;
        if (lease.tenant_profile_id) {
          existing.tenantIds.add(lease.tenant_profile_id);
        }
        existing.totalTenants = existing.tenantIds.size;
      } else {
        const tenantIds = new Set<string>();
        if (lease.tenant_profile_id) {
          tenantIds.add(lease.tenant_profile_id);
        }
        metricsMap.set(key, {
          landlordId,
          landlordName: 'Bailleur PUOL',
          landlordPhone: null,
          landlordCity: null,
          totalLeases: 1,
          totalTenants: tenantIds.size,
          totalRevenue: lease.total_rent || 0,
          avgMonthlyRevenue: (lease.total_rent || 0) / 12,
          tenantIds,
        });
      }
    });

    // Convertir en Map sans la propriété tenantIds
    const metricsMapClean = new Map<string, LandlordRentalMetrics>();
    metricsMap.forEach((metric, key) => {
      const { tenantIds, ...cleanMetric } = metric;
      metricsMapClean.set(key, cleanMetric);
    });
    
    console.log('[landlords] Métriques calculées:', metricsMapClean);
    return { metricsMap: metricsMapClean, totalLandlordsCount: landlordCount || 0 };
  } catch (error) {
    console.error('[landlords] fetchLandlordRentalMetrics failed', error);
    return { metricsMap: new Map(), totalLandlordsCount: 0 };
  }
}
