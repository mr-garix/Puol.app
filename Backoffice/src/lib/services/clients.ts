import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '../supabaseClient';
import type { Database } from '../../types/supabase.generated';
import type { ClientProfileDetail, ClientProfileRecord, ClientVisitRecord } from '@/components/admin/UsersManagement';

type ProfilesTable = Database['public']['Tables']['profiles']['Row'];
type BookingRow = Database['public']['Tables']['bookings']['Row'];
type RentalVisitRow = Database['public']['Tables']['rental_visits']['Row'];
type ReviewRow = Database['public']['Tables']['reviews']['Row'];
type ListingRow = Database['public']['Tables']['listings']['Row'];
type ListingLikeRow = Database['public']['Tables']['listing_likes']['Row'];
type ListingCommentRow = Database['public']['Tables']['listing_comments']['Row'];

const CLIENT_ROLES: Array<NonNullable<ProfilesTable['role']>> = ['client', 'guest', 'host', 'landlord'];
const SAFE_SEGMENTS: ClientProfileRecord['segment'][] = ['premium', 'core', 'lite'];
const FALLBACK_SEGMENT: ClientProfileRecord['segment'] = 'core';

const client = supabase as SupabaseClient<Database> | null;

function safeString(value: string | null | undefined, fallback = '—'): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

type ClientVisitRow = RentalVisitRow & {
  rental_listing?: Pick<ListingRow, 'title' | 'city'> | Pick<ListingRow, 'title' | 'city'>[] | null;
};

export async function fetchClientProfileDetail(profileId: string): Promise<ClientProfileDetail | null> {
  if (!client || !profileId) {
    return null;
  }

  try {
    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id, first_name, last_name, username, city, phone, avatar_url, role, supply_role, created_at')
      .eq('id', profileId)
      .single();

    if (profileError || !profile?.id) {
      console.warn('[clients] fetchClientProfileDetail profile error', profileError);
      return null;
    }

    const { data: bookingsData, error: bookingsError } = await client
      .from('bookings')
      .select('id, guest_profile_id, status')
      .eq('guest_profile_id', profileId);

    if (bookingsError) {
      console.warn('[clients] fetchClientProfileDetail bookings error', bookingsError);
    }

    const bookings: BookingRow[] = Array.isArray(bookingsData)
      ? (bookingsData as BookingRow[]).filter((b): b is BookingRow => Boolean(b?.id))
      : [];

    const reservations = bookings.length;
    const leases = 0; // pas de colonne dédiée pour les baux signés côté client
    const nights = 0; // non utilisé côté client

    // Récupérer les dépenses réelles du client depuis la table payments
    const { data: clientPaymentsData, error: clientPaymentsError } = await client
      .from('payments')
      .select('amount')
      .eq('payer_profile_id', profileId);

    if (clientPaymentsError) {
      console.warn('[clients] fetchClientProfileDetail payments error', clientPaymentsError);
    }

    const spend = (clientPaymentsData as Array<{ amount?: number | null }> | null | undefined)?.reduce(
      (sum, payment) => sum + (typeof payment.amount === 'number' ? payment.amount : 0),
      0
    ) ?? 0;

    const { data: visitsData, error: visitsError } = await client
      .from('rental_visits')
      .select(
        `
        id,
        visit_date,
        visit_time,
        status,
        rental_listing:listings!rental_visits_rental_listing_id_fkey (
          title,
          city
        ),
        guest_profile_id
      `,
      )
      .eq('guest_profile_id', profileId);

    if (visitsError) {
      console.warn('[clients] fetchClientProfileDetail visits error', visitsError);
    }

    const visits: ClientVisitRecord[] = (visitsData as ClientVisitRow[] | null | undefined)?.map((visit) => {
      const listing = Array.isArray(visit.rental_listing)
        ? visit.rental_listing[0]
        : (visit.rental_listing as Pick<ListingRow, 'title' | 'city'> | null | undefined);
      return {
        id: visit.id,
        property: listing?.title ?? 'Annonce PUOL',
        city: listing?.city ?? '—',
        date: formatLastStay(visit.visit_date),
        hour: visit.visit_time ?? '—',
        status: 'en attente',
        agent: '—',
        notes: '',
      } satisfies ClientVisitRecord;
    }) ?? [];

    const visitsCount = visits.length;

    const { data: reviewsData, error: reviewsError } = await client
      .from('reviews')
      .select('author_id, rating')
      .eq('author_id', profileId);

    if (reviewsError) {
      console.warn('[clients] fetchClientProfileDetail reviews error', reviewsError);
    }

    const ratings = (reviewsData as ReviewRow[] | null | undefined)
      ?.map((review) => review.rating)
      .filter((value): value is number => typeof value === 'number') ?? [];
    const satisfaction = ratings.length ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
    const reviewsCount = ratings.length;

    const { data: likesData, error: likesError } = await client
      .from('listing_likes')
      .select('id')
      .eq('profile_id', profileId);
    if (likesError) {
      console.warn('[clients] fetchClientProfileDetail likes error', likesError);
    }
    const likes = Array.isArray(likesData) ? (likesData as ListingLikeRow[]).length : 0;

    const { data: commentsData, error: commentsError } = await client
      .from('listing_comments')
      .select('id')
      .eq('profile_id', profileId);
    if (commentsError) {
      console.warn('[clients] fetchClientProfileDetail comments error', commentsError);
    }
    const comments = Array.isArray(commentsData) ? (commentsData as ListingCommentRow[]).length : 0;

    const segment = mapSegment(profile.supply_role ?? profile.role ?? null);
    const loyaltyTier: ClientProfileDetail['loyaltyTier'] =
      segment === 'premium' ? 'elite' : segment === 'core' ? 'prime' : 'core';

    const detail: ClientProfileDetail = {
      id: profile.id as string,
      fullName: buildFullName(profile.first_name, profile.last_name),
      username: safeString(profile.username, `@${profile.id}`),
      segment,
      city: safeString(profile.city),
      phone: safeString(profile.phone),
      reservations,
      nights,
      spend,
      satisfaction,
      lastStay: '—',
      status: mapStatus(profile.role ?? null),
      visitsBooked: visitsCount,
      leasesSigned: leases,
      avatarUrl: profile.avatar_url ?? '',
      joinedAt: profile.created_at ? new Date(profile.created_at).getFullYear().toString() : '—',
      verified: false,
      loyaltyTier,
      preferences: [],
      lifestyleTags: [],
      notes: 'Données Supabase pour ce client.',
      stats: {
        reservations,
        nights,
        spend,
        visits: visitsCount,
        leases,
        satisfaction,
        reviewsCount,
        comments,
        likes,
        followers: 0,
        favoriteCities: 0,
      },
      visitsHistory: visits,
      leasesHistory: [],
      timeline: [],
    };

    return detail;
  } catch (error) {
    console.warn('[clients] fetchClientProfileDetail failed', error);
    return null;
  }
}

