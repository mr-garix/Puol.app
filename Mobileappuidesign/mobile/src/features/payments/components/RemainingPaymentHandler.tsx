import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { PaymentModal } from './PaymentModal';
import { useReservations } from '@/src/contexts/ReservationContext';
import { supabase } from '@/src/supabaseClient';

export const RemainingPaymentHandler: React.FC = () => {
  const { pendingRemainingPayment, clearPendingRemainingPayment, refreshReservations } = useReservations();

  const handlePaymentSuccess = async () => {
    if (!pendingRemainingPayment) return;

    try {
      console.log('[RemainingPaymentHandler] Processing payment success for booking:', pendingRemainingPayment.id);
      
      // Mettre à jour la réservation avec le statut paid et montant restant à 0
      const { error } = await supabase
        .from('bookings')
        .update({ 
          remaining_payment_status: 'paid',
          remaining_amount: 0,
          remaining_nights: 0,
          remaining_paid: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', pendingRemainingPayment.id);

      if (error) {
        console.error('[RemainingPaymentHandler] Error updating payment status:', error);
        Alert.alert('Erreur', 'Une erreur est survenue lors de la confirmation du paiement');
        return;
      }

      console.log('[RemainingPaymentHandler] Payment confirmed successfully');
      
      // Rafraîchir les réservations pour mettre à jour l'état
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
    />
  );
};
