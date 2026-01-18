import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';
import { 
  createPendingPaymentForNotchPay, 
  initNotchPayPayment,
  openPaymentUrl,
  pollPaymentStatus,
} from '@/src/lib/services/notchpay';
import { sendHeartbeat } from '@/src/utils/heartbeat';

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T];
type BookingInsert = Tables<'bookings'>['Insert'];

export interface CreateBookingForNotchPayInput {
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

/**
 * Crée un booking avec paiement PENDING pour NotchPay
 * Le paiement sera confirmé par le webhook NotchPay
 */
/**
 * Crée un booking avec paiement PENDING pour NotchPay
 * NOTE: Cette fonction est simplifiée - elle crée le booking en status pending
 * Le paiement sera confirmé par le webhook NotchPay
 * 
 * Pour la logique complète (dates, validation), utiliser createBooking() du fichier index.ts
 * puis appeler initBookingPaymentWithNotchPay() après
 */
export const createBookingWithNotchPaySimplified = async (
  input: CreateBookingForNotchPayInput
) => {
  console.log('[createBookingWithNotchPaySimplified] 🔵 Début création booking NotchPay');
  console.log('[createBookingWithNotchPaySimplified] Input:', input);

  const isSplitPayment = input.nights >= 8;
  const enforcedRemainingNights = isSplitPayment ? Math.min(2, input.nights) : 0;
  const enforcedDepositNights = Math.max(input.nights - enforcedRemainingNights, 0);
  const enforcedRemainingAmount = enforcedRemainingNights * input.nightlyPrice;
  const enforcedDepositAmount = Math.max(input.totalPrice - enforcedRemainingAmount, 0);

  const inferredHasDiscount = input.hasDiscount ?? Boolean(input.discountAmount && input.discountAmount > 0);
  const normalizedDiscountAmount = inferredHasDiscount ? input.discountAmount ?? 0 : null;
  const normalizedDiscountPercent = inferredHasDiscount ? input.discountPercent ?? null : null;

  const paymentScheme: 'full' | 'split' = isSplitPayment ? 'split' : 'full';
  // ✅ IMPORTANT: payment_status = 'pending' au lieu de 'paid'
  const paymentStatus: 'pending' | 'partially_paid' = isSplitPayment ? 'partially_paid' : 'pending';
  const depositPaid = false; // ✅ Pas encore payé
  const remainingPaid = false;

  const payload: BookingInsert = {
    listing_id: input.listingId,
    guest_profile_id: input.guestProfileId,
    checkin_date: input.checkInDate,
    checkout_date: input.checkOutDate,
    nights: input.nights,
    nightly_price: input.nightlyPrice,
    total_price: input.totalPrice,
    payment_status: paymentStatus, // ✅ 'pending'
    payment_scheme: paymentScheme,
    status: input.status ?? 'pending',
    currency: input.currency ?? 'XAF',
    deposit_amount: enforcedDepositAmount,
    deposit_nights: enforcedDepositNights,
    deposit_paid: depositPaid, // ✅ false
    remaining_amount: enforcedRemainingAmount,
    remaining_nights: enforcedRemainingNights,
    remaining_paid: remainingPaid, // ✅ false
    has_discount: inferredHasDiscount,
    discount_amount: normalizedDiscountAmount,
    discount_percent: normalizedDiscountPercent,
    created_at: new Date().toISOString(),
  };

  console.log('[createBookingWithNotchPaySimplified] 📝 Payload booking:', payload);

  const { data, error } = await supabase
    .from('bookings')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[createBookingWithNotchPaySimplified] ❌ Erreur insertion booking:', error);
    throw error;
  }

  if (!data) {
    console.error('[createBookingWithNotchPaySimplified] ❌ Aucune donnée retournée');
    throw new Error('Unable to create booking');
  }

  console.log('[createBookingWithNotchPaySimplified] ✅ Booking créé:', data.id);

