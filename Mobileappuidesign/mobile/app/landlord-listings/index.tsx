import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ResizeMode, Video } from 'expo-av';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProfile } from '@/src/contexts/ProfileContext';
import { useLandlordDashboardListings } from '@/src/features/landlord-listings/dashboard-hooks';
import type { LandlordListingWithRelations } from '@/src/features/landlord-listings/services';
import { orderMediaRowsByType } from '@/src/utils/media';
import { toCdnUrl } from '@/src/utils/cdn';
import { formatListingLocation } from '@/src/utils/location';
import type { ListingMediaRow } from '@/src/types/listings';

const GREEN_PRIMARY = '#2ECC71';
const COLORS = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  dark: '#111827',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: GREEN_PRIMARY,
};

type LandlordListingCard = {
  id: string;
  title: string;
  location: string;
  priceLabel: string;
  depositLabel: string;
  statusLabel: string;
  createdAtLabel: string;
  propertyTypeLabel: string;
  previewUrl: string | null;
  previewType: 'video' | 'photo' | 'none';
  viewCount: number;
  likeCount: number;
};

const formatMonthlyPrice = (value?: number | null) => {
  if (!value || Number.isNaN(value)) {
    return 'Loyer non renseigné';
  }
  return `${value.toLocaleString('fr-FR')} FCFA / mois`;
};

const formatDeposit = (value?: number | null) => {
  if (!value || Number.isNaN(value)) {
    return 'Pas de caution';
  }
  return `Caution ${value.toLocaleString('fr-FR')} FCFA`;
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartement',
  studio: 'Studio',
  chambre: 'Chambre',
  house: 'Maison',
  villa: 'Villa',
  penthouse: 'Penthouse',
  duplex: 'Duplex',
  room: 'Chambre',
};

type LandlordDashboardEntry = LandlordListingWithRelations;

