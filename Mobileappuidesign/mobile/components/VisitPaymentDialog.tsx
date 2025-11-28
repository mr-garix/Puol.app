import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface VisitPaymentDialogProps {
  visible: boolean;
  onClose: () => void;
  onContinue: () => void;
}

export const VisitPaymentDialog: React.FC<VisitPaymentDialogProps> = ({ visible, onClose, onContinue }) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Feather name="x" size={18} color="#6B7280" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Programmer une visite</Text>
            <Text style={styles.headerSubtitle}>Choisissez votre créneau de visite</Text>
          </View>

          <View style={styles.content}>
            <Text style={styles.label}>La visite coûte</Text>
            <Text style={styles.price}>5 000 FCFA</Text>

            <TouchableOpacity style={styles.continueButton} onPress={onContinue} activeOpacity={0.8}>
              <Text style={styles.continueButtonText}>Continuer</Text>
            </TouchableOpacity>
          </View>
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
    width: '100%',
    maxWidth: 420,
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  content: {
    alignItems: 'center',
  },
  label: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  price: {
    fontFamily: 'Manrope',
    fontSize: 40,
    fontWeight: '700',
    color: '#2ECC71',
    marginBottom: 40,
  },
  continueButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 24,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default VisitPaymentDialog;
