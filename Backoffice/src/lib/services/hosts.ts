import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '../supabaseClient';
import type { Database } from '../../types/supabase.generated';
import type {
  HostRequest,
  HostProfile,
  HostProfileDetail,
  HostListingDetail,
  HostReservationSummary,
  HostVisitSummary,
} from '@/components/admin/UsersManagement';
import { type VisitRecord } from '@/components/admin/VisitsManagement';
import { fetchLandlordListingDetail } from './landlords';

// Supabase table aliases
type ProfilesTable = Database['public']['Tables']['profiles']['Row'];

const HOST_ROLE: NonNullable<ProfilesTable['role']> = 'host';
const HOST_SUPPLY_ROLE: ProfilesTable['supply_role'] = 'host';
const HOST_PROFILE_FILTER = `role.eq.${HOST_ROLE},supply_role.eq.${HOST_SUPPLY_ROLE}`;
const DEFAULT_PLACEHOLDER = '—';

const EMPTY_STATS: HostStats = {
  activeHosts: 0,
  hostListings: 0,
  hostVisits: 0,
  pendingApplications: 0,
};

const VISIT_FEE_AMOUNT = 5000;

const SHORT_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

const client = supabase as SupabaseClient<Database> | null;

async function countRowsByColumn(
  client: SupabaseClient<Database>,
  table: keyof Database['public']['Tables'],
  column: string,
  value: string,
): Promise<number> {
  if (!value) {
    return 0;
  }

  const { count, error } = await (client.from(table as any) as any).select('id', { count: 'exact', head: true }).eq(column, value);
  if (error) {
    console.warn(`[hosts] countRowsByColumn error for ${String(table)}.${column}`, error);
    return 0;
  }

  return count ?? 0;
}

function computeNights(checkIn?: string | null, checkOut?: string | null): number {
  if (!checkIn || !checkOut) return 0;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

async function getHostProfileIds(): Promise<string[]> {
  if (!client) {
    return [];
  }

  try {
    const { data, error } = await client.from('profiles').select('id').or(HOST_PROFILE_FILTER);

    if (error) {
      console.warn('[hosts] getHostProfileIds error', error);
      return [];
    }

    return (data ?? []).map((profile) => profile.id).filter((id): id is string => Boolean(id));
  } catch (error) {
    console.warn('[hosts] getHostProfileIds failed', error);
    return [];
  }
}

export type HostStats = {
  activeHosts: number;
  hostListings: number;
  hostVisits: number;
  pendingApplications: number;
};

export type HostBoardListing = {
  id: string;
  title: string;
  city: string;
  district: string;
  propertyType: string;
  pricePerMonth: number | null;
  pricePerNight: number | null;
  hostId: string | null;
  hostName: string;
  createdAt: string | null;
  coverPhotoUrl: string | null;
  isAvailable: boolean;
  isFurnished?: boolean | null;
  statusRaw: string | null;
  rentalKind?: string | null;
  imagesCount: number;
  videosCount: number;
  visitsCount: number;
};

// Supabase table aliases (ProfilesTable already defined above)

type ListingsRow = Database['public']['Tables']['listings']['Row'];
type RentalVisitRow = Database['public']['Tables']['rental_visits']['Row'];
type HostApplicationRow = Database['public']['Tables']['host_applications']['Row'];
type HostApplicationProfile = Pick<
  ProfilesTable,
  'id' | 'first_name' | 'last_name' | 'phone' | 'city' | 'avatar_url' | 'role' | 'supply_role' | 'host_status' | 'is_certified'
> & { username: ProfilesTable['username'] };

type HostApplicationSupabaseRow = HostApplicationRow & {
  profile?: HostApplicationProfile | HostApplicationProfile[] | null;
};

type HostVisitGuest = Pick<ProfilesTable, 'first_name' | 'last_name' | 'phone'>;
type HostVisitListing = Pick<
  ListingsRow,
  'id' | 'host_id' | 'title' | 'city' | 'district' | 'property_type' | 'cover_photo_url' | 'is_available' | 'is_furnished' | 'created_at'
>;
type HostVisitHostProfile = Pick<ProfilesTable, 'id' | 'first_name' | 'last_name' | 'username' | 'phone' | 'city'>;

type HostVisitSupabaseRow = RentalVisitRow & {
  guest_profile?: HostVisitGuest | HostVisitGuest[] | null;
  rental_listing?: HostVisitListing | HostVisitListing[] | null;
};

type ListingFeatureCounts = {
  photos: number;
  videos: number;
};

type HostNameLookupRow = Pick<ProfilesTable, 'id' | 'first_name' | 'last_name' | 'username'>;
type HostProfileRow = Pick<
  ProfilesTable,
  'id' | 'first_name' | 'last_name' | 'username' | 'city' | 'created_at' | 'host_status' | 'avatar_url'
>;

function unwrapJoinedValue<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value.length ? value[0] ?? null : null;
  }

  return value ?? null;
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_PLACEHOLDER;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return DEFAULT_PLACEHOLDER;
  }

  return parsed.toLocaleDateString('fr-FR', SHORT_DATE_FORMAT);
}

function safeString(value: string | null | undefined, fallback = DEFAULT_PLACEHOLDER): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function buildFullName(firstName: string | null | undefined, lastName: string | null | undefined): {
  firstName: string;
  lastName: string;
  fullName: string;
} {
  const safeFirst = firstName?.trim() ?? '';
  const safeLast = lastName?.trim() ?? '';

  if (safeFirst || safeLast) {
    return {
      firstName: safeFirst || 'Candidat',
      lastName: safeLast || (safeFirst ? 'PUOL' : 'Hôte'),
      fullName: [safeFirst, safeLast].filter(Boolean).join(' '),
    };
  }

  return {
    firstName: 'Candidat',
    lastName: 'Hôte',
    fullName: 'Candidat hôte',
  };
}

function normalizeHostApplicationStatus(status: string | null): HostRequest['status'] {
  if (!status) {
    return 'pending';
  }

  const value = status.toLowerCase().trim();

  if (['approved', 'approuvé', 'approuve', 'validated', 'accepted', 'accepté'].some((keyword) => value.includes(keyword))) {
    return 'approved';
  }

  if (['rejected', 'reject', 'refus', 'declined', 'denied', 'refusé', 'refuse'].some((keyword) => value.includes(keyword))) {
    return 'rejected';
  }

  return 'pending';
}

