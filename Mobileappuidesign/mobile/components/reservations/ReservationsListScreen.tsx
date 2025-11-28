import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useReservations, type ReservationRecord } from '@/src/contexts/ReservationContext';

const getStatusConfig = (status: ReservationRecord['status']) => {
  switch (status) {
    case 'confirmed':
      return { label: 'Confirmée', backgroundColor: 'rgba(46,204,113,0.1)', color: '#2ECC71' };
    case 'cancelled':
      return { label: 'Annulée', backgroundColor: 'rgba(239,68,68,0.1)', color: '#EF4444' };
    default:
      return { label: 'En attente', backgroundColor: 'rgba(249,115,22,0.1)', color: '#F97316' };
  }
};

const formatRange = (checkIn: string, checkOut: string) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const option: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `Du ${start.toLocaleDateString('fr-FR', option)} au ${end.toLocaleDateString('fr-FR', option)}`;
};

export interface ReservationsListScreenProps {
  onBack?: () => void;
  onReservationPress: (reservationId: string) => void;
}

export const ReservationsListScreen: React.FC<ReservationsListScreenProps> = ({ onBack, onReservationPress }) => {
  const { reservations } = useReservations();
  const insets = useSafeAreaInsets();
  const [scrolled, setScrolled] = useState(false);

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setScrolled(offsetY > 20);
  };

  const listData = useMemo(() => reservations, [reservations]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 16) },
          scrolled && styles.headerShadow,
        ]}
      >
        <View style={styles.headerRow}>
          {onBack ? (
            <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.8}>
              <Feather name="arrow-left" size={20} color="#111827" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}

          <Text style={styles.headerTitle}>Réservations</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSubtitle}>Vos réservations de meublés</Text>
      </View>

      {listData.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Feather name="calendar" size={32} color="#9CA3AF" />
          </View>
          <Text style={styles.emptyTitle}>Aucune réservation pour le moment</Text>
          <Text style={styles.emptyDescription}>
            Continuez votre exploration et réservez vos prochains séjours directement dans PUOL.
          </Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => onReservationPress(item.id)} activeOpacity={0.9}>
              <Image source={{ uri: item.propertyImage }} style={styles.cardImage} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.propertyTitle}
                </Text>
                <Text style={styles.cardDates}>{formatRange(item.checkInDate, item.checkOutDate)}</Text>
                <Text style={styles.cardNights}>
                  {item.nights} nuit{item.nights > 1 ? 's' : ''}
                </Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.cardPrice}>{item.totalPrice.toLocaleString()} FCFA</Text>
                  <View style={[styles.statusBadge, getStatusConfig(item.status)]}>
                    <Text style={[styles.statusText, { color: getStatusConfig(item.status).color }]}>
                      {getStatusConfig(item.status).label}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  cardImage: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  cardDates: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
  },
  cardNights: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#9CA3AF',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  cardPrice: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#2ECC71',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyDescription: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ReservationsListScreen;
