import React, { useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#2ECC71';
const DARK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

export default function UserListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const [modalType, setModalType] = useState<'bailleur' | 'hote' | null>(null);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleOpenModal = (type: 'bailleur' | 'hote') => {
    setModalType(type);
    setFullName('');
    setPhone('');
    setMessage('');
    setSubmitted(false);
  };

  const handleSubmit = () => {
    if (!fullName.trim() || !phone.trim()) {
      return;
    }
    setSubmitted(true);
  };

  const closeModal = () => {
    setModalType(null);
    setSubmitted(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.header,
            isAndroid && {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: 16,
              backgroundColor: '#FFFFFF',
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
              justifyContent: 'space-between',
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.navButton, isAndroid && styles.navButtonAndroid]}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Feather name="chevron-left" size={20} color={DARK} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Mes annonces</Text>
            <Text style={styles.headerSubtitle}>Publiez vos biens meublés ou non meublés</Text>
          </View>
          {isAndroid ? <View style={styles.headerSpacerAndroid} /> : null}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIconCircle}>
            <Feather name="home" size={26} color={PRIMARY} />
          </View>
          <Text style={styles.summaryTitle}>Vous n’avez pas d’annonce publiée</Text>
          <Text style={styles.summarySubtitle}>
            Demandez l’accès pour devenir bailleur ou hôte. Notre équipe vous accompagnera étape par étape pour publier sur PUOL.
          </Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => handleOpenModal('hote')} activeOpacity={0.85}>
              <Text style={styles.secondaryButtonText}>Devenir hôte</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={() => handleOpenModal('bailleur')} activeOpacity={0.85}>
              <Text style={styles.primaryButtonText}>Devenir bailleur</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Comment ça marche ?</Text>
          <View style={styles.infoStep}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoStepTitle}>Soumettez votre demande</Text>
              <Text style={styles.infoStepText}>
                Envoyez-nous vos informations et nous vous recontactons quand les publications seront ouvertes.
              </Text>
            </View>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoStepTitle}>Validez votre profil</Text>
              <Text style={styles.infoStepText}>
                L’équipe PUOL vérifie vos documents (titre de propriété, pièces, photos HD...).
              </Text>
            </View>
          </View>
          <View style={styles.infoStep}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoStepTitle}>Publiez vos annonces</Text>
              <Text style={styles.infoStepText}>
                Générez des visites et recevez des paiements sécurisés directement depuis l’app.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!modalType} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconCircle}>
                <Feather name="clipboard" size={18} color={PRIMARY} />
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  Demande {modalType === 'bailleur' ? 'bailleur' : 'hôte'}
                </Text>
                <Text style={styles.modalSubtitle}>La fonctionnalité arrive très bientôt</Text>
              </View>
            </View>

            {submitted ? (
              <View style={styles.modalBody}>
                <Text style={styles.modalMessage}>Merci ! Votre demande est enregistrée.</Text>
                <Text style={styles.modalDescription}>
                  Nous vous notifierons dès que vous pourrez publier vos annonces depuis l’app.
                </Text>
                <TouchableOpacity style={styles.primaryButton} onPress={closeModal} activeOpacity={0.85}>
                  <Text style={styles.primaryButtonText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <Text style={styles.modalMessage}>Laissez vos informations</Text>
                <Text style={styles.modalDescription}>
                  Nous vous contacterons pour vous donner l’accès à la publication.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Nom complet"
                  placeholderTextColor="#9CA3AF"
                  value={fullName}
                  onChangeText={setFullName}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Numéro de téléphone"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                />
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Message (facultatif)"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  value={message}
                  onChangeText={setMessage}
                />
                <TouchableOpacity
                  style={[styles.primaryButton, (!fullName.trim() || !phone.trim()) && styles.primaryButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={!fullName.trim() || !phone.trim()}
                  activeOpacity={0.85}
                >
                  <Text style={styles.primaryButtonText}>Envoyer la demande</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={closeModal}>
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
  navButtonAndroid: {
    borderWidth: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
  },
  headerSpacerAndroid: {
    width: 40,
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
  summaryCard: {
    margin: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    gap: 16,
  },
  summaryIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 24,
    backgroundColor: 'rgba(46,204,113,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
  },
  summarySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: PRIMARY,
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: DARK,
    fontWeight: '600',
  },
  infoCard: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
    gap: 14,
  },
  infoTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
  },
  infoStep: {
    flexDirection: 'row',
    gap: 12,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: 'rgba(46,204,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY,
  },
  infoStepTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: DARK,
  },
  infoStepText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    gap: 12,
  },
  modalIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 18,
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
  modalSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
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
  input: {
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
  textArea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  primaryButtonDisabled: {
    backgroundColor: '#A7F3D0',
  },
});
