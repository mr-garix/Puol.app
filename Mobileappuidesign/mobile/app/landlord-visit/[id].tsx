import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useLandlordVisits } from '@/src/features/rental-visits/hooks';
import { Avatar } from '@/src/components/ui/Avatar';
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

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1502672260066-6bc36a7cad24?w=800&auto=format&fit=crop&q=80';

const getStatusDescriptor = (status: string) => {
  switch (status) {
    case 'confirmed':
      return {
        label: 'Visite confirmée',
        tint: '#FFFFFF',
        color: COLORS.accent,
        borderColor: COLORS.accent,
        icon: 'check-circle' as const,
      };
    case 'cancelled':
      return {
        label: 'Visite annulée',
        tint: '#FFFFFF',
        color: COLORS.cancelled,
        borderColor: COLORS.cancelled,
        icon: 'slash' as const,
      };
    default:
      return {
        label: 'En attente de confirmation',
        tint: '#FFFFFF',
        color: COLORS.pending,
        borderColor: COLORS.pending,
        icon: 'clock' as const,
      };
  }
};

const formatFullDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export default function LandlordVisitDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const insets = useSafeAreaInsets();
  const { getVisitById, fetchVisit, isLoading } = useLandlordVisits();
  const [isFetching, setIsFetching] = useState(false);

  const visit = id ? getVisitById(id) : undefined;
  const guestDisplayName = useMemo(() => {
    const name = visit?.guest?.name?.trim();
    if (name) return name;
    const username = visit?.guest?.username?.trim();
    if (username) return username;
    return 'Visiteur PUOL';
  }, [visit?.guest?.name, visit?.guest?.username]);

  useEffect(() => {
    if (!id) {
      router.replace('/landlord-visits' as never);
      return;
    }
    if (visit) {
      return;
    }
    setIsFetching(true);
    fetchVisit(id)
      .catch((error) => {
        console.error('[LandlordVisitDetails] Unable to fetch visit', error);
      })
      .finally(() => {
        setIsFetching(false);
      });
  }, [id, fetchVisit, visit, router]);

  const descriptor = useMemo(() => getStatusDescriptor(visit?.status ?? 'pending'), [visit?.status]);

  const handleCallGuest = () => {
    if (!visit?.guest?.phone) {
      return;
    }
    Linking.openURL(`tel:${visit.guest.phone.replace(/\s+/g, '')}`);
  };

  const handleOpenGuestProfile = () => {
    const guestId = visit?.guest?.id;
    if (!guestId) {
      return;
    }
    router.push(`/profile/${guestId}` as never);
  };

  const handleOpenListing = () => {
    if (!visit?.listingId) {
      return;
    }
    router.push(`/property/${visit.listingId}` as never);
  };

  const isLoadingState = isLoading && !visit;
  const isBusy = isLoadingState || isFetching;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: insets.top + 6 }]}>
      <RNStatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail de la visite</Text>
        <View style={{ width: 44 }} />
      </View>

      {isBusy ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Chargement de la visite...</Text>
        </View>
      ) : visit ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.coverWrapper}>
            <Image source={{ uri: visit.listingCoverUrl || FALLBACK_IMAGE }} style={styles.coverImage} />
            <View style={[styles.statusChip, { backgroundColor: descriptor.tint, borderColor: descriptor.borderColor }]}> 
              <Feather name={descriptor.icon} size={14} color={descriptor.color} />
              <Text style={[styles.statusChipText, { color: descriptor.color }]}>{descriptor.label}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Bien concerné</Text>
            <Text style={styles.propertyTitle}>{visit.listingTitle}</Text>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={16} color={COLORS.accent} />
              <Text style={styles.metaText}>{visit.listingLocation}</Text>
            </View>
            <View style={styles.metaRow}>
              <Feather name="calendar" size={16} color={COLORS.accent} />
              <Text style={styles.metaText}>{formatFullDate(visit.visitDate)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Feather name="clock" size={16} color={COLORS.accent} />
              <Text style={styles.metaText}>{visit.visitTime}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionLabel}>Visiteur</Text>
              <TouchableOpacity style={styles.linkButton} onPress={handleOpenListing} activeOpacity={0.85}>
                <Text style={styles.linkButtonText}>Voir l’annonce</Text>
                <Feather name="arrow-up-right" size={14} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.visitorRow} activeOpacity={0.85} onPress={handleOpenGuestProfile}>
              <Avatar
                source={visit.guest?.avatarUrl ? { uri: visit.guest.avatarUrl } : undefined}
                name={guestDisplayName}
                size="xlarge"
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.visitorName}>{visit.guest?.name ?? visit.guest?.username ?? 'Visiteur PUOL'}</Text>
                {visit.guest?.username ? (
                  <Text style={styles.visitorUsername}>@{visit.guest.username}</Text>
                ) : null}
              </View>
              <Feather name="arrow-up-right" size={16} color={COLORS.accent} />
            </TouchableOpacity>
            {visit.guest?.phone ? (
              <TouchableOpacity style={styles.callRow} activeOpacity={0.85} onPress={handleCallGuest}>
                <View style={styles.callIconWrapper}>
                  <Feather name="phone" size={16} color={COLORS.accent} />
                </View>
                <Text style={styles.callText}>{visit.guest.phone}</Text>
                <Feather name="external-link" size={16} color={COLORS.accent} />
              </TouchableOpacity>
            ) : (
              <View style={styles.metaRow}>
                <Feather name="phone" size={16} color={COLORS.muted} />
                <Text style={styles.metaTextMuted}>Numéro non communiqué</Text>
              </View>
            )}
          </View>

          {visit.notes ? (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>Notes du visiteur</Text>
              <Text style={styles.notesText}>{visit.notes}</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Feather name="alert-triangle" size={26} color={COLORS.cancelled} />
          <Text style={styles.loadingText}>Cette visite n’existe pas ou n’est plus disponible.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/landlord-visits' as never)} activeOpacity={0.8}>
            <Text style={styles.retryText}>Retourner à la liste</Text>
            <Feather name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
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
    shadowOpacity: 0.04,
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
  coverWrapper: {
    position: 'relative',
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  coverImage: {
    width: '100%',
    height: 240,
  },
  statusChip: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusChipText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(4,120,87,0.08)',
  },
  linkButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  propertyTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
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
    color: COLORS.dark,
  },
  metaTextMuted: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
  },
  visitorName: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  visitorUsername: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  visitorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  visitorAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PUOL_COLORS.border,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(4,120,87,0.08)',
  },
  callIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(4,120,87,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  notesText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 20,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
