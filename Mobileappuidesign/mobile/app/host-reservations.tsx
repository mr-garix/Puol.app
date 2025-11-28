import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { HOST_RESERVATIONS } from '@/src/data/mockHostReservations';

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
  const reservations = HOST_RESERVATIONS;

  const formatCurrency = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;
  const formatDateRange = (checkInIso: string, checkOutIso: string) => {
    const checkIn = new Date(checkInIso);
    const checkOut = new Date(checkOutIso);
    const sameMonth = checkIn.getMonth() === checkOut.getMonth();
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const rangeStart = checkIn.toLocaleDateString('fr-FR', options);
    const rangeEnd = checkOut.toLocaleDateString('fr-FR', options);
    const checkoutYear = checkOut.getFullYear();
    if (sameMonth) {
      return `${rangeStart} - ${checkOut.getDate()} ${checkOut.toLocaleDateString('fr-FR', { month: 'short' })} · ${checkoutYear}`;
    }
    return `${rangeStart} - ${rangeEnd} ${checkoutYear}`;
  };

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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {reservations.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="calendar" size={30} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Aucune réservation pour l’instant</Text>
            <Text style={styles.emptySubtitle}>
              Partagez vos annonces et restez disponible pour recevoir les prochaines demandes. Chaque réservation listée ici affichera
              le nom du voyageur, les dates et le logement réservé.
            </Text>
            <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
              <Text style={styles.ctaText}>Inviter un voyageur</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>Réservations confirmées</Text>
            {reservations.map((reservation) => {
              const hasSplit = reservation.payoutBreakdown.dueOnArrival > 0;
              return (
                <TouchableOpacity
                  key={reservation.id}
                  style={styles.reservationCard}
                  activeOpacity={0.9}
                  onPress={() => handleOpenReservation(reservation.id)}
                >
                  <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.guestName}>{reservation.guestName}</Text>
                      <Text style={styles.propertyName}>{reservation.propertyName}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={COLORS.muted} />
                  </View>
                  <View style={styles.cardMetaRow}>
                    <View style={styles.metaBlock}>
                      <Feather name="calendar" size={14} color={COLORS.accent} />
                      <Text style={styles.metaText}>{formatDateRange(reservation.checkIn, reservation.checkOut)}</Text>
                    </View>
                    <View style={styles.metaBlock}>
                      <Feather name="moon" size={14} color={COLORS.accent} />
                      <Text style={styles.metaText}>{reservation.nights} nuit{reservation.nights > 1 ? 's' : ''}</Text>
                    </View>
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.amountLabel}>Montant total</Text>
                    <Text style={styles.amountValue}>{formatCurrency(reservation.totalAmount)}</Text>
                  </View>
                  {hasSplit && (
                    <View style={styles.splitBadge}>
                      <Feather name="alert-triangle" size={12} color="#92400E" />
                      <Text style={styles.splitBadgeText}>
                        {formatCurrency(reservation.payoutBreakdown.paidOnline)} réglés · {formatCurrency(reservation.payoutBreakdown.dueOnArrival)} à l'arrivée
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
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
});
