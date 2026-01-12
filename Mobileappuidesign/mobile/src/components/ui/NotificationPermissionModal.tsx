import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';

interface NotificationPermissionModalProps {
  visible: boolean;
  onAccept: () => void;
  onDismiss?: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  visible,
  onAccept,
  onDismiss,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('[NotificationPermissionModal] visible:', visible);
  }, [visible]);

  const handleAccept = async () => {
    console.log('[NotificationPermissionModal] Accept button pressed');
    setIsLoading(true);
    try {
      await onAccept();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <Feather name="bell" size={40} color="#2ECC71" />
            </View>
          </View>

          <Text style={styles.title}>{`Autoriser Puol à vous envoyer\ndes notifications`}</Text>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            <Text style={styles.description}>
              Les notifications vous permettent de rester à jour avec vos réservations, d'être informé des nouvelles annonces et de recevoir les alertes sur vos paiements. Vous pouvez les désactiver à tout moment dans les paramètres.
            </Text>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.acceptButton, isLoading && styles.buttonDisabled]}
              onPress={handleAccept}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.acceptButtonText}>
                {isLoading ? 'Activation...' : 'Activer les notifications'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dismissButton}
              onPress={onDismiss}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.dismissButtonText}>Plus tard</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '100%',
    maxWidth: 450,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 24,
    maxHeight: '85%',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(46, 204, 113, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 28,
  },
  scrollView: {
    maxHeight: 200,
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  description: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  acceptButton: {
    backgroundColor: '#2ECC71',
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dismissButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
