import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const PRIMARY = '#2ECC71';
const DARK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

export default function UserContentsScreen() {
  const router = useRouter();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  const handleOpenModal = () => {
    setIsModalVisible(true);
    setPhoneNumber('');
    setRequestSubmitted(false);
  };

  const handleRequestAccess = () => {
    if (!phoneNumber.trim()) {
      return;
    }
    setRequestSubmitted(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={DARK} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Mes contenus</Text>
          <Text style={styles.headerSubtitle}>Les reels et guides que vous publierez ici</Text>
        </View>
      </View>

      <View style={styles.emptyCard}>
        <View style={styles.emptyIconCircle}>
          <Feather name="video" size={22} color={PRIMARY} />
        </View>
        <Text style={styles.emptyTitle}>0 contenu publié pour le moment</Text>
        <Text style={styles.emptySubtitle}>
          Partagez vos recommandations, vos visites ou vos bons plans PUOL. Nous préparons la fonctionnalité et nous vous
          informerons dès qu’elle sera disponible.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={handleOpenModal} activeOpacity={0.85}>
          <Text style={styles.primaryButtonText}>Publier un contenu</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <Feather name="activity" size={18} color={PRIMARY} />
              </View>
              <Text style={styles.modalTitle}>Arrive très bientôt</Text>
            </View>

            {requestSubmitted ? (
              <View style={styles.modalBody}>
                <Text style={styles.modalMessage}>Merci ! Votre demande est enregistrée.</Text>
                <Text style={styles.modalDescription}>
                  Nous vous enverrons un SMS dès que la publication de contenus sera ouverte.
                </Text>
                <TouchableOpacity style={styles.primaryButton} onPress={() => setIsModalVisible(false)} activeOpacity={0.85}>
                  <Text style={styles.primaryButtonText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <Text style={styles.modalMessage}>Laissez votre numéro pour être notifié</Text>
                <Text style={styles.modalDescription}>Nous vous informerons dès qu’il sera possible de publier.</Text>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="Ex: +237 6 99 00 11 22"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
                <TouchableOpacity
                  style={[styles.primaryButton, !phoneNumber.trim() && styles.primaryButtonDisabled]}
                  onPress={handleRequestAccess}
                  disabled={!phoneNumber.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Envoyer ma demande</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.secondaryButtonText}>Plus tard</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 14,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: DARK,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  emptyCard: {
    margin: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(46,204,113,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: PRIMARY,
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  primaryButtonDisabled: {
    backgroundColor: '#A7F3D0',
  },
  primaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(46,204,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
  },
  modalBody: {
    gap: 12,
  },
  modalMessage: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: DARK,
  },
  modalDescription: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: DARK,
    backgroundColor: '#FFFFFF',
  },
  secondaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  secondaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
    fontWeight: '600',
  },
});