const mapListingToCard = (entry: LandlordDashboardEntry): LandlordListingCard => {
  const { listing, media } = entry;
  const orderedMedia = orderMediaRowsByType<ListingMediaRow>(media ?? []);

  let previewUrl: string | null = listing.cover_photo_url ?? null;
  let previewType: LandlordListingCard['previewType'] = previewUrl ? 'photo' : 'none';

  if (!previewUrl && orderedMedia.length) {
    const primaryVideo = orderedMedia.find((item) => item.media_type === 'video');
    const fallbackMedia = primaryVideo ?? orderedMedia[0];
    if (fallbackMedia) {
      const isVideo = fallbackMedia.media_type === 'video';
      const rawUrl = fallbackMedia.media_url;
      previewUrl = isVideo ? toCdnUrl(rawUrl) ?? rawUrl : rawUrl;
      previewType = isVideo ? 'video' : 'photo';
    }
  } else if (previewUrl && orderedMedia.length) {
    // Si on a une cover mais aussi une vidéo dédiée, privilégier la vidéo en vignette
    const primaryVideo = orderedMedia.find((item) => item.media_type === 'video');
    if (primaryVideo?.media_url) {
      const rawUrl = primaryVideo.media_url;
      previewUrl = toCdnUrl(rawUrl) ?? rawUrl;
      previewType = 'video';
    }
  }

  const propertyTypeLabel = PROPERTY_TYPE_LABELS[listing.property_type ?? ''] ?? (listing.property_type ?? 'Type inconnu');
  const createdAtLabel = (() => {
    const date = new Date(listing.created_at);
    if (Number.isNaN(date.getTime())) {
      return 'Date inconnue';
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  return {
    id: listing.id,
    title: listing.title,
    location: formatListingLocation({
      addressText: listing.address_text,
      district: listing.district,
      city: listing.city,
      fallback: 'Localisation indisponible',
    }) || 'Localisation indisponible',
    priceLabel: formatMonthlyPrice(listing.price_per_month),
    depositLabel: formatDeposit(listing.deposit_amount),
    statusLabel: listing.status === 'draft' ? 'Brouillon' : 'Publié',
    createdAtLabel,
    propertyTypeLabel,
    previewUrl,
    previewType,
    viewCount: entry.viewCount ?? 0,
    likeCount: entry.likeCount ?? 0,
  };
};

const LandlordListingsScreen: React.FC = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const headerPaddingTop = Platform.OS === 'ios' ? Math.max(insets.top - 50, 0) : Math.max(insets.top, 16);

  const { profile, isProfileLoading } = useProfile();
  const { data, isLoading, error, refresh } = useLandlordDashboardListings();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (isProfileLoading) {
      return;
    }

    if (!profile || profile.role !== 'landlord' || profile.landlordStatus !== 'approved') {
      router.replace('/(tabs)/profile' as never);
    }
  }, [isProfileLoading, profile, router]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => null);
    }, [refresh]),
  );

  const cards = useMemo(() => {
    if (!data || !data.length) {
      return [] as LandlordListingCard[];
    }
    return data.map(mapListingToCard);
  }, [data]);

  const listingsCount = cards.length;
  const isEmpty = !isLoading && !error && listingsCount === 0;

  return (
    <SafeAreaView style={[styles.safeArea, isAndroid && styles.safeAreaAndroid]}>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <View
        style={[
          styles.headerWrapper,
          { paddingTop: headerPaddingTop },
          isAndroid && styles.headerWrapperAndroid,
          isAndroid && isScrolled && styles.headerWrapperAndroidScrolled,
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
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Mes annonces</Text>
            <Text style={styles.headerSubtitle}>Suivi des logements long terme</Text>
          </View>
          <View style={isAndroid ? styles.headerSpacerAndroid : { width: 44 }} />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          if (isAndroid) {
            setIsScrolled(nativeEvent.contentOffset.y > 2);
          }
        }}
        scrollEventThrottle={16}
      >
        {isLoading && (
          <View style={styles.loaderWrapper}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loaderLabel}>Chargement de tes annonces…</Text>
          </View>
        )}

        {!!error && !isLoading && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="alert-circle" size={24} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Impossible de récupérer les annonces</Text>
            <Text style={styles.emptySubtitle}>
              Une erreur est survenue pendant le chargement. Réessaie plus tard ou contacte le support si le problème persiste.
            </Text>
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.85} onPress={() => refresh()}>
              <Feather name="refresh-ccw" size={16} color={COLORS.accent} />
              <Text style={styles.secondaryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        )}

        {isEmpty && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="video" size={26} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Aucune annonce publiée</Text>
            <Text style={styles.emptySubtitle}>
              Dès que tu publieras un logement, il apparaîtra ici avec son statut, son loyer, ses vues et ses favoris.
            </Text>
            <TouchableOpacity
              style={styles.primaryButton}
              activeOpacity={0.88}
              onPress={() => router.push('/landlord-listings/new' as never)}
            >
              <Text style={styles.primaryButtonText}>Créer une annonce</Text>
              <Feather name="plus" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {cards.map((card) => {
          return (
            <TouchableOpacity
              key={card.id}
              style={styles.listingCard}
              activeOpacity={0.88}
              onPress={() => router.push(`/landlord-listings/${card.id}/edit` as never)}
            >
              <View style={styles.cardMedia}>
                {card.previewType === 'video' && card.previewUrl ? (
                  <Video
                    source={{ uri: card.previewUrl }}
                    style={styles.cardVideo}
                    resizeMode={ResizeMode.COVER}
                    isMuted
                    shouldPlay={false}
                    useNativeControls={false}
                  />
                ) : card.previewUrl ? (
                  <Image source={{ uri: card.previewUrl }} style={styles.cardImage} />
                ) : (
                  <View style={styles.cardPlaceholder}>
                    <Feather name="image" size={24} color={COLORS.muted} />
                    <Text style={styles.placeholderText}>Aucun média</Text>
                  </View>
                )}

                <View style={styles.mediaOverlayRow}>
                  <TouchableOpacity
                    style={styles.overlayEditButton}
                    activeOpacity={0.9}
                    onPress={() => router.push(`/landlord-listings/${card.id}/edit` as never)}
                  >
                    <Feather name="edit-3" size={14} color="#FFFFFF" />
                    <Text style={styles.overlayEditText}>Modifier</Text>
                  </TouchableOpacity>
                  <View style={styles.statusPill}>
                    <Feather name="zap" size={12} color={COLORS.accent} />
                    <Text style={styles.statusPillText}>{card.statusLabel}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {card.title}
                  </Text>
                  <Text style={styles.cardPrice} numberOfLines={1} adjustsFontSizeToFit>
                    {card.priceLabel}
                  </Text>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.listingLocation} numberOfLines={1} ellipsizeMode="tail">
                    {card.location}
                  </Text>
                  <Text style={styles.cardDate}>{card.createdAtLabel}</Text>
                </View>
              </View>

              <View style={styles.cardStatsRow}>
                {[
                  [
                    { icon: 'home', value: card.propertyTypeLabel, label: 'Type' },
                    { icon: 'shield', value: card.depositLabel, label: 'Caution' },
                  ],
                  [
                    { icon: 'eye', value: `${card.viewCount}`, label: 'Vues' },
                    { icon: 'heart', value: `${card.likeCount}`, label: 'Favoris' },
                  ],
                ].map((row, rowIndex) => (
                  <View key={`${card.id}-statrow-${rowIndex}`} style={styles.statRow}>
                    {row.map((stat) => (
                      <View key={`${card.id}-${stat.label}`} style={styles.statItemBlock}>
                        <Feather name={stat.icon as any} size={16} color={COLORS.accent} />
                        <View>
                          <Text style={styles.statValue}>{stat.value}</Text>
                          <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!isLoading && (
        <View pointerEvents="box-none" style={styles.floatingCtaWrapper}>
          <TouchableOpacity
            style={styles.primaryButton}
            activeOpacity={0.9}
            onPress={() => router.push('/landlord-listings/new' as never)}
          >
            <Text style={styles.primaryButtonText}>Créer une annonce</Text>
            <Feather name="plus" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  safeAreaAndroid: {
    backgroundColor: 'transparent',
  },
  headerWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  headerWrapperAndroid: {
    backgroundColor: COLORS.surface,
    borderBottomColor: COLORS.border,
  },
  headerWrapperAndroidScrolled: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerRowAndroid: {
    paddingBottom: 4,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  navButtonAndroid: {
    elevation: 2,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.muted,
  },
  headerSpacerAndroid: {
    width: 44,
    height: 44,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 20,
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryButton: {
    marginTop: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  loaderWrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loaderLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(5, 150, 105, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.muted,
    textAlign: 'center',
  },
  listingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  cardMedia: {
    height: 220,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  cardVideo: {
    ...StyleSheet.absoluteFillObject,
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  cardPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  placeholderText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
  mediaOverlayRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  overlayEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  overlayEditText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  statusPillText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
    textTransform: 'capitalize',
  },
  cardHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    gap: 12,
  },
  listingTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 12,
  },
  cardMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  listingLocation: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.muted,
  },
  priceColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  cardPrice: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.accent,
  },
  cardDate: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  cardStatsRow: {
    paddingHorizontal: 20,
    paddingBottom: 18,
    flexDirection: 'column',
    gap: 12,
  },
  statGrid: {
    flexDirection: 'row',
    gap: 16,
    flex: 1,
    justifyContent: 'space-between',
  },
  statColumn: {
    flexDirection: 'column',
    gap: 10,
  },
  statColumnInline: {
    flexDirection: 'column',
    gap: 10,
    flex: 1,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statItemInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statItemBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  statValue: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  statLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  floatingCtaWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingBottom: 32,
    backgroundColor: 'transparent',
  },
});

export default LandlordListingsScreen;
