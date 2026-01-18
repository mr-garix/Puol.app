import { useState, useCallback } from 'react';
import {
  createPendingPaymentForNotchPay,
  initNotchPayPayment,
  openPaymentUrl,
  watchPaymentStatus,
  type NotchPayChannel,
} from '@/src/lib/services/notchpay';
import { verifyPaymentRelatedId } from '@/src/lib/services/paymentFix';
import { repairAllPaymentsRelatedIds, setupPaymentPreservationListener } from '@/src/lib/services/paymentPreservation';

export type PaymentPurpose = 'booking' | 'booking_remaining' | 'visite';

export interface NotchPayPaymentState {
  isLoading: boolean;
  isPolling: boolean;
  paymentId: string | null;
  providerReference: string | null;
  lockedChannel: 'cm.mtn' | 'cm.orange' | 'card' | null;
  authorizationUrl: string | null;
  action: string | null;
  confirmMessage: string | null;
  status: 'idle' | 'creating' | 'initializing' | 'awaiting_payment' | 'polling' | 'success' | 'failed' | 'timeout' | 'error' | 'validation_error';
  error: string | null;
}

export interface StartPaymentParams {
  payerProfileId: string;
  purpose: PaymentPurpose;
  relatedId: string;
  amount: number;
  channel: NotchPayChannel;
  customerPhone: string;
  customerPrice?: number;
  description?: string;
}

export interface UseNotchPayPaymentResult extends NotchPayPaymentState {
  startPayment: (params: StartPaymentParams) => Promise<{ success: boolean; payment?: any }>;
  reset: () => void;
}

/**
 * Hook complet pour gérer un paiement NotchPay
 * Combine : création payment → init NotchPay → ouverture URL → polling statut
 */
