import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PolicyModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ visible, onClose, onAccept }) => {
  const handleAccept = () => {
    onAccept();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>PUOL</Text>
          </View>

          <Text style={styles.title}>Politique de paiement et de remboursement</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.contentContainer}>
              <Text style={styles.paragraph}>Une fois votre réservation validée et le paiement effectué,</Text>

              <View style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Vous disposez d'un délai maximum de 24 heures après paiement pour annuler votre réservation.
                </Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Si vous annulez dans les 24 heures → vous serez remboursé à 50 % du montant versé.
                </Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Si vous dépassez ce délai → aucun remboursement ne sera effectué.
                </Text>
              </View>

              <View style={styles.bulletPoint}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  En confirmant votre paiement, vous reconnaissez avoir pris connaissance de cette politique.
                </Text>
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.acceptButton} onPress={handleAccept} activeOpacity={0.8}>
            <Text style={styles.acceptButtonText}>👉 J'ai lu et j'accepte</Text>
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
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxWidth: 450,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    maxHeight: '80%',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  closeIcon: {
    fontSize: 20,
    color: '#374151',
    fontWeight: '600',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  logoText: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#2ECC71',
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  scrollView: {
    maxHeight: 300,
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  contentContainer: {
    gap: 16,
  },
  paragraph: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  bulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bullet: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  acceptButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default PolicyModal;
