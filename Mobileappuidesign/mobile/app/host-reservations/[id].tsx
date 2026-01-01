import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Image,
  StatusBar as RNStatusBar,
} from 'react-native';
import { Asset } from 'expo-asset';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { useHostBookings } from '@/src/features/host/hooks';
import { requestRemainingPayment, fetchHostBookingById } from '@/src/features/bookings/services';
import { Avatar } from '@/src/components/ui/Avatar';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  dark: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#2ECC71',
};

const formatFullDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const formatCurrency = (value: number | string | null | undefined) => `${Number(value ?? 0).toLocaleString('fr-FR')} FCFA`;

export default function HostReservationDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const { supabaseProfile } = useAuth();
  const { getBookingById, fetchBooking, isLoading } = useHostBookings();
  const [isFetching, setIsFetching] = useState(false);
  const [isRequestingPayment, setIsRequestingPayment] = useState(false);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [paymentToast, setPaymentToast] = useState<{ title: string; subtitle: string; tone: 'info' | 'success' } | null>(null);
  const [isGuestAvatarVisible, setIsGuestAvatarVisible] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const booking = useMemo(() => (params.id ? getBookingById(params.id) : undefined), [getBookingById, params.id]);

  useEffect(() => {
    let mounted = true;
    if (!params.id) {
      return;
    }
    setIsFetching(true);
    fetchBooking(params.id)
      .catch((error) => {
        console.error('[HostReservationDetails] unable to fetch booking', error);
      })
      .finally(() => {
        if (mounted) {
          setIsFetching(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [params.id, fetchBooking]);

  // Subscription Realtime pour les mises à jour du booking en temps réel
  useEffect(() => {
    if (!params.id || !supabaseProfile) {
      return;
    }

    let mounted = true;
    const bookingId = params.id;

    console.log('[HostReservationDetails] Setting up realtime subscription for booking:', bookingId);
    
    const channel = supabase
      .channel(`booking-${bookingId}`)
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        async (payload: any) => {
          console.log('[HostReservationDetails] Booking changed:', payload);
          
          // Rafraîchir les données du booking
          if (mounted) {
            await fetchBooking(bookingId);
          }
        }
      )
      .subscribe((status) => {
        console.log('[HostReservationDetails] Realtime subscription status:', status);
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [params.id, supabaseProfile, fetchBooking]);

  const stayRange = useMemo(() => {
    if (!booking) {
      return { checkIn: '', checkOut: '' };
    }
    return {
      checkIn: formatFullDate(booking.checkInDate),
      checkOut: formatFullDate(booking.checkOutDate),
    };
  }, [booking]);

  const statusBadge = useMemo(() => {
    if (!booking) {
      return {
        label: '',
        icon: 'check-circle' as const,
        backgroundColor: 'rgba(46,204,113,0.12)',
        iconColor: COLORS.accent,
        textColor: COLORS.accent,
      };
    }

    switch (booking.status) {
      case 'cancelled':
        return {
          label: 'Annulée',
          icon: 'slash' as const,
          backgroundColor: 'rgba(248,113,113,0.15)',
          iconColor: '#991B1B',
          textColor: '#991B1B',
        };
      case 'completed':
        return {
          label: 'Séjour terminé',
          icon: 'check-circle' as const,
          backgroundColor: 'rgba(59,130,246,0.12)',
          iconColor: '#1D4ED8',
          textColor: '#1D4ED8',
        };
      case 'pending':
        return {
          label: 'En attente',
          icon: 'clock' as const,
          backgroundColor: 'rgba(249,115,22,0.12)',
          iconColor: '#C2410C',
          textColor: '#C2410C',
        };
      default:
        return {
          label: 'Confirmée',
          icon: 'check-circle' as const,
          backgroundColor: 'rgba(46,204,113,0.12)',
          iconColor: COLORS.accent,
          textColor: COLORS.accent,
        };
    }
  }, [booking]);

  const stayNightsLabel = useMemo(() => {
    if (!booking) {
      return '';
    }
    return `${booking.nights} nuit${booking.nights > 1 ? 's' : ''}`;
  }, [booking]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  if (!params.id) {
    router.back();
    return null;
  }

  if (!booking && (isLoading || isFetching)) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}> 
        <ActivityIndicator size="small" color={COLORS.accent} />
        <Text style={{ color: COLORS.muted, marginTop: 12 }}>Chargement de la réservation...</Text>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}> 
        <Text style={{ color: COLORS.muted }}>Réservation introuvable.</Text>
      </SafeAreaView>
    );
  }

  const discountAmountValue = Number(booking.discountAmount ?? 0);
  const originalTotalValue = Number(booking.originalTotal ?? booking.totalPrice);
  const remainingAmountValue = Number(booking.amountRemaining ?? 0);
  const hasSplitPayout = remainingAmountValue > 0;
  const isSplitPayment = booking.paymentScheme === 'split' || (booking.depositNights ?? 0) > 0 || (booking.remainingNights ?? 0) > 0;
  const hasDiscount = discountAmountValue > 0;
  const hasOriginalTotal = originalTotalValue > Number(booking.totalPrice ?? 0);
  const isCancelled = booking.status === 'cancelled';

  const handleCancelPress = () => {
    if (isCancelled) {
      return;
    }
    Alert.alert(
      'Annuler cette réservation',
      'Pour annuler, vous devez contacter notre équipe support et expliquer la situation.',
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Contacter le support',
          style: 'default',
          onPress: () => {
            router.push('/support' as never);
          },
        },
      ],
    );
  };

  const handleRequestPayment = async () => {
    console.log('[HostReservation] Payment button clicked');
    console.log('[HostReservation] Booking data:', {
      id: booking?.id,
      remainingPaymentStatus: booking?.remainingPaymentStatus,
      amountRemaining: booking?.amountRemaining,
      isCancelled
    });
    
    if (!booking) {
      console.log('[HostReservation] No booking data');
      return;
    }
    
    const status = booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined;
    // Le bouton ne doit être désactivé que si le solde est payé ou la réservation est annulée
    if (status === 'paid' || isCancelled) {
      console.log('[HostReservation] Payment already processed or cancelled:', { status, isCancelled });
      return;
    }
    
    try {
      setIsRequestingPayment(true);
      console.log('[HostReservation] Requesting remaining payment:', booking.id);
      await requestRemainingPayment(booking.id);
      console.log('[HostReservation] Payment request successful, refreshing booking');
      await fetchBooking(booking.id);
      showToast('Lien envoyé', 'Le voyageur a reçu la demande de paiement.', 'info');
    } catch (err) {
      console.error('[HostReservation] Request payment error:', err);
      Alert.alert('Erreur', `Impossible d'envoyer la demande de paiement: ${err instanceof Error ? err.message : 'Erreur inconnue'}`);
    } finally {
      setIsRequestingPayment(false);
    }
  };

  const showToast = (title: string, subtitle: string, tone: 'info' | 'success') => {
    setPaymentToast({ title, subtitle, tone });
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    toastTimer.current = setTimeout(() => setPaymentToast(null), 3500);
  };

  const paymentButtonIcon = (booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined) === 'paid' ? 'check-circle' : (booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined) === 'requested' ? 'clock' : 'credit-card';
  const paymentButtonTitle = (booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined) === 'requested' ? 'En attente du paiement' : (booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined) === 'paid' ? 'Paiement reçu' : 'Demander le reste du paiement';
  const paymentButtonSubtitle = (booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined) === 'requested' ? 'Le voyageur vient de recevoir le lien' : (booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined) === 'paid' ? 'Le versement a été confirmé' : 'Prévenez le voyageur et envoyez le lien';
  const paymentButtonStyle = [
    styles.collectButton,
    (booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined) === 'requested' && styles.collectButtonPending,
    (booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined) === 'paid' && styles.collectButtonReceived,
    (booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined) !== 'idle' && { opacity: (booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined) === 'paid' ? 1 : 0.95 },
  ];

  const handleViewListing = () => {
    router.push({ pathname: '/property/[id]', params: { id: booking.listingId } } as never);
  };

  const handleCallGuest = () => {
    if (!booking?.guest?.phone) {
      return;
    }
    const telUrl = `tel:${booking.guest.phone.replace(/\s+/g, '')}`;
    Linking.canOpenURL(telUrl)
      .then((supported) => {
        if (supported) {
          Linking.openURL(telUrl);
        } else {
          Alert.alert('Appel impossible', 'Votre appareil ne peut pas lancer cet appel.');
        }
      })
      .catch(() => Alert.alert('Appel impossible', 'Veuillez composer le numéro manuellement.'));
  };

  const headerTopPadding = isAndroid ? Math.max(insets.top, 16) : Math.max(insets.top - 32, 8);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />
      <View
        style={[
          styles.headerWrapper,
          { paddingTop: headerTopPadding },
          isAndroid && styles.headerWrapperAndroid,
        ]}
      >
        <View style={[styles.headerRow, isAndroid && styles.headerRowAndroid]}>
          <TouchableOpacity
            style={[styles.navButton, isAndroid && styles.navButtonAndroid]}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Feather name="chevron-left" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={[styles.headerTextGroup, isAndroid && styles.headerTextGroupAndroid]}>
            <Text style={styles.headerTitle}>{booking.listingTitle}</Text>
            <Text style={styles.headerSubtitle}>Détails de la réservation</Text>
          </View>
          {isAndroid ? <View style={styles.headerSpacerAndroid} /> : <View style={{ width: 44 }} />}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.guestRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsGuestAvatarVisible(true)}
              style={styles.guestAvatarWrapper}
            >
              {booking.guest?.avatarUrl ? (
                <Image
                  source={{ uri: booking.guest.avatarUrl }}
                  style={styles.guestAvatarImage}
                  resizeMode="cover"
                />
              ) : (
                <Avatar
                  source={undefined}
                  name={booking.guest?.name || booking.guest?.username || 'Voyageur PUOL'}
                  size="large"
                  variant="square"
                />
              )}
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroGuest}>{booking.guest?.name ?? 'Voyageur PUOL'}</Text>
                  {booking.guest?.username ? <Text style={styles.heroHandle}>{booking.guest.username}</Text> : null}
                </View>
                <View
                  style={[
                    styles.confirmBadge,
                    {
                      backgroundColor: statusBadge.backgroundColor,
                      borderColor: statusBadge.iconColor,
                    },
                  ]}
                >
                  <Feather name={statusBadge.icon} size={14} color={statusBadge.iconColor} />
                  <Text style={[styles.confirmBadgeText, { color: statusBadge.textColor }]}>{statusBadge.label}</Text>
                </View>
              </View>
            </View>
          </View>
          <View style={[styles.heroActionsRow, { gap: 12 }]}>
            <TouchableOpacity
              style={[styles.viewListingButton, { flex: 1 }]}
              activeOpacity={0.85}
              onPress={handleViewListing}
            >
              <Text style={styles.viewListingText}>Voir l'annonce</Text>
              <Feather name="arrow-up-right" size={14} color={COLORS.accent} />
            </TouchableOpacity>
            {booking.guest?.phone ? (
              <TouchableOpacity style={styles.callButton} activeOpacity={0.85} onPress={handleCallGuest}>
                <Feather name="phone" size={14} color={COLORS.accent} />
                <Text style={styles.callButtonText}>{booking.guest.phone}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Résumé du séjour</Text>
          <InfoRow label="Arrivée" value={stayRange.checkIn} icon="log-in" />
          <InfoRow label="Départ" value={stayRange.checkOut} icon="log-out" />
          <InfoRow label="Durée du séjour" value={stayNightsLabel} icon="moon" />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Paiement & versement</Text>
          <InfoRow label="Tarif par nuit" value={formatCurrency(booking.nightlyPrice)} icon="sunrise" />
          {hasOriginalTotal && (
            <InfoRow label="Montant initial" value={formatCurrency(originalTotalValue)} icon="trending-up" />
          )}
          {hasDiscount && (
            <InfoRow
              label="Réduction appliquée"
              value={`-${formatCurrency(discountAmountValue)}${booking.discountPercent ? ` (${booking.discountPercent}%)` : ''}`}
              icon="gift"
            />
          )}
          <InfoRow label="Montant total" value={formatCurrency(booking.totalPrice)} icon="cash-multiple" iconLibrary="material" highlight />
          <InfoRow label="Montant payé" value={formatCurrency(booking.amountPaid ?? 0)} icon="credit-card" />
          {!isCancelled && isSplitPayment && booking.remainingPaymentStatus === 'paid' && (
            <View style={styles.soldOutRow}>
              <View style={styles.infoIcon}>
                <Feather name="check-circle" size={14} color="#047857" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.soldOutLabel}>Séjour soldé</Text>
                <Text style={styles.soldOutSubtitle}>Le solde a été entièrement réglé.</Text>
              </View>
            </View>
          )}
          {isSplitPayment && hasSplitPayout && booking.remainingPaymentStatus !== 'paid' && (
            <InfoRow label="Reste à payer" value={formatCurrency(booking.amountRemaining ?? 0)} icon="check-circle" />
          )}
          {isCancelled && (
            <View style={styles.cancellationNotice}>
              <Feather name="slash" size={16} color="#991B1B" />
              <View style={{ flex: 1 }}>
                <Text style={styles.cancellationNoticeTitle}>Réservation annulée</Text>
                <Text style={styles.cancellationNoticeSubtitle}>Aucun versement supplémentaire n'est requis.</Text>
              </View>
            </View>
          )}
          {hasSplitPayout && !isCancelled && (
            <>
              <View style={styles.ruleBanner}>
                <Feather name="alert-triangle" size={16} color="#92400E" />
                <Text style={styles.ruleBannerText}>
                  Séjour {booking.nights} nuits : les {booking.remainingNights ?? 2} dernières nuits sont réglées sur place selon la règle PUOL.
                </Text>
              </View>
              <TouchableOpacity
                style={paymentButtonStyle}
                activeOpacity={0.9}
                onPress={handleRequestPayment}
                disabled={
                  isRequestingPayment ||
                  (booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined) === 'paid' ||
                  isCancelled
                }
              >
                <Feather name={paymentButtonIcon} size={18} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.collectButtonTitle}>{paymentButtonTitle}</Text>
                  <Text style={styles.collectButtonSubtitle}>{paymentButtonSubtitle}</Text>
                </View>
              </TouchableOpacity>
              {paymentToast && (
                <View style={[styles.paymentToast, paymentToast.tone === 'success' && styles.paymentToastSuccess]}>
                  <Feather name={paymentToast.tone === 'success' ? 'check-circle' : 'info'} size={16} color={paymentToast.tone === 'success' ? '#047857' : '#065F46'} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.paymentToastTitle}>{paymentToast.title}</Text>
                    <Text style={styles.paymentToastSubtitle}>{paymentToast.subtitle}</Text>
                  </View>
                </View>
              )}
            </>
          )}
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[styles.cancelButton, isCancelled && styles.cancelButtonDisabled]}
            activeOpacity={isCancelled ? 1 : 0.85}
            onPress={handleCancelPress}
            disabled={isCancelled}
          >
            <Feather name="slash" size={16} color={isCancelled ? '#9CA3AF' : '#FFFFFF'} />
            <Text style={[styles.cancelButtonText, isCancelled && styles.cancelButtonTextDisabled]}>
              {isCancelled ? 'Réservation annulée' : 'Annuler la réservation'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={isGuestAvatarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsGuestAvatarVisible(false)}
      >
        <View style={styles.avatarOverlay}>
          <TouchableWithoutFeedback onPress={() => setIsGuestAvatarVisible(false)}>
            <View style={styles.avatarBackdrop} />
          </TouchableWithoutFeedback>
          <View style={styles.avatarContent}>
            {booking.guest?.avatarUrl ? (
              <Image
                source={{ uri: booking.guest.avatarUrl }}
                style={styles.avatarFullImage}
                resizeMode="cover"
              />
            ) : (
              <Avatar
                source={undefined}
                name={booking.guest?.name || booking.guest?.username || 'Voyageur PUOL'}
                size="xlarge"
                variant="square"
                style={styles.avatarFullImage}
              />
            )}
            <TouchableOpacity
              style={styles.avatarCloseButton}
              activeOpacity={0.85}
              onPress={() => setIsGuestAvatarVisible(false)}
            >
              <Feather name="x" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <IconComponent name={icon as never} size={14} color={COLORS.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value}</Text>
      </View>
    </View>
  );
};

