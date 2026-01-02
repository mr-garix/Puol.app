import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';
import { sendHeartbeat } from '@/src/utils/heartbeat';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T];

type RentalVisitRow = Tables<'rental_visits'>['Row'];
type RentalVisitInsert = Tables<'rental_visits'>['Insert'];
type RentalVisitUpdate = Tables<'rental_visits'>['Update'];
type RentalListingRow = Tables<'listings'>['Row'];
type ProfileRow = Tables<'profiles'>['Row'];

type RentalListingSnippet = Pick<
  RentalListingRow,
  'id' | 'title' | 'cover_photo_url' | 'city' | 'district' | 'address_text' | 'host_id'
>;

type ProfileSnippet = Pick<ProfileRow, 'id' | 'first_name' | 'last_name' | 'username' | 'phone' | 'avatar_url'>;

type SupabaseRentalVisitRow = RentalVisitRow & {
  listing?: RentalListingSnippet | RentalListingSnippet[] | null;
  guest?: ProfileSnippet | ProfileSnippet[] | null;
};

export type RentalVisitStatus = 'pending' | 'confirmed' | 'cancelled';

const AUTO_CONFIRM_DELAY_MS = 2 * 60 * 1000;

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildLocationLabel = (listing: RentalListingSnippet | null): string => {
  if (!listing) {
    return 'Localisation indisponible';
  }

  const tokens = [listing.district?.trim(), listing.city?.trim()].filter(Boolean);
  if (tokens.length) {
    return tokens.join(', ');
  }
  return listing.address_text?.trim() || 'Localisation indisponible';
};

const applyAutoConfirmation = (row: RentalVisitRow): RentalVisitStatus => {
  const rawStatus = (row.status ?? 'pending').toLowerCase() as RentalVisitStatus;
  if (rawStatus !== 'pending') {
    return rawStatus;
  }

  const createdAt = row.created_at ? new Date(row.created_at) : null;
  if (!createdAt) {
    return rawStatus;
  }

  const now = Date.now();
  if (now - createdAt.getTime() >= AUTO_CONFIRM_DELAY_MS) {
    return 'confirmed';
  }

  return rawStatus;
};

const RENTAL_VISIT_SELECT = `
  id,
  rental_listing_id,
  guest_profile_id,
  visit_date,
  visit_time,
  status,
  source,
  created_at,
  cancelled_at,
  cancelled_reason,
  notes,
  listing:listings (
    id,
    title,
    cover_photo_url,
    city,
    district,
    address_text,
    host_id
  ),
  guest:profiles!rental_visits_guest_profile_id_fkey (
    id,
    first_name,
    last_name,
    username,
    phone,
    avatar_url
  )
` as const;

