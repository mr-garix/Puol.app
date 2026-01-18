import React, { useEffect } from 'react';
import { useSessionRefresh } from '@/src/hooks/useSessionRefresh';
import { setupPaymentPreservationListener, repairAllPaymentsRelatedIds } from '@/src/lib/services/paymentPreservation';
import { setupPaymentWebhookFixer } from '@/src/lib/services/paymentWebhookFix';

export const SessionRefreshManager = () => {
  useSessionRefresh();

  // Configurer les listeners de préservation du related_id et réparer les paiements existants
  useEffect(() => {
    console.log('[SessionRefreshManager] 🔧 Initialisation de la préservation du related_id');
    
    // Réparer les paiements existants qui ont perdu leur related_id
    void repairAllPaymentsRelatedIds();
    
    // Configurer le listener de préservation générale
    const preservationSubscription = setupPaymentPreservationListener();
    
    // Configurer le listener spécifique pour les webhooks PSP
    const webhookFixerSubscription = setupPaymentWebhookFixer();
    
    return () => {
      preservationSubscription?.unsubscribe();
      webhookFixerSubscription?.unsubscribe();
    };
  }, []);

  return null;
};
