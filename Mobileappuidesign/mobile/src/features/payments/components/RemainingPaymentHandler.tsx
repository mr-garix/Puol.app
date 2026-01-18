import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { PaymentModal } from './PaymentModal';
import { useReservations } from '@/src/contexts/ReservationContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';

export const RemainingPaymentHandler: React.FC = () => {
  const { pendingRemainingPayment, clearPendingRemainingPayment, refreshReservations } = useReservations();
  const { supabaseProfile } = useAuth();

  const handlePaymentSuccess = async () => {
    if (!pendingRemainingPayment) return;

    try {
      console.log('[RemainingPaymentHandler] Payment success - webhook will update booking status');
      
      // ⚠️ NE PAS mettre à jour booking.payment_status côté app
      // Le webhook mettra à jour:
      // - payments.status = 'success'
      // - bookings.payment_status = 'paid'
      // - bookings.remaining_payment_status = 'paid'
      
      // Rafraîchir les réservations pour mettre à jour l'état depuis la DB
      await refreshReservations();
      
      // Afficher une confirmation
      Alert.alert(
        'Paiement confirmé', 
        'Le reste de votre paiement a été traité avec succès. Votre réservation est maintenant complètement payée.',
        [{ text: 'OK', onPress: clearPendingRemainingPayment }]
      );
    } catch (error) {
      console.error('[RemainingPaymentHandler] Unexpected error:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors du traitement du paiement');
    }
  };

  const handleClose = () => {
    if (pendingRemainingPayment?.remainingPaymentStatus === 'requested') {
      Alert.alert(
        'Paiement requis',
        'Le paiement du solde est requis pour finaliser votre réservation. Vous ne pouvez pas fermer cette fenêtre.',
        [{ text: 'OK' }]
      );
      return;
    }
    clearPendingRemainingPayment();
  };

  if (!pendingRemainingPayment) {
    return null;
  }

  // Formatter les dates pour l'affichage
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const infoMessage = `Paiement du solde pour votre séjour à ${pendingRemainingPayment.propertyTitle} du ${formatDate(pendingRemainingPayment.checkInDate)} au ${formatDate(pendingRemainingPayment.checkOutDate)}.`;

  return (
    <PaymentModal
      visible={true}
      onClose={handleClose}
      onSuccess={handlePaymentSuccess}
      amount={pendingRemainingPayment.amountRemaining}
      title="Paiement du solde"
      description="Finalisez votre réservation"
      infoMessage={infoMessage}
      payerProfileId={supabaseProfile?.id}
      relatedId={pendingRemainingPayment.id}
      purpose="booking_remaining"
      customerPhone={supabaseProfile?.phone}
    />
  );
};
