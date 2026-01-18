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
type RentalVisitInsert = Tables<'rental_visits'>['Insert'];

const VISIT_AMOUNT = 5000; // FCFA

export interface CreateRentalVisitForNotchPayInput {
  listingId: string;
  guestProfileId: string;
  visitDate: Date;
  visitTime: string;
  source?: string;
  notes?: string | null;
}

/**
 * Crée une visite avec paiement PENDING pour NotchPay
 * Le paiement sera confirmé par le webhook NotchPay
 */
export const createRentalVisitWithNotchPay = async (
  input: CreateRentalVisitForNotchPayInput
) => {
  console.log('[createRentalVisitWithNotchPay] 🔵 Début création visite NotchPay');
  console.log('[createRentalVisitWithNotchPay] Input:', input);

  const visitDateKey = input.visitDate.toISOString().split('T')[0];

  // Vérifier la disponibilité du créneau
  const { data: existingVisit, error: checkError } = await supabase
    .from('rental_visits')
    .select('id', { head: true, count: 'exact' })
    .eq('rental_listing_id', input.listingId)
    .eq('visit_date', visitDateKey)
    .eq('visit_time', input.visitTime)
    .neq('status', 'cancelled');

  if (checkError) {
    console.error('[createRentalVisitWithNotchPay] ❌ Erreur vérification créneau:', checkError);
    throw checkError;
  }

  if ((existingVisit?.length ?? 0) > 0) {
    const error = new Error('Cette plage horaire n\'est plus disponible.');
    (error as Error & { code?: string }).code = 'slot_unavailable';
    throw error;
  }

  // Créer la visite avec payment_status='pending'
  const payload: RentalVisitInsert = {
    rental_listing_id: input.listingId,
    guest_profile_id: input.guestProfileId,
    visit_date: visitDateKey,
    visit_time: input.visitTime,
    status: 'pending', // ✅ pending au lieu de confirmed
    payment_status: 'pending', // ✅ payment_status pending
    source: input.source ?? 'mobile_guest',
    notes: input.notes ?? null,
  };

  console.log('[createRentalVisitWithNotchPay] 📝 Payload visite:', payload);

  const { data, error } = await supabase
    .from('rental_visits')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    console.error('[createRentalVisitWithNotchPay] ❌ Erreur insertion visite:', error);
    throw error;
  }

  if (!data) {
    console.error('[createRentalVisitWithNotchPay] ❌ Aucune donnée retournée');
    throw new Error('Unable to create rental visit');
  }

  console.log('[createRentalVisitWithNotchPay] ✅ Visite créée:', data.id);

  // Envoyer heartbeat
  await sendHeartbeat(input.guestProfileId || null);

  return {
    id: data.id,
    listingId: data.rental_listing_id,
    guestProfileId: data.guest_profile_id,
    visitDate: data.visit_date,
    visitTime: data.visit_time,
    paymentStatus: data.payment_status,
  };
};

/**
 * Crée un paiement PENDING pour une visite et initialise NotchPay
 * Retourne les infos pour lancer le paiement côté app
 */
export const initVisitPaymentWithNotchPay = async (params: {
  visitId: string;
  guestProfileId: string;
  channel: 'cm.mtn' | 'cm.orange' | 'card';
  customerPhone: string;
  customerEmail?: string;
  customerName?: string;
}) => {
  const {
    visitId,
    guestProfileId,
    channel,
    customerPhone,
    customerEmail,
    customerName,
  } = params;

  try {
    console.log('[initVisitPaymentWithNotchPay] 🔵 Initialisation paiement visite NotchPay');

    // 1. Créer payment PENDING
    const { payment, idempotencyKey } = await createPendingPaymentForNotchPay({
      payerProfileId: guestProfileId,
      purpose: 'visite',
      relatedId: visitId,
      amount: VISIT_AMOUNT,
      channel,
    });

    console.log('[initVisitPaymentWithNotchPay] ✅ Payment créé:', payment.id);

    // 2. Initialiser NotchPay via edge function
    const notchPayResult = await initNotchPayPayment({
      paymentId: payment.id,
      amount: VISIT_AMOUNT,
      currency: 'XAF',
      phone: customerPhone,
      lockedCountry: 'CM',
      lockedChannel: channel,
      description: `Visit ${visitId}`,
      reference: visitId,
    });

    console.log('[initVisitPaymentWithNotchPay] ✅ NotchPay initialisé:', {
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
    console.error('[initVisitPaymentWithNotchPay] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Flow complet de paiement visite avec NotchPay
 * Crée la visite + payment + init NotchPay + ouvre URL + poll statut
 */
export const processVisitPaymentWithNotchPay = async (params: {
  visitId: string;
  guestProfileId: string;
  channel: 'cm.mtn' | 'cm.orange' | 'card';
  customerPhone: string;
  onStatusChange?: (status: string) => void;
}): Promise<{ success: boolean; payment?: any; timedOut?: boolean }> => {
  const { visitId, guestProfileId, channel, customerPhone, onStatusChange } = params;

  try {
    console.log('[processVisitPaymentWithNotchPay] 🚀 Démarrage flow complet');

    // 1. Init payment + NotchPay
    const initResult = await initVisitPaymentWithNotchPay({
      visitId,
      guestProfileId,
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
    console.error('[processVisitPaymentWithNotchPay] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Retry paiement visite (pending/failed/success)
 * Crée une NOUVELLE ligne de paiement avec nouveau payment_id
 * Même related_id (visit_id), nouveau idempotency_key
 */
export const retryVisitPaymentWithNotchPay = async (params: {
  visitId: string;
  guestProfileId: string;
  channel: 'cm.mtn' | 'cm.orange' | 'card';
  customerPhone: string;
  customerEmail?: string;
  customerName?: string;
}) => {
  const {
    visitId,
    guestProfileId,
    channel,
    customerPhone,
  } = params;

  try {
    console.log('[retryVisitPaymentWithNotchPay] 🔄 Retry paiement visite NotchPay');
    console.log('[retryVisitPaymentWithNotchPay] Visit:', visitId);

    // 1. Créer NOUVELLE ligne payment (nouveau payment_id, nouveau idempotency_key)
    const { payment, idempotencyKey } = await createPendingPaymentForNotchPay({
      payerProfileId: guestProfileId,
      purpose: 'visite',
      relatedId: visitId,
      amount: VISIT_AMOUNT,
      channel,
    });

    console.log('[retryVisitPaymentWithNotchPay] ✅ Nouveau payment créé:', payment.id);

    // 2. Initialiser NotchPay via edge function
    const notchPayResult = await initNotchPayPayment({
      paymentId: payment.id,
      amount: VISIT_AMOUNT,
      currency: 'XAF',
      phone: customerPhone,
      lockedCountry: 'CM',
      lockedChannel: channel,
      description: `Visit ${visitId} (Retry)`,
      reference: visitId,
    });

    console.log('[retryVisitPaymentWithNotchPay] ✅ NotchPay initialisé:', {
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
    console.error('[retryVisitPaymentWithNotchPay] ❌ Erreur:', error);
    throw error;
  }
};

export { openPaymentUrl, pollPaymentStatus };