function buildHostName(profile: HostNameLookupRow | null): string {
  if (!profile) {
    return 'Hôte PUOL';
  }

  const first = profile.first_name?.trim();
  const last = profile.last_name?.trim();
  const full = [first, last].filter(Boolean).join(' ');

  if (full.length > 0) {
    return full;
  }

  const username = profile.username?.trim();
  if (username && username.length > 0) {
    return username;
  }

  return 'Hôte PUOL';
}

function formatVisitDate(value: string | null): string {
  return formatDate(value);
}

function formatVisitTime(value: string | null): string {
  if (!value) {
    return DEFAULT_PLACEHOLDER;
  }

  const parts = value.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}h${parts[1]}`;
  }

  return value;
}

function formatFeeAmount(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} FCFA`;
}

function mapHostSegment(hostStatus: string | null | undefined): HostProfile['segment'] {
  if (!hostStatus) {
    return 'core';
  }

  const value = hostStatus.toLowerCase().trim();

  if (value.includes('premium') || value.includes('elite')) {
    return 'premium';
  }

  if (value.includes('lite') || value.includes('starter')) {
    return 'lite';
  }

  return 'core';
}

function buildHostProfileName(row: HostProfileRow): { name: string; username: string } {
  const first = row.first_name?.trim();
  const last = row.last_name?.trim();
  const name = [first, last].filter(Boolean).join(' ');
  const username = row.username?.trim() ?? `@${row.id}`;

  return {
    name: name.length ? name : 'Hôte PUOL',
    username,
  };
}