  // Envoyer heartbeat
  await sendHeartbeat(input.guestProfileId || null);

  return {
    id: data.id,
    listingId: data.listing_id,
    guestProfileId: data.guest_profile_id,
    paymentStatus: data.payment_status,
    totalPrice: data.total_price,
  };
};

/**
 * Crée un paiement PENDING pour un booking et initialise NotchPay
 * Retourne les infos pour lancer le paiement côté app
 */
export const initBookingPaymentWithNotchPay = async (params: {
  bookingId: string;
  guestProfileId: string;
  totalPrice: number;
  channel: 'cm.mtn' | 'cm.orange' | 'card';
  customerPhone: string;
  customerEmail?: string;
  customerName?: string;
}) => {
  const {
    bookingId,
    guestProfileId,
    totalPrice,
    channel,
    customerPhone,
    customerEmail,
    customerName,
  } = params;

  try {
    console.log('[initBookingPaymentWithNotchPay] 🔵 Initialisation paiement booking NotchPay');

    // 1. Créer payment PENDING
    const { payment, idempotencyKey } = await createPendingPaymentForNotchPay({
      payerProfileId: guestProfileId,
      purpose: 'booking',
      relatedId: bookingId,
      amount: totalPrice,
      channel,
      customerPrice: totalPrice,
    });

    console.log('[initBookingPaymentWithNotchPay] ✅ Payment créé:', payment.id);

    // 2. Initialiser NotchPay via edge function
    const notchPayResult = await initNotchPayPayment({
      paymentId: payment.id,
      amount: totalPrice,
      currency: 'XAF',
      phone: customerPhone,
      lockedCountry: 'CM',
      lockedChannel: channel,
      description: `Booking ${bookingId}`,
      reference: bookingId,
    });

    console.log('[initBookingPaymentWithNotchPay] ✅ NotchPay initialisé:', {
      reference: notchPayResult.providerReference,
      hasUrl: !!notchPayResult.authorizationUrl,
    });

    return {
      paymentId: payment.id,
      providerReference: notchPayResult.providerReference,
      authorizationUrl: notchPayResult.authorizationUrl,
      idempotencyKey,
    };
  } catch (error) {
    console.error('[initBookingPaymentWithNotchPay] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Crée un paiement PENDING pour le reste à payer d'un booking
 */
export const initBookingRemainingPaymentWithNotchPay = async (params: {
  bookingId: string;
  guestProfileId: string;
  remainingAmount: number;
  channel: 'cm.mtn' | 'cm.orange' | 'card';
  customerPhone: string;
  customerEmail?: string;
  customerName?: string;
}) => {
  const {
    bookingId,
    guestProfileId,
    remainingAmount,
    channel,
    customerPhone,
    customerEmail,
    customerName,
  } = params;

  try {
    console.log('[initBookingRemainingPaymentWithNotchPay] 🔵 Initialisation paiement remaining NotchPay');

    // 1. Créer payment PENDING avec purpose 'booking_remaining'
    const { payment, idempotencyKey } = await createPendingPaymentForNotchPay({
      payerProfileId: guestProfileId,
      purpose: 'booking_remaining',
      relatedId: bookingId,
      amount: remainingAmount,
      channel,
      customerPrice: remainingAmount,
    });

    console.log('[initBookingRemainingPaymentWithNotchPay] ✅ Payment créé:', payment.id);

    // 2. Initialiser NotchPay via edge function
    const notchPayResult = await initNotchPayPayment({
      paymentId: payment.id,
      amount: remainingAmount,
      currency: 'XAF',
      phone: customerPhone,
      lockedCountry: 'CM',
      lockedChannel: channel,
      description: `Booking Remaining ${bookingId}`,
      reference: `${bookingId}-remaining`,
    });

    console.log('[initBookingRemainingPaymentWithNotchPay] ✅ NotchPay initialisé:', {
      reference: notchPayResult.providerReference,
      hasUrl: !!notchPayResult.authorizationUrl,
    });

    return {
      paymentId: payment.id,
      providerReference: notchPayResult.providerReference,
      authorizationUrl: notchPayResult.authorizationUrl,
      idempotencyKey,
    };
  } catch (error) {
    console.error('[initBookingRemainingPaymentWithNotchPay] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Flow complet de paiement booking avec NotchPay
 * Init payment + NotchPay + ouvre URL + poll statut
 */
export const processBookingPaymentWithNotchPay = async (params: {
  bookingId: string;
  guestProfileId: string;
  totalPrice: number;
  channel: 'cm.mtn' | 'cm.orange' | 'card';
  customerPhone: string;
  onStatusChange?: (status: string) => void;
}): Promise<{ success: boolean; payment?: any; timedOut?: boolean }> => {
  const { bookingId, guestProfileId, totalPrice, channel, customerPhone, onStatusChange } = params;

  try {
    console.log('[processBookingPaymentWithNotchPay] 🚀 Démarrage flow complet');

    // 1. Init payment + NotchPay
    const initResult = await initBookingPaymentWithNotchPay({
      bookingId,
      guestProfileId,
      totalPrice,
      channel,
      customerPhone,
    });

    // 2. Ouvrir URL si disponible
    if (initResult.authorizationUrl) {
      await openPaymentUrl(initResult.authorizationUrl);
    }

    // 3. Poll statut
    const { payment, timedOut } = await pollPaymentStatus(initResult.paymentId, {
      maxDurationMs: 90000,
      intervalMs: 2500,
      onStatusChange,
    });

    if (timedOut) {
      return { success: false, payment, timedOut: true };
    }

    return {
      success: payment?.status === 'success',
      payment,
      timedOut: false,
    };
  } catch (error) {
    console.error('[processBookingPaymentWithNotchPay] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Flow complet de paiement remaining booking avec NotchPay
 */
export const processBookingRemainingPaymentWithNotchPay = async (params: {
  bookingId: string;
  guestProfileId: string;
  remainingAmount: number;
  channel: 'cm.mtn' | 'cm.orange' | 'card';
  customerPhone: string;
  onStatusChange?: (status: string) => void;
}): Promise<{ success: boolean; payment?: any; timedOut?: boolean }> => {
  const { bookingId, guestProfileId, remainingAmount, channel, customerPhone, onStatusChange } = params;

  try {
    console.log('[processBookingRemainingPaymentWithNotchPay] 🚀 Démarrage flow remaining');

    // 1. Init payment + NotchPay
    const initResult = await initBookingRemainingPaymentWithNotchPay({
      bookingId,
      guestProfileId,
      remainingAmount,
      channel,
      customerPhone,
    });

    // 2. Ouvrir URL si disponible
    if (initResult.authorizationUrl) {
      await openPaymentUrl(initResult.authorizationUrl);
    }

    // 3. Poll statut
    const { payment, timedOut } = await pollPaymentStatus(initResult.paymentId, {
      maxDurationMs: 90000,
      intervalMs: 2500,
      onStatusChange,
    });

    if (timedOut) {
      return { success: false, payment, timedOut: true };
    }

    return {
      success: payment?.status === 'success',
      payment,
      timedOut: false,
    };
  } catch (error) {
    console.error('[processBookingRemainingPaymentWithNotchPay] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Retry paiement booking (pending/failed/success)
 * Crée une NOUVELLE ligne de paiement avec nouveau payment_id
 * Même related_id (booking_id), nouveau idempotency_key
 */
export const retryBookingPaymentWithNotchPay = async (params: {
  bookingId: string;
  guestProfileId: string;
  totalPrice: number;
  channel: 'cm.mtn' | 'cm.orange' | 'card';
  customerPhone: string;
  customerEmail?: string;
  customerName?: string;
}) => {
  const {
    bookingId,
    guestProfileId,
    totalPrice,
    channel,
    customerPhone,
  } = params;

  try {
    console.log('[retryBookingPaymentWithNotchPay] 🔄 Retry paiement booking NotchPay');
    console.log('[retryBookingPaymentWithNotchPay] Booking:', bookingId);

    // 1. Créer NOUVELLE ligne payment (nouveau payment_id, nouveau idempotency_key)
    const { payment, idempotencyKey } = await createPendingPaymentForNotchPay({
      payerProfileId: guestProfileId,
      purpose: 'booking',
      relatedId: bookingId,
      amount: totalPrice,
      channel,
      customerPrice: totalPrice,
    });

    console.log('[retryBookingPaymentWithNotchPay] ✅ Nouveau payment créé:', payment.id);

    // 2. Initialiser NotchPay via edge function
    const notchPayResult = await initNotchPayPayment({
      paymentId: payment.id,
      amount: totalPrice,
      currency: 'XAF',
      phone: customerPhone,
      lockedCountry: 'CM',
      lockedChannel: channel,
      description: `Booking ${bookingId} (Retry)`,
      reference: bookingId,
    });

    console.log('[retryBookingPaymentWithNotchPay] ✅ NotchPay initialisé:', {
      reference: notchPayResult.providerReference,
      hasUrl: !!notchPayResult.authorizationUrl,
    });

    return {
      paymentId: payment.id,
      providerReference: notchPayResult.providerReference,
      authorizationUrl: notchPayResult.authorizationUrl,
      idempotencyKey,
    };
  } catch (error) {
    console.error('[retryBookingPaymentWithNotchPay] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Retry paiement remaining booking (pending/failed/success)
 * Crée une NOUVELLE ligne de paiement avec nouveau payment_id
 */
export const retryBookingRemainingPaymentWithNotchPay = async (params: {
  bookingId: string;
  guestProfileId: string;
  remainingAmount: number;
  channel: 'cm.mtn' | 'cm.orange' | 'card';
  customerPhone: string;
  customerEmail?: string;
  customerName?: string;
}) => {
  const {
    bookingId,
    guestProfileId,
    remainingAmount,
    channel,
    customerPhone,
  } = params;

  try {
    console.log('[retryBookingRemainingPaymentWithNotchPay] 🔄 Retry paiement remaining NotchPay');
    console.log('[retryBookingRemainingPaymentWithNotchPay] Booking:', bookingId);

    // 1. Créer NOUVELLE ligne payment
    const { payment, idempotencyKey } = await createPendingPaymentForNotchPay({
      payerProfileId: guestProfileId,
      purpose: 'booking_remaining',
      relatedId: bookingId,
      amount: remainingAmount,
      channel,
      customerPrice: remainingAmount,
    });

    console.log('[retryBookingRemainingPaymentWithNotchPay] ✅ Nouveau payment créé:', payment.id);

    // 2. Initialiser NotchPay via edge function
    const notchPayResult = await initNotchPayPayment({
      paymentId: payment.id,
      amount: remainingAmount,
      currency: 'XAF',
      phone: customerPhone,
      lockedCountry: 'CM',
      lockedChannel: channel,
      description: `Booking Remaining ${bookingId} (Retry)`,
      reference: `${bookingId}-remaining`,
    });

    console.log('[retryBookingRemainingPaymentWithNotchPay] ✅ NotchPay initialisé:', {
      reference: notchPayResult.providerReference,
      hasUrl: !!notchPayResult.authorizationUrl,
    });

    return {
      paymentId: payment.id,
      providerReference: notchPayResult.providerReference,
      authorizationUrl: notchPayResult.authorizationUrl,
      idempotencyKey,
    };
  } catch (error) {
    console.error('[retryBookingRemainingPaymentWithNotchPay] ❌ Erreur:', error);
    throw error;
  }
};

export { openPaymentUrl, pollPaymentStatus };
