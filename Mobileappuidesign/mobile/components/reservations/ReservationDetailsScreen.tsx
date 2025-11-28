import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import type { ReservationRecord } from '@/src/contexts/ReservationContext';
import { useReservations } from '@/src/contexts/ReservationContext';
import { getPropertyById } from '@/src/data/properties';

export interface ReservationDetailsScreenProps {
  reservationId: string;
  onBack?: () => void;
}

const formatFullDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const ReservationDetailsScreen: React.FC<ReservationDetailsScreenProps> = ({ reservationId, onBack }) => {
  const { getReservationById, cancelReservation } = useReservations();
  const reservation = getReservationById(reservationId);
  const insets = useSafeAreaInsets();
  const [scrollY, setScrollY] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [isHostAvatarVisible, setIsHostAvatarVisible] = useState(false);
  const router = useRouter();

  const stickyOpacity = Math.min(scrollY / 120, 1);
  const isCancelled = reservation?.status === 'cancelled';

  const stayRange = useMemo(() => {
    if (!reservation) return { checkIn: '', checkOut: '' };
    return { checkIn: formatFullDate(reservation.checkInDate), checkOut: formatFullDate(reservation.checkOutDate) };
  }, [reservation]);

  if (!reservation) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: '#6B7280' }}>Réservation introuvable.</Text>
      </View>
    );
  }

  const statusConfig = (() => {
    switch (reservation.status) {
      case 'confirmed':
        return { label: 'Réservation confirmée', color: '#2ECC71', background: 'rgba(46,204,113,0.1)' };
      case 'cancelled':
        return { label: 'Réservation annulée', color: '#EF4444', background: 'rgba(239,68,68,0.1)' };
      default:
        return { label: 'En attente de confirmation', color: '#F97316', background: 'rgba(249,115,22,0.1)' };
    }
  })();

  const amountPaid = reservation.amountPaid ?? reservation.totalPrice;
  const totalAmount = reservation.totalPrice;
  const remainingAmount = reservation.amountRemaining ?? Math.max(totalAmount - amountPaid, 0);
  const hasOutstandingBalance = remainingAmount > 0.5;

  const propertyData = useMemo(() => getPropertyById(reservation.propertyId), [reservation.propertyId]);
  const displayAddress = propertyData?.location.address ?? reservation.propertyAddress;
  const displayLocation = propertyData
    ? `${propertyData.location.neighborhood}, ${propertyData.location.city}`
    : reservation.propertyLocation;
  const hostName = propertyData?.landlord.name ?? reservation.hostName;
  const hostAvatar = propertyData?.landlord.avatar ?? reservation.propertyImage;
  const hostRole = 'Hôte';

  const handleOpenMaps = () => {
    const encoded = encodeURIComponent(displayAddress);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
  };

  const handleCallHost = () => Linking.openURL(`tel:${reservation.hostPhone}`);
  const handleViewProperty = () => router.push({ pathname: '/property/[id]', params: { id: reservation.propertyId } });

  const confirmCancellation = () => {
    cancelReservation(reservation.id);
    setShowCancelModal(false);
    Alert.alert('Réservation annulée', 'Votre réservation a bien été annulée.');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View
        style={[styles.stickyHeader, {
          paddingTop: insets.top + 8,
          backgroundColor: `rgba(255,255,255,${stickyOpacity})`,
          borderBottomColor: `rgba(229,231,235,${stickyOpacity})`,
          borderBottomWidth: stickyOpacity > 0 ? StyleSheet.hairlineWidth : 0,
        }]}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: stickyOpacity > 0.5 ? '#F3F4F6' : 'rgba(255,255,255,0.8)' }]}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Feather name="arrow-left" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={(event) => setScrollY(event.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        <View style={styles.heroImageWrapper}>
          <Image source={{ uri: reservation.propertyImage }} style={styles.heroImage} />
        </View>

        <View style={styles.sheet}>
          <View style={[styles.statusPill, { backgroundColor: statusConfig.background }]}>
            <Text style={[styles.statusPillText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.propertyTitle}>{reservation.propertyTitle}</Text>

            <TouchableOpacity style={styles.mapsRow} onPress={handleOpenMaps} activeOpacity={0.8}>
              <Feather name="map" size={18} color="#2ECC71" />
              <View style={{ flex: 1 }}>
                <Text style={styles.mapsLabel}>Localisation</Text>
                <Text style={styles.mapsValue}>{displayLocation}</Text>
                <Text style={styles.mapsHint}>Cliquer pour voir le lieu dans Google Maps</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <InfoRow label="Date d'arrivée" value={stayRange.checkIn} icon="calendar" />
            <InfoRow label="Date de départ" value={stayRange.checkOut} icon="calendar" />
            <InfoRow label="Durée du séjour" value={`${reservation.nights} nuit${reservation.nights > 1 ? 's' : ''}`} icon="clock" />

            <View style={styles.divider} />

            <InfoRow label={hasOutstandingBalance ? 'Montant payé' : 'Montant réglé'} value={`${amountPaid.toLocaleString()} FCFA`} icon="credit-card" highlight />
            <InfoRow label="Total" value={`${totalAmount.toLocaleString()} FCFA`} icon="dollar-sign" />
            {hasOutstandingBalance && (
              <InfoRow label="Reste à payer" value={`${remainingAmount.toLocaleString()} FCFA`} icon="gift" />
            )}

            {!isCancelled && (
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCancelModal(true)} activeOpacity={0.85}>
                <Text style={styles.cancelButtonText}>Annuler la réservation</Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.hostCard}>
            <View style={styles.hostHeader}>
              <View style={styles.hostInfo}>
                <TouchableOpacity style={styles.hostAvatar} onPress={() => setIsHostAvatarVisible(true)} activeOpacity={0.85}>
                  {hostAvatar ? (
                    <Image source={{ uri: hostAvatar }} style={{ width: 56, height: 56, borderRadius: 28 }} />
                  ) : (
                    <Text style={{ fontSize: 24 }}>👤</Text>
                  )}
                </TouchableOpacity>
                <View>
                  <Text style={styles.hostName}>{hostName}</Text>
                  <Text style={styles.hostRole}>{hostRole}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.hostLink} onPress={handleViewProperty} activeOpacity={0.85}>
                <Feather name="external-link" size={14} color="#2ECC71" />
                <Text style={styles.hostLinkText}>Voir l'annonce</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.hostPhoneRow} onPress={handleCallHost} activeOpacity={0.85}>
              <Feather name="phone" size={16} color="#2ECC71" />
              <View>
                <Text style={styles.hostPhoneLabel}>Téléphone</Text>
                <Text style={styles.hostPhoneValue}>{reservation.hostPhone}</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.rulesCard} onPress={() => setShowRulesModal(true)} activeOpacity={0.8}>
            <View style={styles.rulesIconCircle}>
              <Feather name="alert-triangle" size={18} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rulesTitle}>Règles de réservation</Text>
              <Text style={styles.rulesSubtitle}>Cliquez pour voir les règles à respecter</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.agendaButton} onPress={() => setShowCalendarModal(true)} activeOpacity={0.8}>
            <Feather name="calendar" size={18} color="#2ECC71" />
            <Text style={styles.agendaButtonText}>Ajouter à mon agenda</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ConfirmationModal
        visible={showCancelModal}
        icon="alert-triangle"
        iconColor="#B91C1C"
        iconBackground="rgba(239,68,68,0.15)"
        title="Annuler la réservation ?"
        onClose={() => setShowCancelModal(false)}
        primaryLabel="Oui, annuler ma réservation"
        primaryAction={confirmCancellation}
        secondaryLabel="Non, revenir en arrière"
      >
        <Text style={styles.modalText}>• Si vous annulez avant 24h, vous serez remboursé à 50 % du montant.</Text>
        <Text style={styles.modalText}>• Si vous annulez après 24h, aucun remboursement ne sera effectué.</Text>
        <Text style={[styles.modalText, { marginTop: 8 }]}>Voulez-vous vraiment annuler cette réservation ?</Text>
      </ConfirmationModal>

      <ConfirmationModal
        visible={showRulesModal}
        icon="info"
        iconBackground="rgba(46,204,113,0.15)"
        iconColor="#2ECC71"
        title="Règles de réservation"
        primaryLabel="Compris"
        primaryButtonColor="#2ECC71"
        primaryButtonTextColor="#FFFFFF"
        onClose={() => setShowRulesModal(false)}
        primaryAction={() => setShowRulesModal(false)}
      >
        <Text style={styles.modalText}>Arrivez 10 minutes avant l'heure prévue pour faciliter l'état des lieux.</Text>
        <Text style={styles.modalText}>Si vous êtes en retard, appelez l'hôte avant l'heure prévue.</Text>
        <Text style={styles.modalText}>Au-delà de 24h, la réservation peut être annulée sans remboursement.</Text>
        <Text style={[styles.modalText, { marginTop: 8 }]}>Merci de respecter ces règles afin de garantir le bon déroulement de votre séjour.</Text>
      </ConfirmationModal>

      <ConfirmationModal
        visible={showCalendarModal}
        icon="calendar"
        iconBackground="rgba(46,204,113,0.15)"
        title="Ajouter à l'agenda"
        primaryLabel="Compris"
        onClose={() => setShowCalendarModal(false)}
        primaryAction={() => setShowCalendarModal(false)}
      >
        <Text style={[styles.modalText, { textAlign: 'center' }]}>Fonctionnalité à venir 🚀</Text>
      </ConfirmationModal>

      <Modal visible={isHostAvatarVisible} transparent animationType="fade" onRequestClose={() => setIsHostAvatarVisible(false)}>
        <TouchableOpacity style={styles.avatarOverlay} activeOpacity={1} onPress={() => setIsHostAvatarVisible(false)}>
          <View style={styles.avatarContent}>
            {hostAvatar && (
              <>
                <Image source={{ uri: hostAvatar }} style={styles.avatarFullImage} resizeMode="cover" />
                <TouchableOpacity style={styles.avatarCloseButton} onPress={() => setIsHostAvatarVisible(false)} activeOpacity={0.8}>
                  <Feather name="x" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const InfoRow = ({ label, value, icon, highlight }: { label: string; value: string; icon: React.ComponentProps<typeof Feather>['name']; highlight?: boolean }) => (
  <View style={styles.infoRowLine}>
    <View style={styles.infoRowIcon}>
      <Feather name={icon} size={16} color="#2ECC71" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.infoRowLabel}>{label}</Text>
      <Text style={[styles.infoRowValue, highlight && { color: '#2ECC71', fontWeight: '700' }]}>{value}</Text>
    </View>
  </View>
);

const ConfirmationModal = ({
  visible,
  icon,
  iconBackground,
  iconColor,
  title,
  children,
  primaryLabel,
  secondaryLabel,
  primaryAction,
  onClose,
  primaryButtonColor,
  primaryButtonTextColor,
}: {
  visible: boolean;
  icon: React.ComponentProps<typeof Feather>['name'];
  iconBackground: string;
  iconColor?: string;
  title: string;
  children?: React.ReactNode;
  primaryLabel: string;
  secondaryLabel?: string;
  primaryAction: () => void;
  onClose: () => void;
  primaryButtonColor?: string;
  primaryButtonTextColor?: string;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <View style={[styles.modalIconWrapper, { backgroundColor: iconBackground }] }>
          <Feather name={icon} size={22} color={iconColor ?? '#111827'} />
        </View>
        <Text style={styles.modalTitle}>{title}</Text>
        <View style={{ gap: 6 }}>{children}</View>
        <TouchableOpacity
          style={[styles.modalPrimaryButton, primaryButtonColor && { backgroundColor: primaryButtonColor }]}
          onPress={primaryAction}
          activeOpacity={0.85}
        >
          <Text
            style={[styles.modalPrimaryText, primaryButtonTextColor && { color: primaryButtonTextColor }]}
          >
            {primaryLabel}
          </Text>
        </TouchableOpacity>
        {secondaryLabel && (
          <TouchableOpacity style={styles.modalSecondaryButton} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.modalSecondaryText}>{secondaryLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImageWrapper: {
    height: 320,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  sheet: {
    marginTop: -28,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    padding: 20,
    gap: 20,
  },
  statusPill: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
    gap: 14,
    backgroundColor: '#FFFFFF',
  },
  propertyTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  propertyAddress: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  mapsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  mapsLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  mapsValue: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#111827',
  },
  mapsHint: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#2ECC71',
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  infoRowLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoRowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(46,204,113,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoRowLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  infoRowValue: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#111827',
  },
  cancelButton: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  hostCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 14,
  },
  hostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hostInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hostAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(46,204,113,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostName: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  hostRole: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  hostLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.08)',
  },
  hostLinkText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#2ECC71',
  },
  hostPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    padding: 12,
  },
  hostPhoneLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  hostPhoneValue: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#2ECC71',
  },
  avatarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  avatarContent: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFullImage: {
    width: '100%',
    maxWidth: 320,
    aspectRatio: 1,
    borderRadius: 24,
  },
  rulesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 18,
  },
  rulesIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(249,115,22,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulesTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  rulesSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  chevron: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  agendaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderColor: '#2ECC71',
    borderRadius: 28,
    paddingVertical: 16,
  },
  agendaButtonText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#2ECC71',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    padding: 24,
    gap: 16,
  },
  modalIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  modalText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  modalPrimaryButton: {
    backgroundColor: '#EF4444',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalPrimaryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalSecondaryButton: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalSecondaryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
});

export default ReservationDetailsScreen;
