import { useEffect, useRef, useState, useCallback } from 'react';
import { getPaymentByReference, getPaymentByRelatedId } from '@/src/lib/services/notchpay';

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'refunded';

export interface PaymentPollingResult {
  status: PaymentStatus;
  payment: any | null;
  isPolling: boolean;
  error: string | null;
}

/**
 * Hook pour écouter le statut d'un paiement via polling
 * Utile pour NotchPay où le webhook confirme le paiement
 */
export const usePaymentPolling = (params: {
  providerReference?: string;
  relatedId?: string;
  purpose?: 'booking' | 'booking_remaining' | 'visite';
  maxDurationMs?: number; // Durée max de polling (défaut: 90s)
  intervalMs?: number; // Intervalle entre les polls (défaut: 2s)
  enabled?: boolean; // Activer/désactiver le polling
  onSuccess?: (payment: any) => void;
  onFailed?: (payment: any) => void;
  onTimeout?: () => void;
}): PaymentPollingResult => {
  const {
    providerReference,
    relatedId,
    purpose,
    maxDurationMs = 90000, // 90 secondes
    intervalMs = 2000, // 2 secondes
    enabled = true,
    onSuccess,
    onFailed,
    onTimeout,
  } = params;

  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [payment, setPayment] = useState<any | null>(null);
  const [isPolling, setIsPolling] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const pollingTimeoutRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const maxDurationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const stopPolling = useCallback(() => {
    console.log('[usePaymentPolling] ⏹️ Arrêt du polling');
    setIsPolling(false);
    if (pollingTimeoutRef.current) {
      clearInterval(pollingTimeoutRef.current);
      pollingTimeoutRef.current = null;
    }
    if (maxDurationTimeoutRef.current) {
      clearTimeout(maxDurationTimeoutRef.current);
      maxDurationTimeoutRef.current = null;
    }
  }, []);

  const pollPayment = useCallback(async () => {
    try {
      if (!providerReference && (!relatedId || !purpose)) {
        console.warn('[usePaymentPolling] ⚠️ Paramètres insuffisants pour le polling');
        setError('Paramètres insuffisants');
        stopPolling();
        return;
      }

      let paymentData = null;

      // Chercher par provider_reference en priorité
      if (providerReference) {
        console.log('[usePaymentPolling] 🔍 Polling par provider_reference:', providerReference);
        paymentData = await getPaymentByReference(providerReference);
      } else if (relatedId && purpose) {
        console.log('[usePaymentPolling] 🔍 Polling par relatedId:', relatedId, purpose);
        paymentData = await getPaymentByRelatedId(relatedId, purpose);
      }

      if (!paymentData) {
        console.log('[usePaymentPolling] ⏳ Paiement pas encore trouvé, nouvelle tentative...');
        return;
      }

      console.log('[usePaymentPolling] 📊 Statut paiement:', paymentData.status);

      setPayment(paymentData);

      // Vérifier le statut
      if (paymentData.status === 'success') {
        console.log('[usePaymentPolling] ✅ Paiement réussi!');
        setStatus('success');
        stopPolling();
        onSuccess?.(paymentData);
      } else if (paymentData.status === 'failed') {
        console.log('[usePaymentPolling] ❌ Paiement échoué');
        setStatus('failed');
        stopPolling();
        onFailed?.(paymentData);
      } else if (paymentData.status === 'refunded') {
        console.log('[usePaymentPolling] 🔄 Paiement remboursé');
        setStatus('refunded');
        stopPolling();
      }
      // Si pending, continuer le polling
    } catch (err) {
      console.error('[usePaymentPolling] ❌ Erreur polling:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    }
  }, [providerReference, relatedId, purpose, stopPolling, onSuccess, onFailed]);

  // Effet principal pour le polling
  useEffect(() => {
    if (!enabled) {
      setIsPolling(false);
      return;
    }

    if (!providerReference && (!relatedId || !purpose)) {
      console.warn('[usePaymentPolling] ⚠️ Paramètres insuffisants');
      return;
    }

    console.log('[usePaymentPolling] 🚀 Démarrage du polling');
    setIsPolling(true);
    startTimeRef.current = Date.now();

    // Premier poll immédiat
    pollPayment();

    // Polling régulier
    pollingTimeoutRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      if (elapsedMs > maxDurationMs) {
        console.warn('[usePaymentPolling] ⏱️ Timeout du polling atteint');
        setStatus('pending');
        stopPolling();
        onTimeout?.();
        return;
      }
      pollPayment();
    }, intervalMs);

    // Timeout de sécurité
    maxDurationTimeoutRef.current = setTimeout(() => {
      console.warn('[usePaymentPolling] ⏱️ Durée max atteinte');
      setStatus('pending');
      stopPolling();
      onTimeout?.();
    }, maxDurationMs);

    return () => {
      stopPolling();
    };
  }, [enabled, providerReference, relatedId, purpose, pollPayment, stopPolling, maxDurationMs, intervalMs, onTimeout]);

  return {
    status,
    payment,
    isPolling,
    error,
  };
};

/**
 * Hook pour écouter les changements d'une réservation (booking)
 */
export const useBookingPaymentStatus = (bookingId: string | null) => {
  const [bookingPaymentStatus, setBookingPaymentStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bookingId) return;

    const fetchBookingStatus = async () => {
      try {
        setLoading(true);
        const { data, error } = await (await import('@/src/supabaseClient')).supabase
          .from('bookings')
          .select('payment_status')
          .eq('id', bookingId)
          .single();

        if (error) throw error;
        setBookingPaymentStatus(data?.payment_status ?? 'pending');
      } catch (err) {
        console.error('[useBookingPaymentStatus] Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookingStatus();

    // Polling toutes les 2 secondes
    const interval = setInterval(fetchBookingStatus, 2000);
    return () => clearInterval(interval);
  }, [bookingId]);

  return { bookingPaymentStatus, loading };
};

/**
 * Hook pour écouter les changements d'une visite (rental_visit)
 */
export const useVisitPaymentStatus = (visitId: string | null) => {
  const [visitPaymentStatus, setVisitPaymentStatus] = useState<string>('pending');
  const [visitStatus, setVisitStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visitId) return;

    const fetchVisitStatus = async () => {
      try {
        setLoading(true);
        const { data, error } = await (await import('@/src/supabaseClient')).supabase
          .from('rental_visits')
          .select('payment_status, status')
          .eq('id', visitId)
          .single();

        if (error) throw error;
        setVisitPaymentStatus(data?.payment_status ?? 'pending');
        setVisitStatus(data?.status ?? 'pending');
      } catch (err) {
        console.error('[useVisitPaymentStatus] Erreur:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVisitStatus();

    // Polling toutes les 2 secondes
    const interval = setInterval(fetchVisitStatus, 2000);
    return () => clearInterval(interval);
  }, [visitId]);

  return { visitPaymentStatus, visitStatus, loading };
};