export async function fetchHostApplications(): Promise<HostRequest[]> {
  if (!client) {
    console.warn('[hosts] Supabase client unavailable, returning empty host applications');
    return [];
  }

  try {
    const { data, error } = await client
      .from('host_applications')
      .select(
        `
          id,
          profile_id,
          status,
          created_at,
          reviewed_at,
          profile:profiles!host_applications_profile_id_fkey (
            id,
            first_name,
            last_name,
            phone,
            city,
            avatar_url,
            username,
            role,
            supply_role,
            host_status,
            is_certified
          )
        `,
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[hosts] fetchHostApplications error', error);
      return [];
    }

    const rows: HostApplicationSupabaseRow[] = Array.isArray(data) ? data : [];

    return rows.map((row) => {
      const profile = unwrapJoinedValue(row.profile);
      const { firstName, lastName, fullName } = buildFullName(profile?.first_name, profile?.last_name);
      const profileId = row.profile_id ?? profile?.id ?? '';
      const effectiveStatus = normalizeHostApplicationStatus(profile?.host_status ?? row.status ?? null);

      return {
        id: row.id,
        profileId,
        fullName: fullName || `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        email: DEFAULT_PLACEHOLDER,
        phone: safeString(profile?.phone),
        city: safeString(profile?.city),
        unitsPortfolio: 0,
        propertyTypes: [],
        submittedAt: formatDate(row.created_at),
        motivation: '',
        documents: [],
        avatarUrl: profile?.avatar_url ?? '',
        status: effectiveStatus,
      } satisfies HostRequest;
    });
  } catch (error) {
    console.warn('[hosts] fetchHostApplications failed', error);
    return [];
  }
}

/**
 * Approuve une candidature host et met à jour le profil correspondant.
 * - host_applications.status = 'approved', reviewed_at = now
 * - profiles: role='host', supply_role='host', host_status='approved', is_certified=true
 */
export async function approveHostApplication(applicationId: string, profileId: string): Promise<boolean> {
  if (!client) {
    console.warn('[hosts] approveHostApplication skipped: no Supabase client');
    return false;
  }
  if (!applicationId || !profileId) {
    console.warn('[hosts] approveHostApplication skipped: missing identifiers', { applicationId, profileId });
    return false;
  }

  const nowIso = new Date().toISOString();

  const { error: appError } = await client
    .from('host_applications')
    .update({ status: 'approved', reviewed_at: nowIso })
    .eq('id', applicationId);
  if (appError) {
    console.warn('[hosts] approveHostApplication failed on host_applications', appError, { applicationId });
    return false;
  }

  const { error: profileError } = await client
    .from('profiles')
    .update({
      role: HOST_ROLE,
      supply_role: HOST_SUPPLY_ROLE,
      host_status: 'approved',
      is_certified: true,
    })
    .eq('id', profileId);

  if (profileError) {
    console.warn('[hosts] approveHostApplication failed on profiles', profileError, { profileId });
    return false;
  }

  return true;
}

/**
 * Refuse une candidature host et remet le profil à l’état “utilisateur” standard.
 * - host_applications.status = 'rejected', reviewed_at = now
 * - profiles: role='user', supply_role='none', host_status='rejected', is_certified=false
 */
export async function rejectHostApplication(applicationId: string, profileId: string): Promise<boolean> {
  if (!client) {
    console.warn('[hosts] rejectHostApplication skipped: no Supabase client');
    return false;
  }
  if (!applicationId || !profileId) {
    console.warn('[hosts] rejectHostApplication skipped: missing identifiers', { applicationId, profileId });
    return false;
  }

  const nowIso = new Date().toISOString();

  const { error: appError } = await client
    .from('host_applications')
    .update({ status: 'rejected', reviewed_at: nowIso })
    .eq('id', applicationId);
  if (appError) {
    console.warn('[hosts] rejectHostApplication failed on host_applications', appError, { applicationId });
    return false;
  }

  const { error: profileError } = await client
    .from('profiles')
    .update({
      role: 'guest',
      supply_role: 'none',
      host_status: 'rejected',
      is_certified: false,
    })
    .eq('id', profileId);

  if (profileError) {
    console.warn('[hosts] rejectHostApplication failed on profiles', profileError, { profileId });
    return false;
  }

  // Après notification de refus, on remet host_status à 'none' pour permettre une nouvelle demande
  setTimeout(async () => {
    const { error } = await client?.from('profiles').update({ host_status: 'none' }).eq('id', profileId);
    if (error) {
      console.warn('[hosts] rejectHostApplication reset host_status failed', error, { profileId });
    }
  }, 30_000); // 30s délai

  return true;
}

export async function fetchHostStats(): Promise<HostStats> {
  if (!client) {
    console.warn('[hosts] Supabase client unavailable, returning fallback stats');
    return {
      ...EMPTY_STATS,
      pendingApplications: 0,
    };
  }

  try {
    const hostIds = await getHostProfileIds();
    const activeHosts = hostIds.length;

    if (!hostIds.length) {
      return { ...EMPTY_STATS };
    }

    const [{ data: hostListings, error: listingsError }, { count: applicationsCount, error: applicationsError }] =
      await Promise.all([
        client
          .from('listings')
          .select('id, host_id')
          .in('host_id', hostIds),
        client
          .from('host_applications')
          .select('id', { count: 'exact', head: true })
          .in('profile_id', hostIds),
      ]);

    if (listingsError) {
      console.warn('[hosts] fetchHostStats listings lookup error', listingsError);
    }

    if (applicationsError) {
      console.warn('[hosts] fetchHostStats applications lookup error', applicationsError);
    }

    const listings = (hostListings ?? []).filter((listing): listing is Pick<ListingsRow, 'id' | 'host_id'> => Boolean(listing?.id));
    const listingIds = listings.map((listing) => listing.id).filter((id): id is string => Boolean(id));

    let hostVisits = 0;
    if (listingIds.length) {
      const { count: visitsCount, error: visitsError } = await client
        .from('rental_visits')
        .select('id', { count: 'exact', head: true })
        .in('rental_listing_id', listingIds);

      if (visitsError) {
        console.warn('[hosts] fetchHostStats visits lookup error', visitsError);
      } else {
        hostVisits = visitsCount ?? 0;
      }
    }

    return {
      activeHosts,
      hostListings: listingIds.length,
      hostVisits,
      pendingApplications: applicationsCount ?? 0,
    } satisfies HostStats;
  } catch (error) {
    console.warn('[hosts] fetchHostStats failed', error);
    return {
      ...EMPTY_STATS,
      pendingApplications: 0,
    };
  }
}

type HostListingRow = Pick<ListingsRow, 'id' | 'host_id' | 'property_type'>;

type BookingRow = Database['public']['Tables']['bookings']['Row'];

export type HostReservationRecord = {
  id: string;
  listingId: string;
  property: string;
  propertyType?: string | null;
  propertyImage?: string | null;
  hostName: string;
  hostPhone?: string | null;
  hostId?: string | null;
  tenant: string;
  tenantProfileId?: string | null;
  phone?: string | null;
  city?: string | null;
  district?: string | null;
  addressText?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  nights: number;
  pricePerNight?: number | null;
  deposit: number;
  total: number;
  discount: number;
  balance: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  timelineStatus: 'upcoming' | 'ongoing' | 'finished';
};

export async function fetchHostReservations(): Promise<HostReservationRecord[]> {
  if (!client) {
    console.warn('[hosts] Supabase client unavailable, returning empty host reservations');
    return [];
  }

  try {
    const { data: listingsData, error: listingsError } = await client
      .from('listings')
      .select('id, title, city, district, address_text, property_type, cover_photo_url, host_id, price_per_night')
      .not('host_id', 'is', null);

    if (listingsError) {
      console.warn('[hosts] fetchHostReservations listings error', listingsError);
    }

    const listings: ListingsRow[] = Array.isArray(listingsData) ? listingsData.filter((l): l is ListingsRow => Boolean(l?.id)) : [];
    const listingIds = listings.map((l) => l.id as string);
    if (!listingIds.length) return [];

    const { data: bookingsData, error: bookingsError } = await client
      .from('bookings')
      .select(
        'id, listing_id, guest_profile_id, checkin_date, checkout_date, total_price, currency, status, deposit_amount, remaining_amount, nightly_price, discount_amount',
      )
      .in('listing_id', listingIds);

    if (bookingsError) {
      console.warn('[hosts] fetchHostReservations bookings error', bookingsError);
    }

    const bookings: BookingRow[] = Array.isArray(bookingsData)
      ? (bookingsData as BookingRow[]).filter((b): b is BookingRow => Boolean(b?.id && b?.listing_id))
      : [];
    if (!bookings.length) return [];

    // Guest profiles
    const guestProfileIds = Array.from(
      new Set(bookings.map((b) => b.guest_profile_id?.trim()).filter((v): v is string => Boolean(v))),
    );
    const guestNameMap = new Map<string, { name: string; phone?: string | null }>();
    if (guestProfileIds.length) {
      const { data: guestsData, error: guestsError } = await client
        .from('profiles')
        .select('id, first_name, last_name, username, phone')
        .in('id', guestProfileIds);
      if (guestsError) {
        console.warn('[hosts] fetchHostReservations guest lookup error', guestsError);
      }
      (guestsData ?? []).forEach((guest) => {
        const full = buildFullName(guest.first_name, guest.last_name).fullName || guest.username || 'Voyageur';
        guestNameMap.set(guest.id as string, { name: full, phone: guest.phone });
      });
    }

    // Host profiles
    const hostIds = Array.from(new Set(listings.map((l) => l.host_id).filter((v): v is string => Boolean(v))));
    const hostNameMap = new Map<string, { name: string; phone?: string | null }>();
    if (hostIds.length) {
      const { data: hostsData, error: hostsError } = await client
        .from('profiles')
        .select('id, first_name, last_name, username, phone')
        .in('id', hostIds);
      if (hostsError) {
        console.warn('[hosts] fetchHostReservations host lookup error', hostsError);
      }
      (hostsData ?? []).forEach((host) => {
        const name = buildFullName(host.first_name, host.last_name).fullName || host.username || 'Hôte';
        hostNameMap.set(host.id as string, { name, phone: host.phone ?? null });
      });
    }

    const listingMap = new Map<string, ListingsRow>();
    listings.forEach((l) => listingMap.set(l.id as string, l));

    const mapStatus = (raw?: string | null): HostReservationRecord['status'] => {
      const n = raw?.toLowerCase().trim() ?? '';
      if (['confirm', 'valid'].some((k) => n.includes(k))) return 'confirmed';
      if (['cancel', 'refus', 'annul'].some((k) => n.includes(k))) return 'cancelled';
      return 'pending';
    };

    const computeTimelineStatus = (checkIn?: string | null, checkOut?: string | null): HostReservationRecord['timelineStatus'] => {
      if (!checkIn || !checkOut) return 'upcoming';
      const now = new Date();
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'upcoming';
      if (now < start) return 'upcoming';
      if (now >= start && now <= end) return 'ongoing';
      return 'finished';
    };

    const reservations = bookings.map((booking) => {
      const listing = listingMap.get(booking.listing_id as string);
      const hostMeta = listing?.host_id ? hostNameMap.get(listing.host_id) : null;
      const hostName = hostMeta?.name ?? 'Hôte PUOL';
      const hostPhone = hostMeta?.phone ?? null;
      const guest = guestNameMap.get(booking.guest_profile_id ?? '')?.name ?? 'Voyageur';
      const guestPhone = guestNameMap.get(booking.guest_profile_id ?? '')?.phone ?? null;
      const guestProfileId = booking.guest_profile_id ?? null;

      console.log('[fetchHostReservations] Mapping booking:', {
        bookingId: booking.id,
        guestProfileId,
        guestName: guest,
        rawGuestProfileId: booking.guest_profile_id,
      });

      const checkIn = booking.checkin_date ?? null;
      const checkOut = booking.checkout_date ?? null;
      const nights = computeNights(checkIn, checkOut);
      const bookingAny = booking as BookingRow & {
        nightly_price?: number | null;
        remaining_amount?: number | null;
        discount_amount?: number | null;
      };
      const pricePerNight = bookingAny.nightly_price ?? listing?.price_per_night ?? null;

      const total = typeof booking.total_price === 'number' ? booking.total_price : 0;
      const deposit = typeof booking.deposit_amount === 'number' ? booking.deposit_amount : 0;
      const remainingRaw = bookingAny.remaining_amount;
      const balance = typeof remainingRaw === 'number' ? remainingRaw : Math.max(total - deposit, 0);
      const discount = typeof bookingAny.discount_amount === 'number' ? bookingAny.discount_amount : 0;
      const timelineStatus = computeTimelineStatus(checkIn, checkOut);

      return {
        id: booking.id as string,
        listingId: booking.listing_id as string,
        property: listing?.title ?? 'Séjour PUOL',
        propertyType: listing?.property_type ?? null,
        propertyImage: listing?.cover_photo_url ?? null,
        hostName,
        hostPhone,
        hostId: listing?.host_id ?? null,
        tenant: guest,
        tenantProfileId: guestProfileId,
        phone: guestPhone,
        city: listing?.city ?? null,
        district: listing?.district ?? null,
        addressText: listing?.address_text ?? null,
        checkIn,
        checkOut,
        nights,
        pricePerNight,
        deposit,
        total,
        discount,
        balance,
        status: mapStatus(booking.status),
        timelineStatus,
      } satisfies HostReservationRecord;
    });

    // Trier par date d'arrivée (du plus récent au plus ancien)
    return reservations.sort((a, b) => {
      const dateA = a.checkIn ? new Date(a.checkIn).getTime() : 0;
      const dateB = b.checkIn ? new Date(b.checkIn).getTime() : 0;
      return dateB - dateA; // Plus récent en premier
    });
  } catch (error) {
    console.warn('[hosts] fetchHostReservations failed', error);
    return [];
  }
}
export async function fetchHostProfiles(): Promise<HostProfile[]> {
  if (!client) {
    console.warn('[hosts] Supabase client unavailable, returning empty host profiles');
    return [];
  }

  try {
    const { data, error } = await client
      .from('profiles')
      .select('id, first_name, last_name, username, city, created_at, host_status, avatar_url')
      .or(HOST_PROFILE_FILTER)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[hosts] fetchHostProfiles error', error);
      return [];
    }

    const rows: HostProfileRow[] = Array.isArray(data) ? data : [];
    if (!rows.length) {
      return [];
    }

    const hostIds = rows.map((row) => row.id).filter(Boolean);

    // Récupérer les listings associés aux hôtes
    const { data: listingsData, error: listingsError } = await client
      .from('listings')
      .select('id, host_id, property_type')
      .in('host_id', hostIds);

    if (listingsError) {
      console.warn('[hosts] fetchHostProfiles listings lookup error', listingsError);
    }

    const listings: HostListingRow[] = (listingsData ?? []).filter(
      (listing): listing is HostListingRow => Boolean(listing?.id && listing?.host_id),
    );
    const listingIds = listings.map((l) => l.id);

    // Récupérer les bookings liés aux listings hôtes
    const { data: bookingsData, error: bookingsError } = listingIds.length
      ? await client
          .from('bookings')
          .select('id, listing_id, guest_profile_id, checkin_date, checkout_date, total_price, currency, status')
          .in('listing_id', listingIds)
      : { data: [], error: null };

    if (bookingsError) {
      console.warn('[hosts] fetchHostProfiles bookings lookup error', bookingsError);
    }

    const bookings = (bookingsData ?? [])
      .map((b) => ({
        id: b?.id ?? '',
        listing_id: b?.listing_id ?? '',
        guest_profile_id: b?.guest_profile_id ?? null,
      }))
      .filter((b) => Boolean(b.id) && Boolean(b.listing_id));

    // Récupérer les visites liées aux listings hôtes
    const { data: visitsData, error: visitsError } = listingIds.length
      ? await client
          .from('rental_visits')
          .select('id, rental_listing_id')
          .in('rental_listing_id', listingIds)
      : { data: [], error: null };

    if (visitsError) {
      console.warn('[hosts] fetchHostProfiles visits lookup error', visitsError);
    }

    const visits = (visitsData ?? [])
      .map((v) => ({
        id: v?.id ?? '',
        rental_listing_id: v?.rental_listing_id ?? '',
      }))
      .filter((v) => Boolean(v.id) && Boolean(v.rental_listing_id));

    // Indexation
    const hostByListing = new Map<string, string>();
    listings.forEach((listing) => {
      if (listing.id && listing.host_id) {
        hostByListing.set(listing.id, listing.host_id);
      }
    });

    const hostIdsSet = new Set(hostIds);

    const listingsByHost = new Map<string, HostListingRow[]>();
    listings.forEach((listing) => {
      if (!listing.host_id) return;
      const arr = listingsByHost.get(listing.host_id) ?? [];
      arr.push(listing);
      listingsByHost.set(listing.host_id, arr);
    });

    const bookingsByHost = new Map<string, Pick<BookingRow, 'listing_id' | 'guest_profile_id'>[]>();
    const hostByBookingId = new Map<string, string>();
    bookings.forEach((booking) => {
      const hostId = hostByListing.get(booking.listing_id);
      if (!hostId) return;
      const arr = bookingsByHost.get(hostId) ?? [];
      arr.push(booking);
      bookingsByHost.set(hostId, arr);
      hostByBookingId.set(booking.id, hostId);
    });

    const hostByVisitId = new Map<string, string>();
    visits.forEach((visit) => {
      const hostId = hostByListing.get(visit.rental_listing_id);
      if (!hostId) return;
      hostByVisitId.set(visit.id, hostId);
    });

    // Paiements liés aux bookings/visites/listings/hosts
    const relatedIds = Array.from(
      new Set([...hostByBookingId.keys(), ...hostByVisitId.keys(), ...listingIds, ...hostIds]),
    );
    const { data: paymentsData, error: paymentsError } = relatedIds.length
      ? await client
          .from('payments')
          .select('id, amount, related_id')
          .in('related_id', relatedIds)
      : { data: [], error: null };

    if (paymentsError) {
      console.warn('[hosts] fetchHostProfiles payments lookup error', paymentsError);
    }

    const hostRevenueBrut = new Map<string, number>();
    (paymentsData ?? []).forEach((payment: { id?: string | null; amount?: number | null; related_id?: string | null }) => {
      const relId = payment.related_id ?? '';
      const amount = payment.amount ?? 0;
      const hostId =
        hostByBookingId.get(relId) ??
        hostByVisitId.get(relId) ??
        hostByListing.get(relId) ??
        (hostIdsSet.has(relId) ? relId : undefined);
      if (!hostId) return;
      hostRevenueBrut.set(hostId, (hostRevenueBrut.get(hostId) ?? 0) + amount);
    });

    return rows
      .map((row) => {
        const { name, username } = buildHostProfileName(row);
        const joinedAt = row.created_at ? new Date(row.created_at).getFullYear().toString() : '—';

        const hostListings = listingsByHost.get(row.id) ?? [];
        const hostBookings = bookingsByHost.get(row.id) ?? [];

        // Types de biens uniques
        const propertyTags = Array.from(
          new Set(
            hostListings
              .map((l) => l.property_type?.trim())
              .filter((v): v is string => Boolean(v && v.length > 0)),
          ),
        );

        // Séjours = bookings liés aux listings de l'hôte
        const staysHosted = hostBookings.length;

        // Invités = distinct guest_profile_id
        const guestsSupported = Array.from(
          new Set(
            hostBookings
              .map((b) => b.guest_profile_id?.trim())
              .filter((v): v is string => Boolean(v && v.length > 0)),
          ),
        ).length;

        const listingsActive = hostListings.length;
        const revenueBrut = hostRevenueBrut.get(row.id) ?? 0;
        const revenueShare = revenueBrut;

        // Normaliser le statut du host
        const hostStatus = normalizeHostApplicationStatus(row.host_status);

        return {
          id: row.id,
          name,
          username,
          segment: mapHostSegment(row.host_status),
          city: row.city?.trim() || '—',
          staysHosted,
          listingsActive,
          guestsSupported,
          revenueShare,
          joinedAt,
          propertyTags,
          avatarUrl: row.avatar_url ?? null,
          status: hostStatus,
        } satisfies HostProfile;
      })
      .filter((host) => host.status === 'approved');
  } catch (error) {
    console.warn('[hosts] fetchHostProfiles failed', error);
    return [];
  }
}

export async function fetchHostProfileDetail(hostId: string): Promise<HostProfileDetail | null> {
  if (!client || !hostId) {
    console.warn('[hosts] Supabase client unavailable or missing hostId, returning null profile detail');
    return null;
  }

  try {
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, first_name, last_name, username, city, phone, avatar_url, created_at, host_status')
      .eq('id', hostId)
      .single();

    if (profileError) {
      console.warn('[hosts] fetchHostProfileDetail profile error', profileError);
      return null;
    }

    if (!profile?.id) {
      return null;
    }

    const { data: listingsData, error: listingsError } = await client
      .from('listings')
      .select(
        'id, title, city, property_type, cover_photo_url, price_per_month, price_per_night, status, is_available, created_at, host_id',
      )
      .eq('host_id', hostId)
      .order('created_at', { ascending: false });

    if (listingsError) {
      console.warn('[hosts] fetchHostProfileDetail listings error', listingsError);
    }

    const listings = (listingsData ?? []).filter((listing): listing is ListingsRow => Boolean(listing?.id));
    const listingIds = listings.map((listing) => listing.id).filter((id): id is string => Boolean(id));

    const visitsCountMap = new Map<string, number>();
    if (listingIds.length) {
      const { data: visitsData, error: visitsError } = await client
        .from('rental_visits')
        .select('rental_listing_id')
        .in('rental_listing_id', listingIds);

      if (visitsError) {
        console.warn('[hosts] fetchHostProfileDetail visits lookup error', visitsError);
      }

      (visitsData ?? []).forEach((visit) => {
        const listingId = visit.rental_listing_id;
        if (!listingId) {
          return;
        }
        visitsCountMap.set(listingId, (visitsCountMap.get(listingId) ?? 0) + 1);
      });
    }

    const { data: visitsDetailsData, error: visitsDetailsError } = listingIds.length
      ? await client
          .from('rental_visits')
          .select(
            `
            id,
            visit_date,
            visit_time,
            status,
            rental_listing: listings!rental_visits_rental_listing_id_fkey (
              id,
              price_per_night,
              price_per_month
            ),
            guest_profile: profiles!rental_visits_guest_profile_id_fkey (
              id,
              first_name,
              last_name,
              username
            )
          `,
          )
          .in('rental_listing_id', listingIds)
          .order('visit_date', { ascending: false })
          .order('visit_time', { ascending: false })
      : { data: [], error: null };

    if (visitsDetailsError) {
      console.warn('[hosts] fetchHostProfileDetail visits detail error', visitsDetailsError);
    }

    const { data: bookingsData, error: bookingsError } = listingIds.length
      ? await client
          .from('bookings')
          .select('id, listing_id, guest_profile_id, checkin_date, checkout_date, total_price, currency, status')
          .in('listing_id', listingIds)
      : { data: [], error: null };

    if (bookingsError) {
      console.warn('[hosts] fetchHostProfileDetail bookings lookup error', bookingsError);
    }

    type HostBookingRow = Pick<
      BookingRow,
      'id' | 'listing_id' | 'guest_profile_id' | 'checkin_date' | 'checkout_date' | 'total_price' | 'currency' | 'status'
    >;

    const bookings: HostBookingRow[] = (bookingsData ?? [])
      .map((booking) => ({
        id: booking?.id ?? '',
        listing_id: booking?.listing_id ?? '',
        guest_profile_id: booking?.guest_profile_id ?? '',
        checkin_date: booking?.checkin_date ?? null,
        checkout_date: booking?.checkout_date ?? null,
        total_price: booking?.total_price ?? null,
        currency: booking?.currency ?? null,
        status: booking?.status ?? null,
      }))
      .filter((b): b is HostBookingRow => Boolean(b.id) && Boolean(b.listing_id));

    const guestProfileIds = Array.from(
      new Set(bookings.map((b) => b.guest_profile_id?.trim()).filter((v): v is string => Boolean(v && v.length))),
    );

    const guestNameMap = new Map<string, string>();
    if (guestProfileIds.length) {
      const { data: guestsData, error: guestsError } = await client
        .from('profiles')
        .select('id, first_name, last_name, username')
        .in('id', guestProfileIds);

      if (guestsError) {
        console.warn('[hosts] fetchHostProfileDetail guest lookup error', guestsError);
      }

      (guestsData ?? []).forEach((guest) => {
        const full = buildFullName(guest.first_name, guest.last_name).fullName;
        guestNameMap.set(guest.id as string, full || guest.username || 'Client PUOL');
      });
    }

    const engagements = await Promise.all(
      listings.map(async (listing) => {
        const [views, likes, comments] = await Promise.all([
          countRowsByColumn(client, 'listing_views', 'listing_id', listing.id as string),
          countRowsByColumn(client, 'listing_likes', 'listing_id', listing.id as string),
          countRowsByColumn(client, 'listing_comments', 'listing_id', listing.id as string),
        ]);
        const visits = visitsCountMap.get(listing.id as string) ?? 0;
        return { listingId: listing.id as string, views, likes, comments, visits };
      }),
    );

    const engagementMap = new Map(engagements.map((item) => [item.listingId, item]));

    const viewsTotal = engagements.reduce((sum, item) => sum + item.views, 0);
    const likesTotal = engagements.reduce((sum, item) => sum + item.likes, 0);
    const commentsTotal = engagements.reduce((sum, item) => sum + item.comments, 0);

    const { data: reviewsData, error: reviewsError } = listingIds.length
      ? await client.from('reviews').select('rating, listing_id').in('listing_id', listingIds)
      : { data: [], error: null };

    if (reviewsError) {
      console.warn('[hosts] fetchHostProfileDetail reviews lookup error', reviewsError);
    }

    const reviewsCountMap = new Map<string, number>();
    const ratings = (reviewsData ?? [])
      .map((review) => {
        const listingId = (review as { listing_id?: string })?.listing_id ?? '';
        if (listingId) {
          reviewsCountMap.set(listingId, (reviewsCountMap.get(listingId) ?? 0) + 1);
        }
        return (review as { rating?: number })?.rating;
      })
      .filter((value): value is number => typeof value === 'number');
    const reviewsCount = ratings.length;
    const avgRating = reviewsCount ? ratings.reduce((sum, value) => sum + value, 0) / reviewsCount : 0;

    const hostBookings = bookings;
    const staysHosted = hostBookings.length;
    const guestsSupported = Array.from(
      new Set(hostBookings.map((b) => b.guest_profile_id?.trim()).filter((v): v is string => Boolean(v && v.length))),
    ).length;
    const listingsActive = listings.length;

    const propertyTags = Array.from(
      new Set(
        listings
          .map((l) => l.property_type?.trim())
          .filter((v): v is string => Boolean(v && v.length > 0)),
      ),
    );

    const name = buildHostName({
      id: profile.id,
      first_name: profile.first_name,
      last_name: profile.last_name,
      username: profile.username,
    });

    const joinedAt = profile.created_at ? new Date(profile.created_at).getFullYear().toString() : '—';

    const listingsHighlights = listings.map((listing) => {
      const engagement = engagementMap.get(listing.id as string);
      const views = engagement?.views ?? 0;
      const likes = engagement?.likes ?? 0;
      const comments = engagement?.comments ?? 0;
      const reviews = reviewsCountMap.get(listing.id as string) ?? 0;

      const nightlyPrice = listing.price_per_night ?? null;
      const revenueLabel =
        typeof nightlyPrice === 'number'
          ? `${nightlyPrice.toLocaleString('fr-FR')} FCFA`
          : listing.price_per_month
            ? `${listing.price_per_month.toLocaleString('fr-FR')} FCFA`
            : '—';

      return {
        id: listing.id ?? '',
        title: safeString(listing.title, 'Annonce PUOL'),
        city: safeString(listing.city),
        type: safeString(listing.property_type, 'Bien'),
        coverUrl: listing.cover_photo_url ?? '',
        revenue: `${revenueLabel} /nuit`,
        views,
        likes,
        comments,
        reviews,
      };
    });

    const visits: HostVisitSummary[] = (visitsDetailsData ?? []).map((visit: any) => {
      const guestProfile = unwrapJoinedValue(visit.guest_profile);
      const guestName = buildFullName(guestProfile?.first_name, guestProfile?.last_name).fullName || 'Visiteur';

      const date = formatDate(visit.visit_date ?? null);
      const timeRaw = visit.visit_time as string | null;
      const period = formatVisitTime(timeRaw);

      const amount = formatFeeAmount(VISIT_FEE_AMOUNT);

      const statusRaw = visit.status?.toLowerCase().trim() ?? '';
      const status: HostVisitSummary['status'] =
        ['confirm', 'valid', 'accept'].some((k) => statusRaw.includes(k))
          ? 'confirmed'
          : ['cancel', 'refus', 'annul'].some((k) => statusRaw.includes(k))
            ? 'cancelled'
            : 'pending';

      return {
        id: visit.id ?? '',
        guest: guestName,
        date,
        period,
        amount,
        status,
      };
    });

    const reservations = hostBookings.map((booking) => {
      const guestName = guestNameMap.get(booking.guest_profile_id) ?? 'Client PUOL';
      const stayStart = formatDate(booking.checkin_date);
      const stayEnd = formatDate(booking.checkout_date);
      const stay = booking.checkin_date || booking.checkout_date ? `${stayStart} - ${stayEnd}` : '—';
      const currency = booking.currency?.trim() || 'FCFA';
      const amount =
        typeof booking.total_price === 'number'
          ? `${booking.total_price.toLocaleString('fr-FR')} ${currency}`
          : '—';

      const statusRaw = booking.status?.toLowerCase().trim() ?? '';
      const status: HostReservationSummary['status'] =
        ['confirm', 'valid', 'accept'].some((k) => statusRaw.includes(k))
          ? 'confirmée'
          : ['litig', 'disput', 'issue'].some((k) => statusRaw.includes(k))
            ? 'en litige'
            : 'à confirmer';

      return {
        id: booking.id,
        guest: guestName,
        stay,
        amount,
        status,
      };
    });

    const timeline = [
      {
        id: `${hostId}-created`,
        date: formatDate(profile.created_at),
        label: 'Profil créé',
        detail: 'Compte hôte créé dans Supabase',
        type: 'quality' as const,
      },
      {
        id: `${hostId}-listings`,
        date: formatDate(listings[0]?.created_at ?? profile.created_at),
        label: 'Annonces publiées',
        detail: `${listingsActive} annonce(s) associée(s)`,
        type: 'reservation' as const,
      },
    ];

    return {
      id: profile.id,
      name,
      username: profile.username?.trim() || `@${profile.id}`,
      segment: mapHostSegment(profile.host_status),
      city: safeString(profile.city),
      staysHosted,
      listingsActive,
      guestsSupported,
      revenueShare: 0,
      joinedAt,
      propertyTags,
      avatarUrl: profile.avatar_url ?? '',
      email: 'Disponible via concierge PUOL',
      phone: safeString(profile.phone),
      address: safeString(profile.city),
      responseTime: '—',
      satisfactionScore: avgRating,
      acceptanceRate: 0,
      notes: 'Données Supabase pour cet hôte.',
      tags: propertyTags.length ? propertyTags : ['Hôte PUOL'],
      reviewsCount,
      stats: {
        guests: guestsSupported,
        nights: staysHosted,
        rating: avgRating,
        payout: '—',
      },
      engagement: {
        views: viewsTotal,
        likes: likesTotal,
        comments: commentsTotal,
      },
      listings: listingsHighlights,
      reservations,
      visits,
      timeline,
    };
  } catch (error) {
    console.warn('[hosts] fetchHostProfileDetail failed', error);
    return null;
  }
}

export async function fetchHostListingsLive(): Promise<HostBoardListing[]> {
  if (!client) {
    console.warn('[hosts] Supabase client unavailable, returning empty host listings');
    return [];
  }

  try {
    const hostIds = await getHostProfileIds();
    if (!hostIds.length) {
      return [];
    }

    const { data, error } = await client
      .from('listings')
      .select(
        `
          id,
          title,
          city,
          district,
          property_type,
          price_per_month,
          price_per_night,
          host_id,
          created_at,
          cover_photo_url,
          status,
          is_available,
          is_furnished,
          rental_kind
        `,
      )
      .in('host_id', hostIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[hosts] fetchHostListingsLive error', error);
      return [];
    }

    const listings = (data ?? []).filter((item): item is ListingsRow => Boolean(item?.id));
    if (!listings.length) {
      return [];
    }

    const listingIds = listings.map((listing) => listing.id).filter((id): id is string => Boolean(id));
    const listingHostIds = Array.from(
      new Set(listings.map((listing) => listing.host_id).filter((id): id is string => Boolean(id))),
    );

    const hostNameMap = new Map<string, string>();
    if (listingHostIds.length) {
      const { data: hostsData, error: hostsError } = await client
        .from('profiles')
        .select('id, first_name, last_name, username')
        .in('id', listingHostIds);

      if (hostsError) {
        console.warn('[hosts] fetchHostListingsLive host lookup error', hostsError);
      }

      (hostsData ?? []).forEach((host) => {
        hostNameMap.set(host.id, buildHostName(host));
      });
    }

    const mediaCountMap = new Map<string, ListingFeatureCounts>();
    if (listingIds.length) {
      const { data: mediaData, error: mediaError } = await client
        .from('listing_media')
        .select('listing_id, media_type')
        .in('listing_id', listingIds);

      if (mediaError) {
        console.warn('[hosts] fetchHostListingsLive media lookup error', mediaError);
      }

      (mediaData ?? []).forEach((media) => {
        const listingId = media.listing_id;
        if (!listingId) {
          return;
        }
        const entry = mediaCountMap.get(listingId) ?? { photos: 0, videos: 0 };
        const type = media.media_type?.toLowerCase() ?? '';
        if (type.includes('video')) {
          entry.videos += 1;
        } else {
          entry.photos += 1;
        }
        mediaCountMap.set(listingId, entry);
      });
    }

    const visitsCountMap = new Map<string, number>();
    if (listingIds.length) {
      const { data: visitsData, error: visitsError } = await client
        .from('rental_visits')
        .select('rental_listing_id')
        .in('rental_listing_id', listingIds);

      if (visitsError) {
        console.warn('[hosts] fetchHostListingsLive visits lookup error', visitsError);
      }

      (visitsData ?? []).forEach((visit) => {
        const listingId = visit.rental_listing_id;
        if (!listingId) {
          return;
        }
        visitsCountMap.set(listingId, (visitsCountMap.get(listingId) ?? 0) + 1);
      });
    }

    return listings.map((listing) => ({
      id: listing.id,
      title: safeString(listing.title, 'Annonce PUOL'),
      city: safeString(listing.city),
      district: safeString(listing.district),
      propertyType: safeString(listing.property_type, 'Bien'),
      pricePerMonth: listing.price_per_month ?? null,
      pricePerNight: listing.price_per_night ?? null,
      hostId: listing.host_id,
      hostName: listing.host_id ? hostNameMap.get(listing.host_id) ?? 'Hôte PUOL' : 'Hôte PUOL',
      createdAt: listing.created_at ?? null,
      coverPhotoUrl: listing.cover_photo_url ?? null,
      isAvailable: listing.is_available ?? false,
      isFurnished: listing.is_furnished ?? null,
      statusRaw: listing.status ?? null,
      imagesCount: mediaCountMap.get(listing.id)?.photos ?? 0,
      videosCount: mediaCountMap.get(listing.id)?.videos ?? 0,
      visitsCount: visitsCountMap.get(listing.id) ?? 0,
    } satisfies HostBoardListing));
  } catch (error) {
    console.warn('[hosts] fetchHostListingDetail unexpected error', error);
    return [];
  }
}

export async function fetchHostListingDetail(listingId: string): Promise<HostListingDetail | null> {
  try {
    const detail = await fetchLandlordListingDetail(listingId);
    if (!detail) {
      return null;
    }

    return {
      ...detail,
      ownerLabel: 'Hôte',
    };
  } catch (error) {
    console.warn('[hosts] fetchHostListingDetail wrapper failed', error);
    return null;
  }
}

export async function fetchHostVisits(): Promise<VisitRecord[]> {
  if (!client) {
    console.warn('[hosts] Supabase client unavailable, returning empty host visits');
    return [];
  }

  try {
    const hostIds = await getHostProfileIds();
    if (!hostIds.length) {
      return [];
    }

    const { data, error } = await client
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
          district,
          property_type,
          cover_photo_url,
          is_furnished,
          is_available
        )
      `,
      )
      .not('rental_listing.host_id', 'is', null)
      .in('rental_listing.host_id', hostIds)
      .order('visit_date', { ascending: false })
      .order('visit_time', { ascending: false });

    if (error) {
      console.warn('[hosts] fetchHostVisits error', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    const rows: HostVisitSupabaseRow[] = data as HostVisitSupabaseRow[];

    const mappedVisitsWithHost = rows
      .map((visit) => {
        const listing = unwrapJoinedValue(visit.rental_listing);
        if (!listing) {
          return null;
        }

        const guestProfile = unwrapJoinedValue(visit.guest_profile);
        const visitorName = buildFullName(guestProfile?.first_name, guestProfile?.last_name).fullName;

        return {
          id: visit.id,
          property: safeString(listing.title, 'Annonce PUOL'),
          propertyImage: listing.cover_photo_url ?? null,
          propertyType: listing.property_type ?? null,
          visitor: visitorName,
          date: formatVisitDate(visit.visit_date ?? null),
          time: formatVisitTime(visit.visit_time ?? null),
          status: mapVisitStatus(visit.status),
          paymentStatus: mapVisitPaymentStatus(visit.status),
          amount: formatFeeAmount(VISIT_FEE_AMOUNT),
          phone: guestProfile?.phone ?? DEFAULT_PLACEHOLDER,
          city: safeString(listing.city),
          hostId: listing.host_id ?? null,
        } as VisitRecord & { hostId: string | null };
      })
      .filter((item): item is VisitRecord & { hostId: string | null } => Boolean(item));

    const hostProfileIds = Array.from(
      new Set(mappedVisitsWithHost.map((visit) => visit.hostId).filter((id): id is string => Boolean(id))),
    );

    const { data: hostProfiles, error: hostLookupError } = hostProfileIds.length
      ? await client.from('profiles').select('id, first_name, last_name, username, phone, city').in('id', hostProfileIds)
      : { data: [], error: null };

    if (hostLookupError) {
      console.warn('[hosts] fetchHostVisits host lookup error', hostLookupError);
    }

    const hostMap = new Map<string, HostVisitHostProfile>(
      (hostProfiles ?? []).map((profile) => [profile.id as string, profile as HostVisitHostProfile]),
    );

    const mapped: VisitRecord[] = mappedVisitsWithHost.map((visit) => {
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
        landlordName: buildHostName(host ?? null),
        landlordPhone: host?.phone ?? '—',
        landlordId: host?.id ?? undefined,
        landlordCity: host?.city ?? undefined,
        landlordUsername: host?.username ?? undefined,
      } satisfies VisitRecord;
    });

    return mapped;
  } catch (error) {
    console.warn('[hosts] fetchHostVisits failed', error);
    return [];
  }
}

function mapVisitStatus(rawStatus: string | null | undefined): VisitRecord['status'] {
  const value = rawStatus?.toLowerCase().trim();
  if (!value) {
    return 'pending';
  }

  if (['confirm', 'valid', 'accept'].some((keyword) => value.includes(keyword))) {
    return 'confirmed';
  }

  if (['cancel', 'refus', 'annul'].some((keyword) => value.includes(keyword))) {
    return 'cancelled';
  }

  return 'pending';
}

function mapVisitPaymentStatus(rawStatus: string | null | undefined): VisitRecord['paymentStatus'] {
  const value = rawStatus?.toLowerCase().trim();
  if (!value) {
    return 'pending';
  }

  if (['confirm', 'pay', 'valid'].some((keyword) => value.includes(keyword))) {
    return 'paid';
  }

  if (['refund', 'rembours'].some((keyword) => value.includes(keyword))) {
    return 'refunded';
  }

  return 'pending';
}
