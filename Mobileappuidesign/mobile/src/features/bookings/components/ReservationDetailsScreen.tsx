import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Platform,
} from 'react-native';
import * as Calendar from 'expo-calendar';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/src/contexts/AuthContext';

import type { ReservationRecord } from '@/src/contexts/ReservationContext';
import { useReservations } from '@/src/contexts/ReservationContext';
import { supabase } from '@/src/supabaseClient';
import { Avatar } from '@/src/components/ui/Avatar';

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
  const { supabaseProfile } = useAuth();
  const [scrollY, setScrollY] = useState(0);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isHostAvatarVisible, setIsHostAvatarVisible] = useState(false);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [hostProfile, setHostProfile] = useState<{ name?: string; phone?: string; avatarUrl?: string | null; username?: string | null; isVerified?: boolean } | null>(null);

  const router = useRouter();

  const stickyOpacity = Math.min(scrollY / 120, 1);
  const isCancelled = reservation?.status === 'cancelled';

  const stayRange = useMemo(() => {
    if (!reservation) return { checkIn: '', checkOut: '' };
    return { checkIn: formatFullDate(reservation.checkInDate), checkOut: formatFullDate(reservation.checkOutDate) };
  }, [reservation]);

  useEffect(() => {
    if (!reservation?.hostId) {
      setHostProfile(null);
      return;
    }

    let isMounted = true;

    const fetchHostProfile = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, username, phone, avatar_url, is_certified')
          .eq('id', reservation.hostId)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        if (!data) {
          setHostProfile(null);
          return;
        }

        const fullName = [data.first_name, data.last_name]
          .filter((token) => token && token.trim().length > 0)
          .join(' ')
          .trim();

        setHostProfile({
          name: fullName.length ? fullName : reservation.hostName,
          phone: data.phone ?? reservation.hostPhone,
          avatarUrl: data.avatar_url ?? reservation.hostAvatar,
          username: data.username ?? reservation.hostUsername,
          isVerified: Boolean(data.is_certified),
        });
      } finally {
        if (!isMounted) {
          return;
        }
      }
    };

    fetchHostProfile();

    return () => {
      isMounted = false;
    };
  }, [reservation?.hostId, reservation?.hostName, reservation?.hostPhone, reservation?.hostAvatar, reservation?.hostUsername]);

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
      case 'completed':
        return { label: 'Séjour terminé', color: '#3B82F6', background: 'rgba(59,130,246,0.1)' };
      default:
        return { label: 'En attente de confirmation', color: '#F97316', background: 'rgba(249,115,22,0.1)' };
    }
  })();

  const amountPaid = reservation.amountPaid ?? reservation.totalPrice;
  const totalAmount = reservation.totalPrice;
  const remainingAmount = reservation.amountRemaining ?? Math.max(totalAmount - amountPaid, 0);
  const depositNights = reservation.depositNights ?? 0;
  const remainingNights = reservation.remainingNights ?? 0;
  const rawPaymentScheme = reservation.paymentScheme ?? 'full';
  const hasSplitIndicators = rawPaymentScheme === 'split' || depositNights > 0 || remainingNights > 0;
  const isSplitPayment = hasSplitIndicators;
  const isRemainingBalancePaid = isSplitPayment && reservation.remainingPaymentStatus === 'paid' && remainingAmount < 1;
  const hasOutstandingBalance = isSplitPayment && !isRemainingBalancePaid && remainingAmount > 0.5;
  const hasDiscount = (reservation.discountAmount ?? 0) > 0;
  const hasOriginalPrice = (reservation.originalTotal ?? reservation.totalPrice) > reservation.totalPrice;

  const authProfileName = useMemo(() => {
    if (!supabaseProfile) return null;
    const tokens = [supabaseProfile.first_name, supabaseProfile.last_name].filter((token) => token && token.trim().length > 0);
    if (tokens.length) {
      return tokens.join(' ').trim();
    }
    if (supabaseProfile.username) {
      return `@${supabaseProfile.username}`;
    }
    return null;
  }, [supabaseProfile]);

  const guestDisplayName = reservation.guestName || authProfileName || 'Voyageur PUOL';
  const guestPhone = reservation.guestPhone || supabaseProfile?.phone || 'Non renseigné';

  const trimmedAddress = reservation.propertyAddress?.trim();
  const displayLocation = trimmedAddress && trimmedAddress.length > 0
    ? trimmedAddress
    : reservation.propertyLocation;
  const displayAddress = displayLocation || '';
  const hostName = hostProfile?.name || reservation.hostName;
  const hostAvatar = hostProfile?.avatarUrl ?? reservation.hostAvatar ?? reservation.propertyImage;
  const hostRole = hostProfile?.username ?? reservation.hostUsername ?? 'Hôte';
  const hostPhone = hostProfile?.phone ?? reservation.hostPhone;

  const handleDownloadReceipt = useCallback(async () => {
    try {
      setIsGeneratingReceipt(true);
      const logoAsset = Asset.fromModule(require('@/assets/icons/logo.png'));
      await logoAsset.downloadAsync();
      const logoUri = logoAsset.localUri ?? logoAsset.uri;
      const logoBase64 = logoUri
        ? await FileSystem.readAsStringAsync(logoUri, { encoding: 'base64' })
        : '';

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #0F172A; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .card { border: 1px solid #E5E7EB; border-radius: 12px; padding: 20px; }
              .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
              .title { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
              .subtitle { font-size: 13px; color: #6B7280; margin-bottom: 16px; }
              .sectionTitle { font-size: 14px; font-weight: 700; margin: 16px 0 8px; }
              .value { font-weight: 600; }
              .logo { width: 120px; height: auto; margin-bottom: 12px; }
              .divider { height: 1px; background: #E5E7EB; margin: 12px 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <div style="display:flex; justify-content:center; margin-bottom:16px;">
                <div style="background:#111827; padding:16px; border-radius:16px; width:160px; height:160px; display:flex; align-items:center; justify-content:center;">
                  <img class="logo" src="data:image/png;base64,${logoBase64}" style="width:120px;height:auto;" />
                </div>
              </div>
              <div class="title" style="text-align:center;">Reçu de réservation</div>
              <div class="subtitle" style="text-align:center;">PUOL - ${new Date().toLocaleDateString('fr-FR')}</div>
              <div class="divider"></div>
              <div class="sectionTitle">Séjour</div>
              <div class="row"><span>Logement</span><span class="value">${reservation.propertyTitle || 'Logement PUOL'}</span></div>
              <div class="row"><span>Adresse</span><span class="value">${displayLocation || 'Adresse non renseignée'}</span></div>
              <div class="row"><span>Arrivée</span><span class="value">${stayRange.checkIn}</span></div>
              <div class="row"><span>Départ</span><span class="value">${stayRange.checkOut}</span></div>
              <div class="row"><span>Nombre de nuits</span><span class="value">${reservation.nights}</span></div>
              <div class="divider"></div>
              <div class="sectionTitle">Montants</div>
              <div class="row"><span>Montant total</span><span class="value">${totalAmount.toLocaleString()} FCFA</span></div>
              <div class="row"><span>Montant payé</span><span class="value">${amountPaid.toLocaleString()} FCFA</span></div>
              ${hasOutstandingBalance ? `<div class="row"><span>Reste à payer</span><span class="value">${remainingAmount.toLocaleString()} FCFA</span></div>` : ''}
              <div class="divider"></div>
              <div class="sectionTitle">Voyageur</div>
              <div class="row"><span>Nom</span><span class="value">${guestDisplayName}</span></div>
              <div class="row"><span>Téléphone</span><span class="value">${guestPhone}</span></div>
            </div>
          </body>
        </html>
      `;

      const file = await Print.printToFileAsync({ html });
      await shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Partager le reçu' });
    } catch (error) {
      Alert.alert('Reçu', "Impossible de générer le reçu pour le moment. Réessaie plus tard.");
      console.error('receipt generation error', error);
    } finally {
      setIsGeneratingReceipt(false);
    }
  }, [
    amountPaid,
    displayLocation,
    guestDisplayName,
    guestPhone,
    hasOutstandingBalance,
    remainingAmount,
    reservation?.nights,
    reservation?.propertyTitle,
    stayRange.checkIn,
    stayRange.checkOut,
    totalAmount,
  ]);

  const handleOpenMaps = () => {
    if (!displayLocation) {
      return;
    }
    const encoded = encodeURIComponent(displayLocation);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encoded}`);
  };

  const handleCallHost = () => Linking.openURL(`tel:${hostPhone}`);
  const handleViewProperty = () => router.push({ pathname: '/property/[id]', params: { id: reservation.propertyId } });

  const confirmCancellation = () => {
    cancelReservation(reservation.id);
    setShowCancelModal(false);
    Alert.alert(
      'Réservation annulée',
      'Votre réservation a bien été annulée. Votre remboursement sera traité selon notre politique de remboursement et apparaîtra sous 24h maximum.',
    );
  };

  const ensureCalendarId = async () => {
    const existing = await Calendar.getCalendarPermissionsAsync();
    if (existing.status !== 'granted') {
      const granted = await Calendar.requestCalendarPermissionsAsync();
      if (granted.status !== 'granted') {
        throw new Error('calendar_permission_denied');
      }
    }

    if (Platform.OS === 'ios') {
      const defaultCal = await Calendar.getDefaultCalendarAsync();
      if (defaultCal?.id) return defaultCal.id;
    }

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const writable = calendars.find((cal: Calendar.Calendar) => cal.allowsModifications === true);
    const fallback = calendars[0];
    if (writable?.id) return writable.id;
    if (fallback?.id) return fallback.id;
    throw new Error('no_calendar_available');
  };

  const handleAddToAgenda = async () => {
    try {
      const calendarId = await ensureCalendarId();
      const startDate = new Date(reservation.checkInDate);
      const endDate = new Date(reservation.checkOutDate);
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const notes = [
        'Réservation PUOL',
        `${stayRange.checkIn} → ${stayRange.checkOut}`,
        displayLocation ? `Lieu : ${displayLocation}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const eventId = await Calendar.createEventAsync(calendarId, {
        title: reservation.propertyTitle || 'Séjour PUOL',
        startDate,
        endDate,
        timeZone,
        location: displayLocation || undefined,
        allDay: true,
        notes,
      });

      if (Platform.OS === 'ios') {
        await Calendar.openEventInCalendar(eventId);
      }

      Alert.alert('Ajouté à votre agenda', 'Votre séjour a été ajouté dans votre calendrier.');
    } catch (error) {
      console.error('[ReservationDetails] addToCalendar error', error);
      Alert.alert(
        "Impossible d'ajouter",
        "Nous n'avons pas pu accéder à votre agenda. Vérifiez les permissions et réessayez.",
      );
    }
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

            <InfoRow label="Tarif par nuit" value={`${reservation.pricePerNight.toLocaleString()} FCFA`} icon="sunrise" />
            {hasOriginalPrice && (
              <InfoRow
                label="Montant initial"
                value={`${(reservation.originalTotal ?? totalAmount).toLocaleString()} FCFA`}
                icon="trending-up"
              />
            )}
            {hasDiscount && (
              <InfoRow
                label="Réduction appliquée"
                value={`-${(reservation.discountAmount ?? 0).toLocaleString()} FCFA${reservation.discountPercent ? ` (${reservation.discountPercent}%)` : ''}`}
                icon="gift"
              />
            )}
            <InfoRow label="Montant total" value={`${totalAmount.toLocaleString()} FCFA`} icon="cash-multiple" iconLibrary="material" highlight />
            <InfoRow label="Montant payé" value={`${amountPaid.toLocaleString()} FCFA`} icon="credit-card" />
            {hasOutstandingBalance && (
              <InfoRow label="Reste à payer" value={`${remainingAmount.toLocaleString()} FCFA`} icon="check-circle" />
            )}
            {isSplitPayment && isRemainingBalancePaid && !isCancelled && (
              <InfoRow
                label="Solde du séjour"
                value="Séjour soldé"
                icon="shield"
                highlight
              />
            )}

            <TouchableOpacity
              style={[
                styles.agendaButton,
                { marginTop: 12, borderColor: '#111827' },
                isGeneratingReceipt && { opacity: 0.6 },
              ]}
              onPress={handleDownloadReceipt}
              activeOpacity={0.85}
              disabled={isGeneratingReceipt}
            >
              <Feather name="download" size={18} color={isGeneratingReceipt ? '#9CA3AF' : '#111827'} />
              <Text style={[styles.agendaButtonText, { color: isGeneratingReceipt ? '#9CA3AF' : '#111827' }]}>
                {isGeneratingReceipt ? 'Génération...' : 'Télécharger le reçu'}
              </Text>
            </TouchableOpacity>

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
                    <Image source={{ uri: hostAvatar }} style={styles.hostAvatarImage} resizeMode="cover" />
                  ) : (
                    <Avatar source={undefined} name={hostName} size="xlarge" variant="square" />
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
                <Text style={styles.hostPhoneValue}>{hostPhone}</Text>
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

          <TouchableOpacity style={styles.agendaButton} onPress={handleAddToAgenda} activeOpacity={0.8}>
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

      <Modal visible={isHostAvatarVisible} transparent animationType="fade" onRequestClose={() => setIsHostAvatarVisible(false)}>
        <TouchableOpacity style={styles.avatarOverlay} activeOpacity={1} onPress={() => setIsHostAvatarVisible(false)}>
          <View style={styles.avatarContent}>
            {hostAvatar ? (
              <Image source={{ uri: hostAvatar }} style={styles.avatarFullImage} resizeMode="cover" />
            ) : (
              <Avatar
                source={undefined}
                name={hostName}
                size="xlarge"
                variant="square"
                style={styles.avatarFullImage}
              />
            )}
            <TouchableOpacity style={styles.avatarCloseButton} onPress={() => setIsHostAvatarVisible(false)} activeOpacity={0.8}>
              <Feather name="x" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const InfoRow = ({
  label,
  value,
  icon,
  iconLibrary = 'feather',
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ComponentProps<typeof Feather>['name'] | React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconLibrary?: 'feather' | 'material';
  highlight?: boolean;
}) => {
  const IconComponent = iconLibrary === 'material' ? MaterialCommunityIcons : Feather;
  return (
    <View style={styles.infoRowLine}>
      <View style={styles.infoRowIcon}>
        <IconComponent name={icon as never} size={16} color="#2ECC71" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoRowLabel}>{label}</Text>
        <Text style={[styles.infoRowValue, highlight && { color: '#2ECC71', fontWeight: '700' }]}>{value}</Text>
      </View>
    </View>
  );
};

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
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(46,204,113,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
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