function buildFullName(first?: string | null, last?: string | null): string {
  const parts = [first?.trim(), last?.trim()].filter(Boolean) as string[];
  return parts.length ? parts.join(' ') : 'Client PUOL';
}

function mapSegment(raw?: string | null): ClientProfileRecord['segment'] {
  const normalized = raw?.toLowerCase().trim();
  if (normalized && SAFE_SEGMENTS.includes(normalized as ClientProfileRecord['segment'])) {
    return normalized as ClientProfileRecord['segment'];
  }
  return FALLBACK_SEGMENT;
}

function mapStatus(raw?: string | null): ClientProfileRecord['status'] {
  const normalized = raw?.toLowerCase().trim();
  if (!normalized) return 'actif';
  if (normalized.includes('risk') || normalized.includes('risque')) return 'à risque';
  if (normalized.includes('suspend')) return 'suspendu';
  return 'actif';
}

function formatLastStay(date: string | null | undefined): string {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function fetchClientProfiles(): Promise<ClientProfileRecord[]> {
  if (!client) {
    console.warn('[clients] Supabase client unavailable, returning empty clients');
    return [];
  }

  try {
    const { data: profiles, error: profilesError } = await client
      .from('profiles')
      .select('id, first_name, last_name, username, city, phone, avatar_url, role, supply_role')
      .in('role', CLIENT_ROLES);

    if (profilesError) {
      console.warn('[clients] fetchClientProfiles profiles error', profilesError);
      return [];
    }

    const profileRows: ProfilesTable[] = Array.isArray(profiles)
      ? (profiles as ProfilesTable[]).filter((p): p is ProfilesTable => Boolean((p as ProfilesTable).id))
      : [];
    if (!profileRows.length) {
      return [];
    }

    const clientIds = profileRows.map((p) => p.id as string);

    const { data: bookings, error: bookingsError } = await client
      .from('bookings')
      .select('id, guest_profile_id, checkin_date, checkout_date, total_price, status')
      .in('guest_profile_id', clientIds);

    if (bookingsError) {
      console.warn('[clients] fetchClientProfiles bookings error', bookingsError);
    }

    const bookingRows: BookingRow[] = Array.isArray(bookings)
      ? (bookings as BookingRow[]).filter((b): b is BookingRow => Boolean(b?.id && b?.guest_profile_id))
      : [];

    const bookingMap = new Map<string, BookingRow[]>();
    bookingRows.forEach((booking) => {
      const key = booking.guest_profile_id as string;
      if (!key) return;
      bookingMap.set(key, [...(bookingMap.get(key) ?? []), booking]);
    });

    const { data: visitsData, error: visitsError } = await client
      .from('rental_visits')
      .select('id, guest_profile_id')
      .in('guest_profile_id', clientIds);

    if (visitsError) {
      console.warn('[clients] fetchClientProfiles visits lookup error', visitsError);
    }

    const visitsCountMap = new Map<string, number>();
    (visitsData as RentalVisitRow[] | null | undefined)?.forEach((visit) => {
      const key = visit.guest_profile_id as string;
      if (!key) return;
      visitsCountMap.set(key, (visitsCountMap.get(key) ?? 0) + 1);
    });

    const { data: reviewsData, error: reviewsError } = await client
      .from('reviews')
      .select('author_id, rating')
      .in('author_id', clientIds);

    if (reviewsError) {
      console.warn('[clients] fetchClientProfiles reviews lookup error', reviewsError);
    }

    const satisfactionMap = new Map<string, { sum: number; count: number }>();
    (reviewsData as ReviewRow[] | null | undefined)?.forEach((review) => {
      const authorId = review.author_id as string;
      if (!authorId) return;
      const rating = typeof review.rating === 'number' ? review.rating : null;
      if (rating === null) return;
      const current = satisfactionMap.get(authorId) ?? { sum: 0, count: 0 };
      satisfactionMap.set(authorId, { sum: current.sum + rating, count: current.count + 1 });
    });

    // Récupérer les dépenses de chaque client depuis la table payments
    const { data: paymentsData, error: paymentsError } = await client
      .from('payments')
      .select('payer_profile_id, amount')
      .in('payer_profile_id', clientIds);

    if (paymentsError) {
      console.warn('[clients] fetchClientProfiles payments lookup error', paymentsError);
    }

    const spendMap = new Map<string, number>();
    (paymentsData as Array<{ payer_profile_id?: string | null; amount?: number | null }> | null | undefined)?.forEach((payment) => {
      const payerId = payment.payer_profile_id as string;
      if (!payerId) return;
      const amount = typeof payment.amount === 'number' ? payment.amount : 0;
      spendMap.set(payerId, (spendMap.get(payerId) ?? 0) + amount);
    });

    return profileRows.map((profile) => {
      const bookingsForClient = bookingMap.get(profile.id as string) ?? [];
      const reservations = bookingsForClient.length;
      const nights = 0; // colonne supprimée / non utilisée
      const spend = spendMap.get(profile.id as string) ?? 0;
      const lastStayDate = null;
      const leasesSigned = 0; // pas de colonne baux signés par profil

      const visitsBooked = visitsCountMap.get(profile.id as string) ?? 0;

      const satisfactionEntry = satisfactionMap.get(profile.id as string);
      const satisfaction =
        satisfactionEntry && satisfactionEntry.count > 0 ? satisfactionEntry.sum / satisfactionEntry.count : 0;

      return {
        id: profile.id as string,
        fullName: buildFullName(profile.first_name, profile.last_name),
        username: safeString(profile.username, `@${profile.id}`),
        segment: mapSegment(profile.supply_role ?? profile.role ?? null),
        city: safeString(profile.city),
        phone: safeString(profile.phone),
        reservations,
        nights,
        spend,
        satisfaction,
        lastStay: formatLastStay(lastStayDate),
        status: mapStatus(profile.role ?? null),
        visitsBooked,
        leasesSigned,
        avatarUrl: profile.avatar_url ?? '',
      } satisfies ClientProfileRecord;
    });
  } catch (error) {
    console.warn('[clients] fetchClientProfiles failed', error);
    return [];
  }
}
