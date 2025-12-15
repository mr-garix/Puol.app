import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useHostVisits } from '@/src/features/host/hooks';
import { PUOL_COLORS } from '@/src/constants/theme';

const COLORS = {
  background: PUOL_COLORS.background,
  surface: PUOL_COLORS.surface,
  dark: PUOL_COLORS.dark,
  muted: PUOL_COLORS.muted,
  accent: PUOL_COLORS.primary,
  border: PUOL_COLORS.border,
  pending: '#F97316',
  cancelled: PUOL_COLORS.error,
};

const formatVisitDate = (isoDate: string, time: string) => {
  const date = new Date(isoDate);
  const formattedDate = date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  return `${formattedDate} · ${time}`;
};

const getStatusDescriptor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Confirmée',
        tint: 'rgba(5, 150, 105, 0.12)',
        color: COLORS.accent,
        icon: 'check-circle' as const,
      };
    case 'cancelled':
      return {
        label: 'Annulée',
        tint: 'rgba(239, 68, 68, 0.12)',
        color: COLORS.cancelled,
        icon: 'slash' as const,
      };
    default:
      return {
        label: 'En attente de confirmation',
        tint: 'rgba(249, 115, 22, 0.12)',
        color: COLORS.pending,
        icon: 'clock' as const,
      };
  }
};

export default function HostVisitsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { visits, visitsCount, isLoading, error, refresh } = useHostVisits();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const contentState = useMemo(() => {
    if (isLoading && visits.length === 0) {
      return 'loading';
    }
    if (error && visits.length === 0) {
      return 'error';
    }
    if (visits.length === 0) {
      return 'empty';
    }
    return 'list';
  }, [isLoading, error, visits.length]);

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 6 }]}>
      <RNStatusBar hidden translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visites reçues</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={visits.length > 0 ? isLoading || isRefreshing : false}
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        {contentState === 'loading' ? (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.feedbackText}>Chargement des visites...</Text>
          </View>
        ) : contentState === 'error' ? (
          <View style={styles.feedbackCard}>
            <Feather name="alert-triangle" size={28} color={COLORS.cancelled} />
            <Text style={styles.feedbackTitle}>Impossible de charger vos visites</Text>
            <Text style={styles.feedbackSubtitle}>Vérifiez votre connexion et réessayez.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh} activeOpacity={0.85}>
              <Text style={styles.retryText}>Réessayer</Text>
              <Feather name="refresh-cw" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : contentState === 'empty' ? (
          <View style={styles.feedbackCard}>
            <Feather name="map-pin" size={32} color={COLORS.accent} />
            <Text style={styles.feedbackTitle}>Aucune visite reçue pour le moment</Text>
            <Text style={styles.feedbackSubtitle}>
              Encouragez vos prospects à réserver un créneau. Dès qu’une visite est programmée, elle apparaît ici avec toutes les
              informations nécessaires.
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {visits.map((visit) => {
              const descriptor = getStatusDescriptor(visit.status);
              return (
                <TouchableOpacity
                  key={visit.id}
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/landlord-visit/${visit.id}` as never)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.statusBadge}>
                      <View style={[styles.statusIconWrapper, { backgroundColor: descriptor.tint }]}> 
                        <Feather name={descriptor.icon} size={14} color={descriptor.color} />
                      </View>
                      <Text style={[styles.statusLabel, { color: descriptor.color }]}>{descriptor.label}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={COLORS.muted} />
                  </View>

                  <Text style={styles.propertyTitle} numberOfLines={2}>
                    {visit.listingTitle}
                  </Text>
                  <View style={styles.metaRow}>
                    <Feather name="map-pin" size={14} color={COLORS.accent} />
                    <Text style={styles.metaText}>{visit.listingLocation}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Feather name="calendar" size={14} color={COLORS.accent} />
                    <Text style={styles.metaText}>{formatVisitDate(visit.visitDate, visit.visitTime)}</Text>
                  </View>

                  <View style={styles.visitorBlock}>
                    <Text style={styles.visitorLabel}>Visiteur</Text>
                    <Text style={styles.visitorName}>
                      {visit.guest?.name ?? visit.guest?.username ?? 'Visiteur PUOL'}
                    </Text>
                    {visit.guest?.phone ? (
                      <View style={styles.metaRow}>
                        <Feather name="phone" size={14} color={COLORS.accent} />
                        <Text style={styles.metaText}>{visit.guest.phone}</Text>
                      </View>
                    ) : null}
                  </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 18,
  },
  feedbackCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 14,
  },
  feedbackText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
  },
  feedbackTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
  },
  feedbackSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 19,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  retryText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
  },
  propertyTitle: {
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.dark,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
  },
  visitorBlock: {
    gap: 4,
  },
  visitorLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: '600',
    color: COLORS.muted,
    letterSpacing: 0.5,
  },
  visitorName: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.muted,
  },
});
