import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';
import { sendHeartbeat } from '@/src/utils/heartbeat';

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T];
export type BookingRow = Tables<'bookings'>['Row'] & {
  updated_at?: string;
  remaining_payment_status?: 'idle' | 'requested' | 'paid' | null;
};

export const hasOutstandingPaymentsForListing = async (listingId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, status, remaining_amount, remaining_paid, remaining_payment_status')
    .eq('listing_id', listingId)
    .in('status', ['pending', 'confirmed', 'in_progress'])
    .limit(1);

  if (error) {
    console.error('[hasOutstandingPaymentsForListing] error', error);
    throw error;
  }

  if (!data || !data.length) {
    return false;
  }

  return data.some((booking) => {
    const amount = booking.remaining_amount ?? 0;
    const status = booking.remaining_payment_status ?? null;
    const isPaidFlag = booking.remaining_paid ?? false;
    const hasOutstandingStatus = status === 'requested';
    const hasOutstandingAmount = amount > 0 && !isPaidFlag;
    return hasOutstandingStatus || hasOutstandingAmount;
  });
};
export type ListingRow = Tables<'listings'>['Row'];
export type ProfileRow = Tables<'profiles'>['Row'];

const AVAILABILITY_STATUS = {
  BLOCKED: 'blocked',
  RESERVED: 'reserved',
} as const;

const AVAILABILITY_SOURCE = {
  MANUAL: 'manual',
  BOOKING: 'booking',
} as const;

const HOST_LISTING_FETCH_LIMIT = 200;

