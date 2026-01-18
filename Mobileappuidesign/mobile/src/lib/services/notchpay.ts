import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/types/supabase.generated';
import * as WebBrowser from 'expo-web-browser';

type PaymentInsert = Database['public']['Tables']['payments']['Insert'];

// Configuration des frais
const VISIT_AMOUNT = 5000; // FCFA
const PLATFORM_FEE_PERCENT = 0.10; // 10%

/**
 * Calcule les montants pour une réservation
 * @param customerPrice - Prix payé par le client (prix affiché = prix host + 10%)
 * @returns Montant total, frais plateforme, montant pour le host
 */
export const calculateReservationAmounts = (customerPrice: number) => {
  const hostOriginalPrice = Math.round(customerPrice / 1.1);
  const platformFee = customerPrice - hostOriginalPrice;
  const hostAmount = hostOriginalPrice;
  
  return {
    totalAmount: customerPrice,
    platformFee,
    hostAmount,
  };
};

/**
 * Génère une clé d'idempotence UNIQUE pour chaque tentative de paiement
 * Inclut un timestamp pour garantir l'unicité à chaque appel
 * @param params - Paramètres incluant relatedId (UUID en string)
 */
export const generateIdempotencyKey = (params: {
  purpose: 'booking' | 'booking_remaining' | 'visite';
  relatedId: string; // UUID en string
  payerProfileId: string;
  amount: number;
}): string => {
  const timestamp = Date.now();
  return `${params.purpose}:${params.relatedId}:${params.payerProfileId}:${params.amount}:${timestamp}`;
};

/**
 * Crée une ligne de paiement PENDING pour NotchPay
 * (Ne crée PAS les host_earnings - ceux-ci seront créés après confirmation du webhook)
 */
