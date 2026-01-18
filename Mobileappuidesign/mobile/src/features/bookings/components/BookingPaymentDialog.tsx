import React from 'react';
import { Alert } from 'react-native';
import { PaymentModal } from '../../payments/components/PaymentModal';
import { useAuth } from '@/src/contexts/AuthContext';

interface BookingPaymentDialogProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hostProfileId: string;
  customerPrice: number; // Prix payé par le client (prix affiché)
  bookingId: string;
}

export const BookingPaymentDialog: React.FC<BookingPaymentDialogProps> = ({
  visible,
  onClose,
  onSuccess,
  hostProfileId,
  customerPrice,
  bookingId
}) => {
  const { supabaseProfile } = useAuth();

  if (!bookingId) {
    console.error('[BookingPaymentDialog] ❌ bookingId manquant, impossible de lancer le paiement');
    Alert.alert('Paiement', 'Réservation introuvable. Relance la création avant de payer.');
    return null;
  }

  return (
    <PaymentModal
      visible={visible}
      onClose={onClose}
      onSuccess={onSuccess}
      amount={customerPrice}
      title="Payer la réservation"
      description={`Confirmez votre paiement de ${customerPrice.toLocaleString()} FCFA`}
      purpose="booking"
      payerProfileId={supabaseProfile?.id}
      hostProfileId={hostProfileId}
      relatedId={bookingId}
      customerPrice={customerPrice}
    />
  );
};
