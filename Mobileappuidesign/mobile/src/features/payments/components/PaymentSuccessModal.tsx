import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useEffect } from 'react';

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
  useEffect(() => {
    console.log('[PaymentSuccessModal] visible:', visible);
  }, [visible]);

  const Content = (
    <View style={styles.modalContent}>
      <View style={styles.successIcon}>
        <Text style={styles.successCheckmark}>✓</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => {
          console.log('[PaymentSuccessModal] primary action (Voir ma réservation)');
          onPrimaryAction();
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.primaryButtonText}>{primaryButtonLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          console.log('[PaymentSuccessModal] secondary action (Fermer)');
          onClose();
        }}
        activeOpacity={0.8}
      >
        <Text style={styles.secondaryButtonText}>Fermer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        statusBarTranslucent
        presentationStyle="overFullScreen"
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => {
            console.log('[PaymentSuccessModal] overlay press -> close');
            onClose();
          }}
        >
          <TouchableOpacity
            style={styles.modalWrapper}
            activeOpacity={1}
            onPress={() => console.log('[PaymentSuccessModal] modal tapped')}
          >
            {Content}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {visible && (
        <View style={styles.fallbackOverlay} pointerEvents="auto">
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => {
              console.log('[PaymentSuccessModal][fallback] overlay press -> close');
              onClose();
            }}
          >
            <TouchableOpacity
              style={styles.modalWrapper}
              activeOpacity={1}
              onPress={() => console.log('[PaymentSuccessModal][fallback] modal tapped')}
            >
              {Content}
            </TouchableOpacity>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    width: '100%',
    height: '100%',
    zIndex: 99999,
  },
  fallbackOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99998,
    elevation: 50,
  },
  modalWrapper: {
    width: '100%',
    maxWidth: 400,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
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