const normalizeDateOnly = (input: string | null | undefined): Date | null => {
  if (!input) {
    return null;
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const formatDateKey = (date: Date): string => date.toISOString().split('T')[0];

const buildStayDates = (checkIn: string, checkOut: string): string[] => {
  const start = normalizeDateOnly(checkIn);
  const end = normalizeDateOnly(checkOut);
  if (!start || !end || start >= end) {
    return [];
  }

  const dates: string[] = [];
  const cursor = new Date(start.getTime());
  while (cursor < end) {
    dates.push(formatDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
};

const normalizeBookingStatus = (status: string | null | undefined, checkOutDate: string | null | undefined) => {
  const rawStatus = (status ?? 'pending').toLowerCase();
  if (rawStatus === 'cancelled') {
    return 'cancelled';
  }

  const checkout = normalizeDateOnly(checkOutDate);
  const today = normalizeDateOnly(new Date().toISOString());
  if (checkout && today && checkout <= today) {
    return 'completed';
  }

  if (rawStatus === 'completed') {
    return 'completed';
  }

  return rawStatus === 'confirmed' ? 'confirmed' : 'pending';
};

const assertDatesAvailable = async (listingId: string, dates: string[]) => {
  if (!dates.length) {
    return;
  }

  const { data, error } = await supabase
    .from('listing_availability')
    .select('date, status')
    .eq('listing_id', listingId)
    .in('date', dates)
    .in('status', [AVAILABILITY_STATUS.BLOCKED, AVAILABILITY_STATUS.RESERVED]);

  if (error) {
    throw error;
  }

  if ((data?.length ?? 0) > 0) {
    throw new Error('dates_unavailable');
  }
};

const reserveListingDates = async (listingId: string, dates: string[]) => {
  if (!dates.length) {
    return;
  }

  const rows = dates.map((date) => ({
    listing_id: listingId,
    date,
    status: AVAILABILITY_STATUS.RESERVED,
    source: AVAILABILITY_SOURCE.BOOKING,
  }));

  const { error } = await supabase.from('listing_availability').insert(rows);
  if (error) {
    throw error;
  }
};

/**
 * Deprecated for NotchPay: le statut paid doit venir du webhook PSP.
 * Conservé pour compatibilité éventuelle mais NE PAS appeler dans le flux NotchPay.
 */
export const markBookingPaid = async (bookingId: string) => {
  console.warn('[markBookingPaid] ⚠️ Deprecated - webhook PSP doit marquer paid');
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      deposit_paid: true,
      remaining_paid: true,
      remaining_payment_status: 'paid',
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .select(BOOKING_SELECT)
    .maybeSingle();

  if (error) {
    console.error('[markBookingPaid] Error updating booking:', error);
    throw error;
  }

  if (!data) {
    console.error('[markBookingPaid] Booking not found:', bookingId);
    throw new Error('booking_not_found');
  }

  return mapToGuestBooking(data as any);
};

export const cancelBookingAfterPaymentFailure = async (bookingId: string) => {
  console.log(`[cancelBookingAfterPaymentFailure] Cancelling booking ${bookingId} and releasing dates`);

  const { data: bookingRow, error: fetchError } = await supabase
    .from('bookings')
    .select('id, listing_id, checkin_date, checkout_date')
    .eq('id', bookingId)
    .maybeSingle();

  if (fetchError) {
    console.error('[cancelBookingAfterPaymentFailure] Error fetching booking:', fetchError);
    throw fetchError;
  }

  if (!bookingRow) {
    console.warn('[cancelBookingAfterPaymentFailure] Booking not found, nothing to cancel:', bookingId);
    return;
  }

  const stayDates = buildStayDates(bookingRow.checkin_date, bookingRow.checkout_date);

  // Release dates before deleting the booking
  try {
    await releaseListingDates(bookingRow.listing_id, stayDates);
  } catch (releaseError) {
    console.error('[cancelBookingAfterPaymentFailure] Error releasing dates:', releaseError);
  }

  const { error: deleteError } = await supabase.from('bookings').delete().eq('id', bookingId);

  if (deleteError) {
    console.error('[cancelBookingAfterPaymentFailure] Error deleting booking:', deleteError);
    throw deleteError;
  }

  console.log('[cancelBookingAfterPaymentFailure] Booking cancelled and dates released');
};

export const fetchHostListingIds = async (hostProfileId: string): Promise<string[]> => {
  const { data, error } = await supabase
    .from('listings')
    .select('id')
    .eq('host_id', hostProfileId)
    .limit(HOST_LISTING_FETCH_LIMIT);

  if (error) {
    throw error;
  }

  return (data ?? [])
    .map((row) => row.id)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
};

const releaseListingDates = async (listingId: string, dates: string[]) => {
  if (!dates.length) {
    return;
  }

  const { error } = await supabase
    .from('listing_availability')
    .delete()
    .eq('listing_id', listingId)
    .eq('source', AVAILABILITY_SOURCE.BOOKING)
    .in('date', dates);

  if (error) {
    throw error;
  }
};

const BOOKING_SELECT = `
  id,
  listing_id,
  guest_profile_id,
  checkin_date,
  checkout_date,
  nights,
  nightly_price,
  total_price,
  payment_status,
  payment_scheme,
  status,
  currency,
  created_at,
  deposit_amount,
  deposit_nights,
  deposit_paid,
  has_discount,
  discount_amount,
  discount_percent,
  remaining_amount,
  remaining_nights,
  remaining_paid,
  remaining_payment_status,
  updated_at,
  listing:listings (
    id,
    title,
    cover_photo_url,
    city,
    district,
    address_text,
    price_per_night,
    host_id
  ),
  guest:profiles!bookings_guest_profile_id_fkey (
    id,
    first_name,
    last_name,
    username,
    phone,
    avatar_url
  )
`;

export interface GuestBookingRecord {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage?: string | null;
  listingLocation?: string;
  listingAddress?: string | null;
  updated_at?: string;
  nights: number;
  nightlyPrice: number;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  remainingPaymentStatus?: 'idle' | 'requested' | 'paid' | string;
  paymentStatus: string;
  paymentScheme: string;
  currency: string;
  totalPrice: number;
  amountPaid: number;
  amountRemaining: number;
  depositNights: number;
  remainingNights: number;
  createdAt: string;
  originalTotal: number;
  discountAmount: number;
  discountPercent: number | null;
  host?: {
    id?: string;
    name?: string;
    username?: string | null;
    avatarUrl?: string | null;
    phone?: string;
    isVerified?: boolean;
  };
  guestName?: string | null;
  guestPhone?: string | null;
  guest?: {
    id?: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
  };
}

export interface HostBookingRecord {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage?: string | null;
  listingLocation?: string;
  nights: number;
  nightlyPrice: number;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  remainingPaymentStatus?: 'idle' | 'requested' | 'paid' | string;
  paymentStatus: string;
  paymentScheme: string;
  currency: string;
  totalPrice: number;
  amountPaid: number;
  amountRemaining: number;
  depositNights: number;
  remainingNights: number;
  createdAt: string;
  originalTotal: number;
  discountAmount: number;
  discountPercent: number | null;
  guest?: {
    id?: string;
    name?: string;
    username?: string | null;
    phone?: string;
    avatarUrl?: string | null;
  };
}

const buildFullName = (profile?: Pick<ProfileRow, 'first_name' | 'last_name' | 'username'> | null) => {
  if (!profile) {
    return undefined;
  }
  const tokens = [profile.first_name, profile.last_name].filter(Boolean) as string[];
  if (tokens.length > 0) {
    return tokens.join(' ').trim();
  }
  return profile.username ? `@${profile.username}` : undefined;
};

const buildListingLocation = (listing?: Pick<ListingRow, 'city' | 'district'> | null) => {
  if (!listing) {
    return undefined;
  }
  if (listing.district && listing.city) {
    return `${listing.district}, ${listing.city}`;
  }
  return listing.city ?? listing.district ?? undefined;
};

const mapToGuestBooking = (record: BookingRow & {
  listing: (Pick<ListingRow, 'id' | 'title' | 'cover_photo_url' | 'city' | 'district' | 'address_text' | 'price_per_night' | 'host_id'> & {
    host?: Pick<ProfileRow, 'id' | 'first_name' | 'last_name' | 'username' | 'phone' | 'avatar_url' | 'is_certified'> | null;
  }) | null;
  guest: Pick<ProfileRow, 'id' | 'first_name' | 'last_name' | 'username' | 'phone' | 'avatar_url'> | null;
}): GuestBookingRecord => {
  const discountAmount = record.discount_amount ?? 0;
  const discountPercent = record.discount_percent ?? null;
  const computedOriginal = record.nightly_price * record.nights;
  const originalTotal = discountAmount > 0 ? record.total_price + discountAmount : computedOriginal;

  const listingHostId = record.listing?.host_id;
  const hostProfile = record.listing?.host;

  // Détecter le statut de paiement du solde basé sur remaining_amount et remaining_payment_status
  let remainingPaymentStatus: 'idle' | 'requested' | 'paid' | undefined = 'idle';
  const rawRemainingStatus = record.remaining_payment_status ?? null;
  const remainingAmount = record.remaining_amount ?? 0;

  // Logique : si remaining_amount > 0, il y a toujours un reste à payer
  if (remainingAmount > 0) {
    // Il y a un reste à payer
    remainingPaymentStatus = rawRemainingStatus === 'requested' ? 'requested' : 'idle';
  }
  // Si remaining_amount === 0 ET remaining_paid === true, le solde est payé
  else if (remainingAmount === 0 && record.remaining_paid) {
    remainingPaymentStatus = 'paid';
  }
  // Si le statut est explicitement défini et qu'il n'y a pas de reste
  else if (rawRemainingStatus === 'requested' || rawRemainingStatus === 'paid') {
    remainingPaymentStatus = rawRemainingStatus;
  }
  else if (record.updated_at && record.updated_at.startsWith('PAYMENT_REQUESTED_')) {
    remainingPaymentStatus = 'requested';
  }

  const guestTokens = [
    record.guest?.first_name?.trim(),
    record.guest?.last_name?.trim(),
  ].filter(Boolean);
  const guestFullName = guestTokens.length ? guestTokens.join(' ') : undefined;
  const guestUsername = record.guest?.username ? `@${record.guest.username}` : undefined;

  return {
    id: record.id,
    listingId: record.listing_id,
    listingTitle: record.listing?.title || 'Annonce sans titre',
    listingImage: record.listing?.cover_photo_url || null,
    listingLocation: record.listing ? buildListingLocation(record.listing) : undefined,
    listingAddress: record.listing?.address_text || null,
    updated_at: record.updated_at,
    nights: record.nights,
    nightlyPrice: record.nightly_price,
    checkInDate: record.checkin_date,
    checkOutDate: record.checkout_date,
    status: normalizeBookingStatus(record.status, record.checkout_date),
    remainingPaymentStatus,
    paymentStatus: record.payment_status ?? 'pending',
    paymentScheme: record.payment_scheme ?? 'full',
    currency: record.currency ?? 'XAF',
    totalPrice: record.total_price,
    amountPaid: record.deposit_amount,
    amountRemaining: record.remaining_amount,
    depositNights: record.deposit_nights ?? 0,
    remainingNights: record.remaining_nights ?? 0,
    createdAt: record.created_at,
    originalTotal,
    discountAmount,
    discountPercent,
    guestName: guestFullName ?? guestUsername ?? null,
    guestPhone: record.guest?.phone ?? null,
    host: hostProfile
      ? {
          id: hostProfile.id,
          name: buildFullName(hostProfile),
          username: hostProfile.username,
          avatarUrl: hostProfile.avatar_url,
          phone: hostProfile.phone ?? undefined,
          isVerified: Boolean(hostProfile.is_certified),
        }
      : listingHostId
        ? {
            id: listingHostId,
          }
        : undefined,
  };
};

const mapToHostBooking = (record: BookingRow & {
  listing: Pick<ListingRow, 'id' | 'title' | 'cover_photo_url' | 'city' | 'district' | 'address_text' | 'price_per_night'> | null;
  guest: Pick<ProfileRow, 'id' | 'first_name' | 'last_name' | 'username' | 'phone' | 'avatar_url'> | null;
}): HostBookingRecord => {
  const discountAmount = record.discount_amount ?? 0;
  const discountPercent = record.discount_percent ?? null;
  const computedOriginal = record.nightly_price * record.nights;
  const originalTotal = discountAmount > 0 ? record.total_price + discountAmount : computedOriginal;

  // Détecter le statut de paiement du solde basé sur remaining_amount et remaining_payment_status
  let remainingPaymentStatus: 'idle' | 'requested' | 'paid' | undefined = 'idle';
  const rawRemainingStatus = record.remaining_payment_status ?? null;
  const remainingAmount = record.remaining_amount ?? 0;

  // Logique : si remaining_amount > 0, il y a toujours un reste à payer
  if (remainingAmount > 0) {
    // Il y a un reste à payer
    remainingPaymentStatus = rawRemainingStatus === 'requested' ? 'requested' : 'idle';
  }
  // Si remaining_amount === 0 ET remaining_paid === true, le solde est payé
  else if (remainingAmount === 0 && record.remaining_paid) {
    remainingPaymentStatus = 'paid';
  }
  // Si le statut est explicitement défini et qu'il n'y a pas de reste
  else if (rawRemainingStatus === 'requested' || rawRemainingStatus === 'paid') {
    remainingPaymentStatus = rawRemainingStatus;
  }
  else if (record.updated_at && record.updated_at.startsWith('PAYMENT_REQUESTED_')) {
    remainingPaymentStatus = 'requested';
  }

  return {
    id: record.id,
    listingId: record.listing_id,
    listingTitle: record.listing?.title || 'Annonce sans titre',
    listingImage: record.listing?.cover_photo_url || null,
    listingLocation: record.listing ? buildListingLocation(record.listing) : undefined,
    nights: record.nights,
    nightlyPrice: record.nightly_price,
    checkInDate: record.checkin_date,
    checkOutDate: record.checkout_date,
    status: normalizeBookingStatus(record.status, record.checkout_date),
    remainingPaymentStatus,
    paymentStatus: record.payment_status ?? 'pending',
    paymentScheme: record.payment_scheme ?? 'full',
    currency: record.currency ?? 'XAF',
    totalPrice: record.total_price,
    amountPaid: record.deposit_amount,
    amountRemaining: record.remaining_amount,
    depositNights: record.deposit_nights ?? 0,
    remainingNights: record.remaining_nights ?? 0,
    createdAt: record.created_at,
    originalTotal,
    discountAmount,
    discountPercent,
    guest: record.guest
      ? {
          id: record.guest.id,
          name: buildFullName(record.guest),
          username: record.guest.username,
          phone: record.guest.phone ?? undefined,
          avatarUrl: record.guest.avatar_url ?? undefined,
        }
      : undefined,
  };
};

export const fetchGuestBookings = async (guestProfileId: string) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('guest_profile_id', guestProfileId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapToGuestBooking(row as any));
};

export const fetchGuestBookingById = async (guestProfileId: string, bookingId: string) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('guest_profile_id', guestProfileId)
    .eq('id', bookingId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapToGuestBooking(data as any) : null;
};

export const fetchHostBookings = async (hostProfileId: string) => {
  const hostListingIds = await fetchHostListingIds(hostProfileId);
  if (!hostListingIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .in('listing_id', hostListingIds)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapToHostBooking(row as any));
};

export const fetchHostBookingById = async (hostProfileId: string, bookingId: string) => {
  console.log(`[fetchHostBookingById] Fetching booking ${bookingId} for host ${hostProfileId}`);

  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(BOOKING_SELECT)
      .eq('listing.host_id', hostProfileId)
      .eq('id', bookingId)
      .maybeSingle();

    if (error) {
      console.error(`[fetchHostBookingById] Error fetching booking ${bookingId}:`, error);
      throw error;
    }

    if (!data) {
      console.log(`[fetchHostBookingById] No booking found with ID ${bookingId} for host ${hostProfileId}`);
      return null;
    }

    // Vérifier côté client que la réservation appartient bien à ce host
    const listingHostId =
      (Array.isArray(data.listing) && data.listing.length > 0 && data.listing[0]?.host_id) ||
      (data.listing && typeof data.listing === 'object' ? (data.listing as any)?.host_id : null);
    if (listingHostId && listingHostId !== hostProfileId) {
      console.warn(`[fetchHostBookingById] Booking ${bookingId} does not belong to host ${hostProfileId}, belongs to ${listingHostId}`);
      return null;
    }

    // Créer un objet de log sécurisé pour éviter les erreurs d'accès
    const logData: Record<string, any> = {
      status: data.status,
      guestId: data.guest_profile_id,
      hasGuestData: !!data.guest
    };
    
    // Gérer le cas où listing pourrait être un tableau ou un objet
    if (Array.isArray(data.listing) && data.listing.length > 0) {
      logData.listingId = data.listing[0]?.id;
      logData.hasListingData = true;
    } else if (data.listing && typeof data.listing === 'object') {
      logData.listingId = (data.listing as any)?.id;
      logData.hasListingData = true;
    } else {
      logData.hasListingData = false;
    }
    
    console.log(`[fetchHostBookingById] Successfully fetched booking ${bookingId}`, logData);

    const mapped = mapToHostBooking(data as any);
    
    console.log(`[fetchHostBookingById] Mapped booking data:`, {
      id: mapped.id,
      status: mapped.status,
      listingTitle: mapped.listingTitle,
      hasGuestData: !!mapped.guest,
      hasListingData: !!mapped.listingTitle
    });
    
    return mapped;
  } catch (error) {
    console.error(`[fetchHostBookingById] Unexpected error for booking ${bookingId}:`, error);
    throw error;
  }
};

export interface CreateBookingInput {
  listingId: string;
  guestProfileId: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  nightlyPrice: number;
  totalPrice: number;
  depositAmount: number;
  remainingAmount: number;
  currency?: string;
  status?: 'pending' | 'confirmed' | 'cancelled';
  discountAmount?: number;
  discountPercent?: number | null;
  hasDiscount?: boolean;
}

export const createBooking = async (input: CreateBookingInput) => {
  console.log('[createBooking] Début création booking avec input:', input);
  
  const stayDates = buildStayDates(input.checkInDate, input.checkOutDate);
  console.log('[createBooking] Dates de séjour construites:', stayDates);
  
  if (!stayDates.length) {
    console.error('[createBooking] Plage de dates invalide');
    throw new Error('invalid_stay_range');
  }

  console.log('[createBooking] Vérification disponibilité des dates...');
  await assertDatesAvailable(input.listingId, stayDates);
  console.log('[createBooking] Dates disponibles confirmées');

  const isSplitPayment = input.nights >= 8;
  const enforcedRemainingNights = isSplitPayment ? Math.min(2, input.nights) : 0;
  const enforcedDepositNights = Math.max(input.nights - enforcedRemainingNights, 0);
  const enforcedRemainingAmount = enforcedRemainingNights * input.nightlyPrice;
  const enforcedDepositAmount = Math.max(input.totalPrice - enforcedRemainingAmount, 0);

  const inferredHasDiscount = input.hasDiscount ?? Boolean(input.discountAmount && input.discountAmount > 0);
  const normalizedDiscountAmount = inferredHasDiscount ? input.discountAmount ?? 0 : null;
  const normalizedDiscountPercent = inferredHasDiscount ? input.discountPercent ?? null : null;

  const paymentScheme: 'full' | 'split' = isSplitPayment ? 'split' : 'full';
  const paymentStatus: 'paid' | 'partially_paid' | 'pending' = isSplitPayment ? 'partially_paid' : 'paid';
  const depositPaid = true;
  const remainingPaid = !isSplitPayment;

  if (isSplitPayment) {
    console.log('[createBooking] Split payment payload', {
      listingId: input.listingId,
      nights: input.nights,
      nightlyPrice: input.nightlyPrice,
      totalPrice: input.totalPrice,
      depositNights: enforcedDepositNights,
      remainingNights: enforcedRemainingNights,
      depositAmount: enforcedDepositAmount,
      remainingAmount: enforcedRemainingAmount,
      paymentScheme,
      paymentStatus,
    });
  }

  const payload: Tables<'bookings'>['Insert'] = {
    listing_id: input.listingId,
    guest_profile_id: input.guestProfileId,
    checkin_date: input.checkInDate,
    checkout_date: input.checkOutDate,
    nights: input.nights,
    nightly_price: input.nightlyPrice,
    total_price: input.totalPrice,
    payment_status: paymentStatus,
    payment_scheme: paymentScheme,
    status: input.status ?? 'pending',
    currency: input.currency ?? 'XAF',
    deposit_amount: enforcedDepositAmount,
    deposit_nights: enforcedDepositNights,
    deposit_paid: depositPaid,
    remaining_amount: enforcedRemainingAmount,
    remaining_nights: enforcedRemainingNights,
    remaining_paid: remainingPaid,
    has_discount: inferredHasDiscount,
    discount_amount: normalizedDiscountAmount,
    discount_percent: normalizedDiscountPercent,
    created_at: new Date().toISOString(),
  };

  console.log('[createBooking] Insertion en base avec payload:', payload);
  
  const { data, error } = await supabase
    .from('bookings')
    .insert(payload)
    .select(BOOKING_SELECT)
    .maybeSingle();

  if (error) {
    console.error('[createBooking] Erreur insertion booking:', error);
    throw error;
  }

  if (!data) {
    console.error('[createBooking] Aucune donnée retournée après insertion');
    throw new Error('Unable to create booking');
  }
  
  console.log('[createBooking] Booking inséré avec succès:', data);

  try {
    console.log('[createBooking] Réservation des dates dans le calendrier...');
    await reserveListingDates(input.listingId, stayDates);
    console.log('[createBooking] Dates réservées avec succès');
  } catch (availabilityError) {
    console.error('[createBooking] Erreur réservation dates, suppression du booking:', availabilityError);
    await supabase.from('bookings').delete().eq('id', data.id);
    throw availabilityError;
  }

  console.log('[createBooking] Mapping vers GuestBooking...');
  const mapped = mapToGuestBooking(data as any);
  console.log('[createBooking] Booking créé et mappé avec succès:', mapped);

  // ✅ NOTCHPAY: Paiement géré côté écran via NotchPay
  // Le booking est créé en status 'pending' avec payment_status 'pending'
  // L'écran de paiement appellera initBookingPaymentWithNotchPay() pour déclencher le flow NotchPay
  // Le webhook Supabase mettra à jour payments.status (success/failed)
  console.log('[createBooking] ✅ Booking créé en status pending - paiement géré via NotchPay côté écran');

  // Envoyer le heartbeat (user connecté ou visiteur anonyme)
  await sendHeartbeat(input.guestProfileId || null);
  
  return mapped;
};

export const requestRemainingPayment = async (bookingId: string) => {
  console.log(`[requestRemainingPayment] Requesting remaining payment for booking ${bookingId}`);
  
  try {
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        remaining_payment_status: 'requested',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select(BOOKING_SELECT)
      .maybeSingle();

    if (error) {
      console.error(`[requestRemainingPayment] Error requesting payment:`, error);
      throw error;
    }

    if (!data) {
      console.error(`[requestRemainingPayment] No booking found with ID ${bookingId}`);
      throw new Error('Booking not found');
    }

    console.log(`[requestRemainingPayment] Successfully requested payment for booking ${bookingId}`);
    // Simuler le statut dans les données retournées
    const mappedData = mapToHostBooking(data as any);
    (mappedData as any).remainingPaymentStatus = 'requested';
    return mappedData;
  } catch (error) {
    console.error(`[requestRemainingPayment] Unexpected error for booking ${bookingId}:`, error);
    throw error;
  }
};

export const processRemainingPayment = async (bookingId: string) => {
  console.log(`[processRemainingPayment] Processing remaining payment for booking ${bookingId}`);
  
  try {
    // Utiliser les champs existants pour simuler le paiement
    const { data, error } = await supabase
      .from('bookings')
      .update({ 
        remaining_amount: 0,
        remaining_nights: 0,
        remaining_paid: true,
        remaining_payment_status: 'paid',
        updated_at: new Date().toISOString(), // Normaliser updated_at
      })
      .eq('id', bookingId)
      .select(BOOKING_SELECT)
      .maybeSingle();

    if (error) {
      console.error(`[processRemainingPayment] Error processing payment:`, error);
      throw error;
    }

    if (!data) {
      console.error(`[processRemainingPayment] No booking found with ID ${bookingId}`);
      throw new Error('Booking not found');
    }

    console.log(`[processRemainingPayment] Successfully processed payment for booking ${bookingId}`);
    const mappedData = mapToGuestBooking(data as any);
    (mappedData as any).remainingPaymentStatus = 'paid';
    return mappedData;
  } catch (error) {
    console.error(`[processRemainingPayment] Unexpected error for booking ${bookingId}:`, error);
    throw error;
  }
};

export const cancelGuestBooking = async (guestProfileId: string, bookingId: string) => {
  console.log(`[cancelGuestBooking] Starting cancellation for booking ${bookingId} by guest ${guestProfileId}`);
  
  // D'abord, récupérer les détails de la réservation avant la mise à jour
  console.log(`[cancelGuestBooking] Fetching existing booking details for ${bookingId}`);
  const { data: existingBooking, error: fetchError } = await supabase
    .from('bookings')
    .select(BOOKING_SELECT)
    .eq('id', bookingId)
    .eq('guest_profile_id', guestProfileId)
    .maybeSingle();
    
  if (fetchError) {
    console.error(`[cancelGuestBooking] Error fetching booking ${bookingId}:`, fetchError);
    throw fetchError;
  }
    
  if (!existingBooking) {
    console.error(`[cancelGuestBooking] Booking ${bookingId} not found or not owned by guest ${guestProfileId}`);
    return null;
  }
  
  console.log(`[cancelGuestBooking] Found booking:`, {
    id: existingBooking.id,
    status: existingBooking.status,
    listingId: existingBooking.listing_id,
    checkInDate: existingBooking.checkin_date,
    checkOutDate: existingBooking.checkout_date,
    guestId: existingBooking.guest_profile_id
  });
  
  // Mettre à jour le statut de la réservation
  console.log(`[cancelGuestBooking] Updating booking status to 'cancelled'`);
  const { data, error } = await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('guest_profile_id', guestProfileId)
    .eq('id', bookingId)
    .select(BOOKING_SELECT)
    .maybeSingle();

  if (error) {
    console.error(`[cancelGuestBooking] Error cancelling booking ${bookingId}:`, error);
    throw error;
  }

  if (!data) {
    console.error(`[cancelGuestBooking] No data returned after cancelling booking ${bookingId}`);
    return null;
  }

  console.log(`[cancelGuestBooking] Successfully cancelled booking:`, {
    id: data.id,
    status: data.status,
    updatedAt: data.updated_at,
    listingId: data.listing_id,
    guestId: data.guest_profile_id
  });

  // Libérer les dates réservées
  const stayDates = buildStayDates(data.checkin_date, data.checkout_date);
  console.log(`[cancelGuestBooking] Processing stay dates:`, {
    checkIn: data.checkin_date,
    checkOut: data.checkout_date,
    stayDates,
    listingId: data.listing_id
  });

  if (stayDates.length) {
    try {
      console.log(`[cancelGuestBooking] Releasing ${stayDates.length} dates for listing ${data.listing_id}`);
      await releaseListingDates(data.listing_id, stayDates);
      console.log(`[cancelGuestBooking] Successfully released dates for listing ${data.listing_id}`);
    } catch (releaseError) {
      console.error(`[cancelGuestBooking] Failed to release listing dates for booking ${bookingId}:`, releaseError);
      // Ne pas échouer complètement si la libération des dates échoue
    }
  } else {
    console.log(`[cancelGuestBooking] No dates to release for booking ${bookingId}`);
  }

  const mappedBooking = mapToGuestBooking(data as any);
  
  // Utiliser l'opérateur de navigation optionnelle et vérifier l'existence des propriétés
  const hostInfo = mappedBooking.host;
  const hostName = hostInfo?.name || 'N/A';
  
  console.log(`[cancelGuestBooking] Mapped booking to return:`, {
    id: mappedBooking.id,
    status: mappedBooking.status,
    listingTitle: mappedBooking.listingTitle || 'N/A',
    hostName,
    hasHostData: !!hostInfo,
    hasListingData: !!mappedBooking.listingTitle,
    checkInDate: mappedBooking.checkInDate,
    checkOutDate: mappedBooking.checkOutDate
  });

  // Envoyer une notification au host via broadcast Supabase
  const hostId = Array.isArray(data.listing) && data.listing.length > 0 
    ? data.listing[0]?.host_id 
    : (data.listing as any)?.host_id;
  
  if (hostId) {
    try {
      console.log(`[cancelGuestBooking] Sending cancellation notification to host ${hostId}`);
      const channelName = `booking-notifications-${hostId}`;
      
      await supabase
        .channel(channelName)
        .send({
          type: 'broadcast',
          event: 'booking_cancelled',
          payload: {
            bookingId: data.id,
            listingId: data.listing_id,
            listingTitle: mappedBooking.listingTitle || 'Annonce PUOL',
            guestName: mappedBooking.guestName || 'Un voyageur',
            checkInDate: data.checkin_date,
            checkOutDate: data.checkout_date,
            cancelledAt: new Date().toISOString(),
          },
        });
      
      console.log(`[cancelGuestBooking] Cancellation notification sent to host ${hostId}`);
    } catch (notificationError) {
      console.warn(`[cancelGuestBooking] Failed to send cancellation notification:`, notificationError);
      // Ne pas échouer la cancellation si la notification échoue
    }
  }
  
  return mappedBooking;
};