export const useNotchPayPayment = (options?: {
  onSuccess?: (payment: any) => void;
  onFailed?: (payment: any) => void;
  onTimeout?: () => void;
  pollingMaxDurationMs?: number;
}): UseNotchPayPaymentResult => {
  const [state, setState] = useState<NotchPayPaymentState>({
    isLoading: false,
    isPolling: false,
    paymentId: null,
    providerReference: null,
    lockedChannel: null,
    authorizationUrl: null,
    action: null,
    confirmMessage: null,
    status: 'idle',
    error: null,
  });

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      isPolling: false,
      paymentId: null,
      providerReference: null,
      lockedChannel: null,
      authorizationUrl: null,
      action: null,
      confirmMessage: null,
      status: 'idle',
      error: null,
    });
  }, []);

  const startPayment = useCallback(
    async (params: StartPaymentParams): Promise<{ success: boolean; payment?: any }> => {
      const {
        payerProfileId,
        purpose,
        relatedId,
        amount,
        channel,
        customerPhone,
        customerPrice,
        description,
      } = params;

      try {
        console.log('[useNotchPayPayment] 🚀 Démarrage du paiement NotchPay');
        console.log('[useNotchPayPayment] Params:', { purpose, relatedId, amount, channel });

        // Réinitialiser le state avant de commencer une nouvelle tentative
        setState({
          isLoading: true,
          isPolling: false,
          paymentId: null,
          providerReference: null,
          lockedChannel: null,
          authorizationUrl: null,
          action: null,
          confirmMessage: null,
          status: 'creating',
          error: null,
        });

        // Étape 1: Créer le paiement PENDING

        const { payment, idempotencyKey } = await createPendingPaymentForNotchPay({
          payerProfileId,
          purpose,
          relatedId,
          amount,
          channel,
          customerPrice,
        });

        console.log('[useNotchPayPayment] ✅ Payment créé:', payment.id);

        setState((prev) => ({
          ...prev,
          paymentId: payment.id,
          status: 'initializing',
        }));

        // Étape 2: Initialiser NotchPay via Edge Function
        // Normaliser le téléphone au format E.164 (+237XXXXXXXXX par défaut)
        const digits = customerPhone.replace(/\D/g, '');
        let normalizedPhone = '';
        if (digits.startsWith('237')) {
          normalizedPhone = `+237${digits.slice(3)}`;
        } else if (digits.length === 9) {
          normalizedPhone = `+237${digits}`;
        } else if (digits.length > 0) {
          normalizedPhone = `+${digits}`;
        }
        console.log('[useNotchPayPayment] 📞 Téléphone normalisé (+237):', {
          original: customerPhone,
          normalized: normalizedPhone,
        });

        const notchPayResult = await initNotchPayPayment({
          paymentId: payment.id,
          amount,
          currency: 'XAF',
          phone: normalizedPhone,
          lockedCountry: 'CM',
          lockedChannel: channel,
          description: description || `${purpose} ${relatedId}`,
          reference: relatedId,
        });

        console.log('[useNotchPayPayment] ✅ NotchPay initialisé:', {
          reference: notchPayResult.providerReference,
          hasUrl: !!notchPayResult.authorizationUrl,
          channel: notchPayResult.providerChannel,
          action: notchPayResult.action,
          hasConfirmMessage: !!notchPayResult.confirmMessage,
        });

        setState((prev) => ({
          ...prev,
          providerReference: notchPayResult.providerReference,
          lockedChannel: notchPayResult.providerChannel as any,
          authorizationUrl: notchPayResult.authorizationUrl || null,
          action: notchPayResult.action || null,
          confirmMessage: notchPayResult.confirmMessage || null,
          status: 'awaiting_payment',
        }));

        // Étape 3: Gérer les 2 modes d'UX distincts côté app
        // Mode 1: Card (locked_channel == "card") + authorization_url → WebView dans modale
        // Mode 2: Mobile Money (cm.mtn / cm.orange) → Modale "Confirme sur ton téléphone" (pas de WebView)
        if (notchPayResult.providerChannel === 'card' && notchPayResult.authorizationUrl) {
          // Mode Card: Ouvrir WebView dans modale
          console.log('[useNotchPayPayment] 🌐 Mode Card - Ouverture WebView de paiement...');
          await openPaymentUrl(notchPayResult.authorizationUrl);
          console.log('[useNotchPayPayment] ✅ WebView fermée, début du polling...');
        } else if (notchPayResult.providerChannel === 'cm.mtn' || notchPayResult.providerChannel === 'cm.orange') {
          // Mode Mobile Money: Pas de WebView, afficher modale "Confirme sur ton téléphone"
          console.log('[useNotchPayPayment] 📱 Mode Mobile Money - Pas de WebView, polling direct...');
        }

        // Étape 4: Écouter les changements de statut en temps réel
        setState((prev) => ({
          ...prev,
          isPolling: true,
          status: 'polling',
        }));

        const { payment: finalPayment, timedOut } = await watchPaymentStatus(payment.id, {
          maxDurationMs: options?.pollingMaxDurationMs ?? 300000,
          onStatusChange: (status: string) => {
            console.log('[useNotchPayPayment] 📊 Statut changé:', status);
          },
        });

        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPolling: false,
        }));

        // Traiter le résultat
        if (timedOut) {
          console.warn('[useNotchPayPayment] ⏱️ Timeout - statut toujours pending, reste en polling');
          // Ne pas changer le statut à 'timeout', rester en 'polling' pour continuer à écouter
          // Le modal affichera "Confirmer ma réservation" avec le loader
          return { success: false, payment: finalPayment };
        }

        if (finalPayment?.status === 'success') {
          console.log('[useNotchPayPayment] ✅ Paiement réussi!');
          
          // Vérifier que le related_id est bien présent après validation
          const relatedId = await verifyPaymentRelatedId(payment.id);
          if (!relatedId) {
            console.warn('[useNotchPayPayment] ⚠️ related_id manquant après validation - tentative de correction');
          }
          
          setState((prev) => ({ ...prev, status: 'success' }));
          options?.onSuccess?.(finalPayment);
          return { success: true, payment: finalPayment };
        }

        if (finalPayment?.status === 'failed') {
          console.log('[useNotchPayPayment] ❌ Paiement échoué');
          setState((prev) => ({
            ...prev,
            status: 'failed',
            error: finalPayment.failure_reason || 'Paiement échoué',
          }));
          options?.onFailed?.(finalPayment);
          return { success: false, payment: finalPayment };
        }

        // Statut inconnu
        console.warn('[useNotchPayPayment] ⚠️ Statut inconnu:', finalPayment?.status);
        setState((prev) => ({ ...prev, status: 'error', error: 'Statut inconnu' }));
        return { success: false, payment: finalPayment };
      } catch (error) {
        console.error('[useNotchPayPayment] ❌ Erreur:', error);
        
        // Récupérer le message d'erreur de NotchPay
        let errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        const notchPayMessage = (error as any)?.notchPayMessage || errorMessage;
        
        // Vérifier si c'est une erreur de validation de numéro
        let isValidationError = false;
        let validationErrorMessage = '';
        
        if (notchPayMessage && typeof notchPayMessage === 'string') {
          const msgLower = notchPayMessage.toLowerCase();
          
          console.log('[useNotchPayPayment] 🔍 Message d\'erreur NotchPay:', msgLower);
          
          if (msgLower.includes('invalid cm orange') || msgLower.includes('orange money')) {
            isValidationError = true;
            validationErrorMessage = 'Veuillez vérifier que c\'est bien un numéro Orange Money';
            errorMessage = validationErrorMessage;
            console.log('[useNotchPayPayment] ✅ Erreur Orange détectée');
          } else if (msgLower.includes('invalid cm mtn') || msgLower.includes('mtn momo')) {
            isValidationError = true;
            validationErrorMessage = 'Veuillez vérifier que c\'est bien un numéro MTN MoMo';
            errorMessage = validationErrorMessage;
            console.log('[useNotchPayPayment] ✅ Erreur MTN détectée');
          } else if (msgLower.includes('invalid cm') || msgLower.includes('invalid mobile money')) {
            // Cas générique d'erreur de numéro Mobile Money (pour capturer d'autres messages NotchPay)
            isValidationError = true;
            validationErrorMessage = 'Veuillez vérifier que le numéro correspond bien à l\'opérateur choisi';
            errorMessage = validationErrorMessage;
            console.log('[useNotchPayPayment] ⚠️ Erreur Mobile Money générique détectée');
          }
        }
        
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isPolling: false,
          status: isValidationError ? 'validation_error' : 'error',
          error: errorMessage,
        }));
        return { success: false };
      }
    },
    [options]
  );

  return {
    ...state,
    startPayment,
    reset,
  };
};

export default useNotchPayPayment;