export interface GuestRentalVisit {
  id: string;
  listingId: string;
  listingTitle: string;
  listingCoverUrl?: string | null;
  listingLocation: string;
  landlordProfileId?: string;
  visitDate: string;
  visitTime: string;
  status: RentalVisitStatus;
  rawStatus: RentalVisitStatus;
  createdAt: string;
  source?: string | null;
  notes?: string | null;
  guest?: {
    id?: string;
    name?: string;
    username?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export interface LandlordRentalVisit extends GuestRentalVisit {
  guest: {
    id?: string;
    name?: string;
    username?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
}

const mapProfileName = (profile: ProfileSnippet | null | undefined): string | undefined => {
  if (!profile) {
    return undefined;
  }
  const tokens = [profile.first_name, profile.last_name].filter((token) => token && token.trim());
  if (tokens.length) {
    return tokens.join(' ').trim();
  }
  return profile.username ? `@${profile.username}` : undefined;
};

const unwrapSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (Array.isArray(value)) {
    return value.length > 0 ? value[0] ?? null : null;
  }
  return value ?? null;
};

const mapToGuestVisit = (row: SupabaseRentalVisitRow): GuestRentalVisit => {
  const listing = unwrapSingle(row.listing);
  const guestProfile = unwrapSingle(row.guest);
  const effectiveStatus = applyAutoConfirmation(row);

  return {
    id: row.id,
    listingId: row.rental_listing_id,
    listingTitle: listing?.title ?? 'Annonce PUOL',
    listingCoverUrl: listing?.cover_photo_url ?? null,
    listingLocation: buildLocationLabel(listing ?? null),
    landlordProfileId: listing?.host_id ?? undefined,
    visitDate: row.visit_date,
    visitTime: row.visit_time ?? '',
    status: effectiveStatus,
    rawStatus: (row.status ?? 'pending') as RentalVisitStatus,
    createdAt: row.created_at,
    source: row.source ?? null,
    notes: row.notes ?? null,
    guest: guestProfile
      ? {
          id: guestProfile.id,
          name: mapProfileName(guestProfile),
          username: guestProfile.username ?? null,
          phone: guestProfile.phone ?? null,
          avatarUrl: guestProfile.avatar_url ?? null,
        }
      : null,
  };
};

const mapToLandlordVisit = (row: SupabaseRentalVisitRow): LandlordRentalVisit => {
  const guestProfile = unwrapSingle(row.guest);
  const base = mapToGuestVisit(row);
  return {
    ...base,
    guest: guestProfile
      ? {
          id: guestProfile.id,
          name: mapProfileName(guestProfile),
          username: guestProfile.username ?? null,
          phone: guestProfile.phone ?? null,
          avatarUrl: guestProfile.avatar_url ?? null,
        }
      : null,
  };
};

export const RENTAL_VISIT_TIME_SLOTS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'] as const;

export const fetchGuestRentalVisits = async (guestProfileId: string): Promise<GuestRentalVisit[]> => {
  const { data, error } = await supabase
    .from('rental_visits')
    .select(RENTAL_VISIT_SELECT)
    .eq('guest_profile_id', guestProfileId)
    .order('visit_date', { ascending: true })
    .order('visit_time', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapToGuestVisit(row));
};

export const fetchLandlordRentalVisits = async (landlordProfileId: string): Promise<LandlordRentalVisit[]> => {
  const { data, error } = await supabase
    .from('rental_visits')
    .select(RENTAL_VISIT_SELECT)
    .eq('listing.host_id', landlordProfileId)
    .order('visit_date', { ascending: false })
    .order('visit_time', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapToLandlordVisit(row));
};

export const fetchLandlordRentalVisitById = async (
  landlordProfileId: string,
  visitId: string,
): Promise<LandlordRentalVisit | null> => {
  const { data, error } = await supabase
    .from('rental_visits')
    .select(RENTAL_VISIT_SELECT)
    .eq('id', visitId)
    .eq('listing.host_id', landlordProfileId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapToLandlordVisit(data as SupabaseRentalVisitRow);
};

export const checkRentalVisitAvailability = async (params: {
  listingId: string;
  visitDate: string;
  visitTime: string;
}): Promise<boolean> => {
  const { listingId, visitDate, visitTime } = params;

  const { data, error } = await supabase
    .from('rental_visits')
    .select('id', { head: true, count: 'exact' })
    .eq('rental_listing_id', listingId)
    .eq('visit_date', visitDate)
    .eq('visit_time', visitTime)
    .neq('status', 'cancelled');

  if (error) {
    throw error;
  }

  return (data?.length ?? 0) === 0;
};

export interface ScheduleRentalVisitInput {
  listingId: string;
  guestProfileId: string;
  visitDate: Date;
  visitTime: string;
  source?: string;
  notes?: string | null;
}

export const createRentalVisit = async (input: ScheduleRentalVisitInput): Promise<GuestRentalVisit> => {
  const visitDateKey = formatDateKey(input.visitDate);
  const time = input.visitTime;

  const slotAvailable = await checkRentalVisitAvailability({
    listingId: input.listingId,
    visitDate: visitDateKey,
    visitTime: time,
  });

  if (!slotAvailable) {
    const error = new Error('Cette plage horaire n\'est plus disponible.');
    (error as Error & { code?: string }).code = 'slot_unavailable';
    throw error;
  }

  const payload: RentalVisitInsert = {
    rental_listing_id: input.listingId,
    guest_profile_id: input.guestProfileId,
    visit_date: visitDateKey,
    visit_time: time,
    status: 'confirmed',
    source: input.source ?? 'user',
    notes: input.notes ?? null,
  };

  const { data, error } = await supabase
    .from('rental_visits')
    .insert(payload)
    .select(RENTAL_VISIT_SELECT)
    .single();

  if (error || !data) {
    throw error ?? new Error('failed_to_create_rental_visit');
  }

  // Envoyer le heartbeat (user connecté ou visiteur anonyme)
  await sendHeartbeat(input.guestProfileId || null);

  // 🔔 Envoyer une notification au HOST via Supabase Realtime
  try {
    const mappedVisit = mapToGuestVisit(data);
    const listingData = data.listing as any;
    
    console.log('[createRentalVisit] Listing data:', {
      listingData,
      isArray: Array.isArray(listingData),
      length: Array.isArray(listingData) ? listingData.length : 'N/A',
    });
    
    const listing = (Array.isArray(listingData) && listingData.length > 0) 
      ? listingData[0] 
      : (listingData && typeof listingData === 'object' ? listingData : null);
    
    console.log('[createRentalVisit] Extracted listing:', {
      listing,
      hostId: listing?.host_id,
    });
    
    if (listing && listing.host_id) {
      const channelName = `host-visit-notifications-${listing.host_id}`;
      console.log('[createRentalVisit] Broadcasting visit notification to host:', {
        hostId: listing.host_id,
        channelName,
        visitId: mappedVisit.id,
      });
      
      // Envoyer un événement broadcast au HOST via Supabase Realtime
      const result = await supabase.channel(channelName).send({
        type: 'broadcast',
        event: 'new_host_visit',
        payload: {
          visitId: mappedVisit.id,
          guestName: mappedVisit.guest?.name || 'Un visiteur',
          listingTitle: mappedVisit.listingTitle,
          visitDate: mappedVisit.visitDate,
          visitTime: mappedVisit.visitTime,
          hostProfileId: listing.host_id,
          createdAt: new Date().toISOString(),
        }
      });
      
      console.log('[createRentalVisit] Broadcast result:', result);
    } else {
      console.warn('[createRentalVisit] No listing or host_id found:', {
        hasListing: !!listing,
        hostId: listing?.host_id,
      });
    }
  } catch (notificationError) {
    console.error('[createRentalVisit] Error sending visit notification:', notificationError);
    // Ne pas échouer la création de visite si la notification échoue
  }

  return mapToGuestVisit(data);
};

export const updateRentalVisit = async (params: {
  visitId: string;
  newDate: Date;
  newTime: string;
}): Promise<GuestRentalVisit> => {
  const visitDateKey = formatDateKey(params.newDate);

  const { data: existing, error: fetchError } = await supabase
    .from('rental_visits')
    .select('rental_listing_id')
    .eq('id', params.visitId)
    .single();

  if (fetchError || !existing) {
    throw fetchError ?? new Error('visit_not_found');
  }

  const slotAvailable = await checkRentalVisitAvailability({
    listingId: existing.rental_listing_id,
    visitDate: visitDateKey,
    visitTime: params.newTime,
  });

  if (!slotAvailable) {
    const error = new Error('Cette plage horaire n’est plus disponible.');
    (error as Error & { code?: string }).code = 'slot_unavailable';
    throw error;
  }

  const updates: RentalVisitUpdate = {
    visit_date: visitDateKey,
    visit_time: params.newTime,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('rental_visits')
    .update(updates)
    .eq('id', params.visitId)
    .select(RENTAL_VISIT_SELECT)
    .single();

  if (error || !data) {
    throw error ?? new Error('failed_to_update_visit');
  }

  return mapToGuestVisit(data);
};

export const cancelRentalVisit = async (visitId: string): Promise<GuestRentalVisit> => {
  const { data, error } = await supabase
    .from('rental_visits')
    .update({ status: 'cancelled' })
    .eq('id', visitId)
    .select(RENTAL_VISIT_SELECT)
    .single();

  if (error || !data) {
    throw error ?? new Error('failed_to_cancel_visit');
  }

  return mapToGuestVisit(data);
};

export const fetchExistingVisitForListing = async (
  guestProfileId: string,
  listingId: string,
): Promise<GuestRentalVisit | null> => {
  const { data, error } = await supabase
    .from('rental_visits')
    .select('*')
    .eq('guest_profile_id', guestProfileId)
    .eq('rental_listing_id', listingId)
    .neq('status', 'cancelled')
    .order('visit_date', { ascending: false })
    .order('visit_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapToGuestVisit(data as SupabaseRentalVisitRow);
};

export const fetchOccupiedTimeslots = async (params: {
  listingId: string;
  visitDate: string;
}): Promise<string[]> => {
  const { data, error } = await supabase
    .from('rental_visits')
    .select('visit_time')
    .eq('rental_listing_id', params.listingId)
    .eq('visit_date', params.visitDate)
    .neq('status', 'cancelled');

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => row.visit_time)
    .filter((time): time is string => Boolean(time));
};

export const fetchListingUnavailableDates = async (params: {
  listingId: string;
  startDate: string;
  endDate: string;
}): Promise<string[]> => {
  const { listingId, startDate, endDate } = params;

  const { data, error } = await supabase
    .from('listing_availability')
    .select('date')
    .eq('listing_id', listingId)
    .gte('date', startDate)
    .lte('date', endDate)
    .in('status', ['blocked', 'reserved']);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => row.date)
    .filter((date): date is string => Boolean(date));
};