export const createPendingPaymentForNotchPay = async (params: {
  payerProfileId: string;
  purpose: 'booking' | 'booking_remaining' | 'visite';
  relatedId: string;
  amount: number;
  currency?: string;
  channel: 'cm.mtn' | 'cm.orange' | 'card';
  customerPrice?: number; // Pour les bookings
}): Promise<{ payment: any; idempotencyKey: string }> => {
  const {
    payerProfileId,
    purpose,
    relatedId,
    amount,
    currency = 'XAF',
    channel,
    customerPrice,
  } = params;

  try {
    if (!relatedId) {
      throw new Error('related_id_required');
    }

    console.log('[createPendingPaymentForNotchPay] 🔵 Création paiement pending NotchPay');
    console.log('[createPendingPaymentForNotchPay] Paramètres:', {
      purpose,
      relatedId,
      amount,
      channel,
    });

    // Générer clé d'idempotence
    const idempotencyKey = generateIdempotencyKey({
      purpose,
      relatedId,
      payerProfileId,
      amount,
    });

    // Vérifier si un paiement avec cette clé existe déjà
    const { data: existingPayment, error: checkError } = await supabase
      .from('payments')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    // Si un paiement existe déjà, le retourner
    if (existingPayment) {
      console.log('[createPendingPaymentForNotchPay] ⚠️ Paiement existant trouvé:', existingPayment.id);
      return { payment: existingPayment, idempotencyKey };
    }

    // Créer le paiement en status PENDING
    const paymentPayload: PaymentInsert = {
      payer_profile_id: payerProfileId,
      purpose,
      related_id: relatedId,
      amount,
      currency,
      provider: 'notchpay',
      provider_channel: channel,
      status: 'pending', // ✅ PENDING au lieu de SUCCESS
      idempotency_key: idempotencyKey,
      provider_reference: null, // Sera rempli après init NotchPay
      provider_payment_url: null,
      raw_provider_payload: null,
      failure_reason: null,
      client_payload: customerPrice ? { customerPrice } : null,
      paid_at: null,
    };

    console.log('[createPendingPaymentForNotchPay] 💳 Payload paiement:', paymentPayload);

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(paymentPayload)
      .select()
      .single();

    if (paymentError) {
      console.error('[createPendingPaymentForNotchPay] ❌ Erreur création paiement:', paymentError);
      throw paymentError;
    }

    console.log('[createPendingPaymentForNotchPay] ✅ Paiement créé:', {
      id: payment?.id,
      status: payment?.status,
      purpose: payment?.purpose,
      related_id: payment?.related_id,
    });

    // ✅ VÉRIFICATION: related_id DOIT être présent
    if (!payment?.related_id) {
      console.error('[createPendingPaymentForNotchPay] ❌ ERREUR: related_id est NULL ou undefined!');
      console.error('[createPendingPaymentForNotchPay] Paiement complet:', payment);
    } else {
      console.log('[createPendingPaymentForNotchPay] ✅ related_id inséré correctement:', payment.related_id);
    }

    return { payment, idempotencyKey };
  } catch (error) {
    console.error('[createPendingPaymentForNotchPay] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Appelle l'edge function pour initialiser le paiement NotchPay
 * Retourne la référence et l'URL de paiement (si disponible)
 * 
 * L'UX 2 modes se gère côté app selon locked_channel et presence authorization_url:
 * - Si locked_channel == "card" ET authorization_url existe → WebView dans modale
 * - Si locked_channel == "cm.mtn" ou "cm.orange" → Modale "Confirme sur ton téléphone" (pas de WebView)
 * 
 * NOTE: Utilise fetch HTTP direct vers l'URL déployée (pas supabase.functions.invoke)
 */
export const initNotchPayPayment = async (params: {
  paymentId: string;
  amount: number;
  currency: string;
  phone: string;
  lockedCountry?: string;
  lockedChannel?: 'cm.mtn' | 'cm.orange' | 'card';
  description?: string;
  reference?: string;
}): Promise<{
  providerReference: string;
  authorizationUrl?: string;
  providerChannel?: string;
  action?: string | null;
  confirmMessage?: string | null;
}> => {
  try {
    console.log('[initNotchPayPayment] 🔵 Initialisation paiement NotchPay');
    console.log('[initNotchPayPayment] Paramètres:', {
      paymentId: params.paymentId,
      amount: params.amount,
      phone: params.phone,
      lockedChannel: params.lockedChannel,
    });

    // URL de l'Edge Function déployée sur Supabase Studio
    const EDGE_FUNCTION_URL = 'https://cdqthqbtpsqhatzjihqq.supabase.co/functions/v1/notchpay_init_payment';
    const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

    // Appeler l'edge function via fetch HTTP direct
    console.log('[initNotchPayPayment] 📤 Envoi requête vers:', EDGE_FUNCTION_URL);
    console.log('[initNotchPayPayment] 📋 Body:', {
      payment_id: params.paymentId,
      amount: params.amount,
      currency: params.currency,
      phone: params.phone,
      locked_country: params.lockedCountry || 'CM',
      locked_channel: params.lockedChannel,
    });

    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        payment_id: params.paymentId,
        amount: params.amount,
        currency: params.currency,
        phone: params.phone,
        locked_country: params.lockedCountry || 'CM',
        locked_channel: params.lockedChannel,
        description: params.description,
        reference: params.reference,
      }),
    });

    console.log('[initNotchPayPayment] 📥 Réponse HTTP status:', res.status);
    console.log('[initNotchPayPayment] 📥 Headers:', {
      contentType: res.headers.get('content-type'),
    });

    const data = await res.json().catch((err) => {
      console.error('[initNotchPayPayment] ❌ Erreur parsing JSON:', err);
      return {};
    });

    console.log('[initNotchPayPayment] 📥 Réponse complète:', JSON.stringify(data, null, 2));

    if (!res.ok) {
      console.error('[initNotchPayPayment] ❌ Erreur edge function (HTTP non-ok):', {
        status: res.status,
        statusText: res.statusText,
        data,
      });
      
      // Afficher plus de détails pour les erreurs 403
      if (res.status === 403) {
        console.error('[initNotchPayPayment] 🔐 Erreur d\'autorisation (403)');
        console.error('[initNotchPayPayment] Message d\'erreur:', data?.message || data?.error);
        console.error('[initNotchPayPayment] Détails:', data);
      }
      
      // Récupérer le message d'erreur de NotchPay (peut être dans data.response.message ou dans data.response.errors['data.phone'])
      const phoneErrors = (data?.response?.errors || data?.errors)?.['data.phone'];
      const phoneErrorMessage = Array.isArray(phoneErrors) && phoneErrors.length > 0 ? phoneErrors[0] : null;
      const notchPayErrorMessage = phoneErrorMessage || data?.response?.message || data?.message || data?.error;
      const errorMessage = notchPayErrorMessage ?? `NotchPay init_payment failed (HTTP ${res.status})`;
      
      // Créer une erreur avec le message de NotchPay pour permettre un message client-friendly côté UI
      const error = new Error(errorMessage);
      (error as any).notchPayMessage = notchPayErrorMessage;
      throw error;
    }

    console.log('[initNotchPayPayment] ✅ Réponse edge function:', {
      reference: data.provider_reference,
      hasAuthUrl: !!data.authorization_url,
      channel: data.provider_channel,
      action: data.action,
      hasConfirmMessage: !!data.confirm_message,
    });

    return {
      providerReference: data.provider_reference,
      authorizationUrl: data.authorization_url,
      providerChannel: data.provider_channel,
      action: data.action ?? null,
      confirmMessage: data.confirm_message ?? null,
    };
  } catch (error) {
    console.error('[initNotchPayPayment] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Récupère le statut d'un paiement par provider_reference
 */
export const getPaymentByReference = async (
  providerReference: string
): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('provider_reference', providerReference)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data ?? null;
  } catch (error) {
    console.error('[getPaymentByReference] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Récupère le statut d'un paiement par related_id et purpose
 */
export const getPaymentByRelatedId = async (
  relatedId: string,
  purpose: 'booking' | 'booking_remaining' | 'visite'
): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('related_id', relatedId)
      .eq('purpose', purpose)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data ?? null;
  } catch (error) {
    console.error('[getPaymentByRelatedId] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Récupère les paiements d'un utilisateur
 */
export const getUserPayments = async (payerProfileId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payer_profile_id', payerProfileId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error('[getUserPayments] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Ouvre l'URL de paiement NotchPay dans un navigateur in-app
 * @param authorizationUrl - URL retournée par l'Edge Function
 * @returns Résultat de l'ouverture du navigateur
 */
export const openPaymentUrl = async (
  authorizationUrl: string
): Promise<WebBrowser.WebBrowserResult> => {
  try {
    console.log('[openPaymentUrl] 🌐 Ouverture URL de paiement:', authorizationUrl);

    if (!authorizationUrl) {
      throw new Error('URL de paiement manquante');
    }

    const result = await WebBrowser.openBrowserAsync(authorizationUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      dismissButtonStyle: 'close',
      toolbarColor: '#000000',
      controlsColor: '#FFFFFF',
    });

    console.log('[openPaymentUrl] ✅ Navigateur fermé avec résultat:', result.type);
    return result;
  } catch (error) {
    console.error('[openPaymentUrl] ❌ Erreur ouverture navigateur:', error);
    throw error;
  }
};

/**
 * Récupère le statut d'un paiement par son ID
 */
export const getPaymentById = async (paymentId: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data ?? null;
  } catch (error) {
    console.error('[getPaymentById] ❌ Erreur:', error);
    throw error;
  }
};

/**
 * Écoute les changements de statut d'un paiement en temps réel via Supabase Realtime
 * Retourne immédiatement quand le statut change en success/failed
 * @param paymentId - ID du paiement à surveiller
 * @param options - Options d'écoute
 * @returns Le paiement avec son statut final
 */
export const watchPaymentStatus = async (
  paymentId: string,
  options?: {
    maxDurationMs?: number;
    onStatusChange?: (status: string) => void;
  }
): Promise<{ payment: any; timedOut: boolean }> => {
  const maxDurationMs = options?.maxDurationMs ?? 300000; // 5 minutes par défaut
  const startTime = Date.now();

  console.log('[watchPaymentStatus] 👁️ Écoute des changements de statut pour payment:', paymentId);

  return new Promise((resolve) => {
    let subscription: any = null;
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

    // Fonction de nettoyage
    const cleanup = () => {
      if (subscription) {
        console.log('[watchPaymentStatus] 🧹 Arrêt de l\'écoute');
        supabase.removeChannel(subscription);
      }
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    };

    // Timeout de sécurité
    timeoutHandle = setTimeout(() => {
      console.warn('[watchPaymentStatus] ⏱️ Timeout atteint');
      cleanup();
      resolve({ payment: null, timedOut: true });
    }, maxDurationMs);

    // Écouter les changements en temps réel
    subscription = supabase
      .channel(`payment:${paymentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `id=eq.${paymentId}`,
        },
        async (payload) => {
          const payment = payload.new;
          console.log('[watchPaymentStatus] 📊 Changement détecté:', {
            id: payment.id,
            status: payment.status,
          });

          options?.onStatusChange?.(payment.status);

          // Si le statut est final, résoudre
          if (payment.status === 'success' || payment.status === 'failed') {
            console.log('[watchPaymentStatus] ✅ Statut final atteint:', payment.status);
            cleanup();
            resolve({ payment, timedOut: false });
          }
        }
      )
      .subscribe((status) => {
        console.log('[watchPaymentStatus] 🔌 Statut de la souscription:', status);
      });
  });
};

/**
 * Poll le statut d'un paiement jusqu'à success/failed ou timeout
 * @param paymentId - ID du paiement à surveiller
 * @param options - Options de polling
 * @returns Le paiement avec son statut final
 */
export const pollPaymentStatus = async (
  paymentId: string,
  options?: {
    maxDurationMs?: number;
    intervalMs?: number;
    onStatusChange?: (status: string) => void;
  }
): Promise<{ payment: any; timedOut: boolean }> => {
  const maxDurationMs = options?.maxDurationMs ?? 90000; // 90 secondes
  const intervalMs = options?.intervalMs ?? 2500; // 2.5 secondes
  const startTime = Date.now();

  console.log('[pollPaymentStatus] 🔄 Début du polling pour payment:', paymentId);

  return new Promise((resolve) => {
    const poll = async () => {
      try {
        const payment = await getPaymentById(paymentId);

        if (!payment) {
          console.log('[pollPaymentStatus] ⏳ Paiement pas encore trouvé...');
        } else {
          console.log('[pollPaymentStatus] 📊 Statut actuel:', payment.status);
          options?.onStatusChange?.(payment.status);

          if (payment.status === 'success' || payment.status === 'failed') {
            console.log('[pollPaymentStatus] ✅ Statut final atteint:', payment.status);
            resolve({ payment, timedOut: false });
            return;
          }
        }

        // Vérifier le timeout
        if (Date.now() - startTime > maxDurationMs) {
          console.warn('[pollPaymentStatus] ⏱️ Timeout atteint');
          resolve({ payment: payment ?? null, timedOut: true });
          return;
        }

        // Continuer le polling
        setTimeout(poll, intervalMs);
      } catch (error) {
        console.error('[pollPaymentStatus] ❌ Erreur:', error);
        // Continuer malgré l'erreur
        setTimeout(poll, intervalMs);
      }
    };

    // Premier poll immédiat
    poll();
  });
};

export type NotchPayChannel = 'cm.mtn' | 'cm.orange' | 'card';