const Badge = ({ icon, label, value, accent }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string; accent?: boolean }) => (
  <View style={[styles.badge, accent && styles.badgeAccent]}>
    <Feather name={icon} size={12} color={accent ? '#166534' : COLORS.muted} />
    <Text style={[styles.badgeLabel, accent && styles.badgeLabelAccent]}>{label}</Text>
    <Text style={[styles.badgeValue, accent && styles.badgeValueAccent]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  headerWrapperAndroid: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRowAndroid: {
    justifyContent: 'space-between',
    gap: 0,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonAndroid: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTextGroupAndroid: {
    marginLeft: 4,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  headerSpacerAndroid: {
    width: 40,
  },
  content: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestAvatarWrapper: {
    borderRadius: 28,
    overflow: 'hidden',
  },
  guestAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  guestAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D1D5DB',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  heroGuest: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  heroHandle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
  viewListingButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewListingText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  callButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.25)',
  },
  callButtonText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  confirmBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.12)',
  },
  confirmBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  stayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  stayText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(46,204,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  infoValue: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
  },
  infoValueHighlight: {
    color: '#047857',
    fontWeight: '700',
  },
  soldOutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  soldOutLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#047857',
  },
  soldOutSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#047857',
  },
  payoutRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeAccent: {
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderColor: 'rgba(46,204,113,0.25)',
  },
  badgeLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  badgeLabelAccent: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  badgeValue: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  badgeValueAccent: {
    color: COLORS.accent,
  },
  ruleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(250,204,21,0.15)',
  },
  ruleBannerText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
  },
  splitBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#92400E',
    flexShrink: 1,
  },
  cancellationNotice: {
    marginTop: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(248,113,113,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancellationNoticeTitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  cancellationNoticeSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#991B1B',
  },
  collectButton: {
    marginTop: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collectButtonPending: {
    backgroundColor: '#F97316',
  },
  collectButtonReceived: {
    backgroundColor: '#059669',
  },
  collectButtonTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  collectButtonSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
  },
  paymentToast: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  paymentToastSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  paymentToastTitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  paymentToastSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#047857',
  },
  footerActions: {
    marginTop: 8,
  },
  cancelButton: {
    width: '100%',
    backgroundColor: '#DC2626',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  cancelButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButtonDisabled: {
    backgroundColor: '#E5E7EB',
    borderColor: '#E5E7EB',
  },
  cancelButtonTextDisabled: {
    color: '#9CA3AF',
  },
  avatarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  avatarBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  avatarContent: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarFullImage: {
    width: '100%',
    height: '100%',
  },
  avatarCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(17,24,39,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
