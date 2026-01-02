import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PaymentModal } from '../../payments/components/PaymentModal';
import { useAuth } from '@/src/contexts/AuthContext';

interface VisitPaymentDialogProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  hostProfileId?: string;
  visitId: string;
}

export const VisitPaymentDialog: React.FC<VisitPaymentDialogProps> = ({
  visible,
  onClose,
  onSuccess,
  hostProfileId,
  visitId
}) => {
  const { supabaseProfile } = useAuth();

  console.log('[VisitPaymentDialog] Rendering with props:', {
    visible,
    visitId,
    hostProfileId,
    payerProfileId: supabaseProfile?.id,
    supabaseProfileExists: !!supabaseProfile,
  });

  return (
    <PaymentModal
      visible={visible}
      onClose={onClose}
      onSuccess={onSuccess}
      amount={5000} // Prix fixe pour les visites
      title="Payer la visite"
      description="Confirmez votre paiement pour la visite"
      purpose="visit"
      payerProfileId={supabaseProfile?.id}
      hostProfileId={hostProfileId}
      relatedId={visitId}
    />
  );
};
