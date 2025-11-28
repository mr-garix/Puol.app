import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PaymentSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  onPrimaryAction: () => void;
  primaryButtonLabel?: string;
  title?: string;
  message?: string;
}

export const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  visible,
  onClose,
  onPrimaryAction,
  primaryButtonLabel = 'Voir ma réservation',
  title = 'Paiement réussi !',
  message = 'Votre réservation a été confirmée. Vous recevrez une notification avec tous les détails.',
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.successIcon}>
            <Text style={styles.successCheckmark}>✓</Text>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity style={styles.primaryButton} onPress={onPrimaryAction} activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryButton} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.secondaryButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2ECC71',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successCheckmark: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default PaymentSuccessModal;
