import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

import { useHostBookings } from '@/src/features/host/hooks';
import DateTimePicker from '@react-native-community/datetimepicker';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  dark: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#2ECC71',
};

export default function HostReservationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top - 40, 2);
  const { bookings, isLoading, error, refresh } = useHostBookings();
  const [activeFilter, setActiveFilter] = useState<'en-cours' | 'termines' | 'annules' | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);

  const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;
  const formatDateRange = (checkInIso: string, checkOutIso: string) => {
    const checkIn = new Date(checkInIso);
    const checkOut = new Date(checkOutIso);
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const start = checkIn.toLocaleDateString('fr-FR', options);
    const end = checkOut.toLocaleDateString('fr-FR', options);
    return `${start} - ${end} ${checkOut.getFullYear()}`;
  };

  const formatFilterDateLabel = (date: Date) => {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleInviteTraveler = async () => {
    const deepLink = Linking.createURL('/') ?? 'https://puol.app';
    const fallbackLink = 'https://puol.app';
    const message = [
      'Rejoins-moi sur PUOL pour réserver ton prochain séjour !',
      '',
      `Application : ${fallbackLink}`,
      `Ouvrir dans l\'app : ${deepLink}`,
    ].join('\n');

    try {
      await Share.share({
        title: 'Inviter un voyageur sur PUOL',
        message,
        url: fallbackLink,
      });
    } catch (error) {
      console.error('[HostReservations] Unable to open share sheet', error);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
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
  };

  const filteredBookings = useMemo(() => {
    const byStatus = (() => {
      switch (activeFilter) {
        case 'annules':
          return bookings.filter((booking) => booking.status === 'cancelled');
        case 'termines':
          return bookings.filter((booking) => booking.status === 'completed');
        case 'en-cours':
          return bookings.filter((booking) => booking.status !== 'cancelled' && booking.status !== 'completed');
        default:
          return bookings;
      }
    })();

    if (!selectedDate) {
      return byStatus;
    }

    const targetTime = selectedDate.setHours(0, 0, 0, 0);
    return byStatus.filter((booking) => {
      const checkIn = new Date(booking.checkInDate).setHours(0, 0, 0, 0);
      const checkOut = new Date(booking.checkOutDate).setHours(0, 0, 0, 0);
      return targetTime >= checkIn && targetTime <= checkOut;
    });
  }, [bookings, activeFilter, selectedDate]);

const contentState = useMemo(() => {
    if (isLoading && bookings.length === 0) {
      return 'loading';
    }
    if (error && bookings.length === 0) {
      return 'error';
    }
    if (bookings.length === 0) {
      return 'empty';
    }
    return 'list';
  }, [isLoading, bookings.length, error]);

  const handleOpenReservation = (id: string) => {
    router.push(`/host-reservations/${id}` as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={[styles.headerWrapper, { paddingTop: topPadding }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Feather name="chevron-left" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Réservations reçues</Text>
            <Text style={styles.headerSubtitle}>Consultez vos réservations confirmées</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading && bookings.length > 0} onRefresh={refresh} />}
      >
        <View style={styles.filtersRow}>
          {[{
            key: 'en-cours' as const,
            label: 'En cours',
          }, {
            key: 'termines' as const,
            label: 'Terminées',
          }, {
            key: 'annules' as const,
            label: 'Annulées',
          }].map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[styles.filterChip, isActive && styles.filterChipActive]}
                activeOpacity={0.85}
                onPress={() => setActiveFilter(isActive ? null : filter.key)}
              >
                <Text style={[styles.filterChipLabel, isActive && styles.filterChipLabelActive]}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={styles.dateFilterWrapper}>
            <TouchableOpacity
              style={[styles.dateFilterChip, selectedDate && styles.dateFilterChipActive]}
              activeOpacity={0.85}
              onPress={() => setIsDatePickerVisible(true)}
            >
              <Feather
                name="calendar"
                size={14}
                color={selectedDate ? '#1D4ED8' : COLORS.muted}
              />
              <Text
                style={[styles.dateFilterLabel, selectedDate && styles.dateFilterLabelActive]}
              >
                {selectedDate ? formatFilterDateLabel(selectedDate) : 'Par date'}
              </Text>
            </TouchableOpacity>
            {selectedDate ? (
              <TouchableOpacity
                style={styles.clearDateButton}
                activeOpacity={0.7}
                onPress={() => setSelectedDate(null)}
              >
                <Feather name="x" size={14} color={COLORS.muted} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
        {contentState === 'loading' ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.feedbackTitle}>Chargement des réservations...</Text>
          </View>
        ) : contentState === 'error' ? (
          <View style={styles.feedbackCard}>
            <View style={styles.emptyIcon}>
              <Feather name="alert-triangle" size={30} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Impossible de charger les réservations</Text>
            <Text style={styles.emptySubtitle}>Vérifiez votre connexion et réessayez.</Text>
            <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={refresh}>
              <Text style={styles.ctaText}>Réessayer</Text>
              <Feather name="refresh-cw" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : contentState === 'empty' ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="calendar" size={30} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Aucune réservation pour l’instant</Text>
            <Text style={styles.emptySubtitle}>
              Partagez vos annonces et restez disponible pour recevoir les prochaines demandes. Chaque réservation listée ici affichera
              le nom du voyageur, les dates et le logement réservé.
            </Text>
            <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={handleInviteTraveler}>
              <Text style={styles.ctaText}>Inviter un voyageur</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Réservations reçues</Text>
            {filteredBookings.length === 0 ? (
              <View style={styles.filteredEmptyState}>
                <Feather name="briefcase" size={24} color={COLORS.muted} />
                <Text style={styles.filteredEmptyText}>Aucune réservation dans cette catégorie.</Text>
              </View>
            ) : filteredBookings.map((reservation) => {
              const totalPrice = reservation.totalPrice ?? 0;
              const amountPaid = reservation.amountPaid ?? 0;
              const hasOutstandingAmount = (reservation.amountRemaining ?? 0) > 0.5 || (reservation.remainingNights ?? 0) > 0;
              const isSplitPayment = reservation.paymentScheme === 'split' || amountPaid + 0.5 < totalPrice || hasOutstandingAmount;
              const isSoldOutStay = isSplitPayment && reservation.remainingPaymentStatus === 'paid';
              const badgeStyle = getStatusBadgeStyle(reservation.status);
              const isCancelled = reservation.status === 'cancelled';
              return (
                <TouchableOpacity
                  key={reservation.id}
                  style={styles.reservationCard}
                  activeOpacity={0.9}
                  onPress={() => handleOpenReservation(reservation.id)}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guestName}>{reservation.guest?.name ?? 'Voyageur PUOL'}</Text>
                      <Text style={styles.propertyName}>{reservation.listingTitle}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={COLORS.muted} />
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: badgeStyle.backgroundColor, borderColor: badgeStyle.iconColor }]}> 
                    <Feather name={badgeStyle.icon} size={12} color={badgeStyle.iconColor} />
                    <Text style={[styles.statusBadgeText, { color: badgeStyle.textColor }]}>{badgeStyle.label}</Text>
                  </View>
                  <View style={styles.cardMetaRow}>
                    <View style={styles.metaBlock}>
                      <Feather name="calendar" size={14} color={COLORS.accent} />
                      <Text style={styles.metaText}>{formatDateRange(reservation.checkInDate, reservation.checkOutDate)}</Text>
                    </View>
                    <View style={styles.metaBlock}>
                      <Feather name="moon" size={14} color={COLORS.accent} />
                      <Text style={styles.metaText}>{reservation.nights} nuit{reservation.nights > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <View>
                      <Text style={styles.amountLabel}>Montant total</Text>
                      <Text style={styles.amountValue}>{formatCurrency(reservation.totalPrice)}</Text>
                    </View>
                    <View style={styles.amountRight}>
                      <Text style={styles.amountLabel}>Payé</Text>
                      <Text style={styles.amountValueSecondary}>{formatCurrency(reservation.amountPaid ?? 0)}</Text>
                    </View>
                  </View>
                  {isSoldOutStay && !isCancelled ? (
                    <View style={styles.soldOutPill}>
                      <Feather name="check-circle" size={12} color="#047857" />
                      <Text style={styles.soldOutText}>Séjour soldé</Text>
                    </View>
                  ) : null}
                  {isSplitPayment && !isCancelled && !isSoldOutStay && (
                    <View style={styles.splitBadge}>
                      <Text style={styles.splitBadgeText} numberOfLines={1} ellipsizeMode="tail">
                        {formatCurrency(reservation.amountPaid ?? 0)} réglés · {formatCurrency(reservation.amountRemaining ?? 0)} à régler à l'arrivée
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={isDatePickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDatePickerVisible(false)}
      >
        <View style={styles.datePickerOverlay}>
          <View style={styles.datePickerCard}>
            <DateTimePicker
              value={selectedDate ?? new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'calendar'}
              themeVariant="light"
              textColor="#111827"
              onChange={(event, date) => {
                if (event.type === 'dismissed') {
                  setIsDatePickerVisible(false);
                  return;
                }
                if (date) {
                  setSelectedDate(date);
                }
                if (Platform.OS !== 'ios') {
                  setIsDatePickerVisible(false);
                }
              }}
              style={styles.nativeDatePicker}
            />
            {Platform.OS === 'ios' ? (
              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setIsDatePickerVisible(false)}
                >
                  <Text style={styles.datePickerButtonText}>Fermer</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

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
  notificationBanner: {
    marginTop: 12,
    backgroundColor: 'rgba(248,113,113,0.12)',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
  },
  notificationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(248,113,113,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationTitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: '#7F1D1D',
  },
  notificationSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#7F1D1D',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontFamily: 'Manrope',
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.dark,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  summaryHint: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(46,204,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  feedbackCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 12,
  },
  feedbackTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
  },
  ctaButton: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 14,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  filterChipActive: {
    backgroundColor: 'rgba(46,204,113,0.15)',
    borderColor: COLORS.accent,
  },
  filterChipLabel: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  filterChipLabelActive: {
    color: COLORS.accent,
  },
  filteredEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F5F5F5',
  },
  filteredEmptyText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  dateFilterWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  dateFilterChipActive: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    borderColor: '#1D4ED8',
  },
  dateFilterLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
  },
  dateFilterLabelActive: {
    color: '#1D4ED8',
  },
  clearDateButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  datePickerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 360,
    gap: 16,
    alignItems: 'center',
  },
  nativeDatePicker: {
    width: '100%',
  },
  datePickerActions: {
    width: '100%',
    alignItems: 'flex-end',
  },
  datePickerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  datePickerButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  listTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  reservationCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF2FF',
    padding: 16,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '600',
  },
  cancelBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(248,113,113,0.15)',
  },
  cancelBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestName: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  propertyName: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  cardMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  amountValue: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },
  amountRight: {
    alignItems: 'flex-end',
  },
  amountValueSecondary: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  splitBadge: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(250, 204, 21, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
  },
  splitBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#92400E',
    flexShrink: 1,
  },
  soldOutPill: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
  },
  soldOutText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '600',
    color: '#047857',
  },
});
