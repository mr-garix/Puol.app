import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode } from 'expo-av';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/src/contexts/AuthContext';
import { useProfile } from '@/src/contexts/ProfileContext';
import { supabase } from '@/src/supabaseClient';
import { fetchListingCountMap } from '@/src/features/listings/services/engagementCounts';
import type { ListingMediaRow } from '@/src/types/listings';
import { formatListingLocation } from '@/src/utils/location';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  dark: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#2ECC71',
};

type HostListingCardData = {
  id: string;
  title: string;
  locationLabel: string;
  priceLabel: string;
  statusLabel: string;
  previewUrl: string | null;
  previewType: 'video' | 'photo' | 'none';
  createdAtLabel: string;
  propertyTypeLabel: string;
  capacityLabel: string;
  viewCount: number;
  likeCount: number;
};

export default function HostListingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const headerPaddingTop = Math.max(insets.top, 16);
  const { supabaseProfile, isLoggedIn } = useAuth();
  const { profile } = useProfile();

  const [listings, setListings] = useState<HostListingCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const listingIdsRef = useRef<Set<string>>(new Set());
  const [isScrolled, setIsScrolled] = useState(false);

  const hostState = useMemo(() => {
    const hostStatus = supabaseProfile?.host_status ?? profile?.hostStatus ?? 'none';
    const role = supabaseProfile?.role ?? profile?.role ?? 'user';

    if (hostStatus === 'approved' || role === 'host') {
      return 'approved';
    }
    if (hostStatus === 'pending') {
      return 'pending';
    }
    return 'none';
  }, [profile?.hostStatus, profile?.role, supabaseProfile?.host_status, supabaseProfile?.role]);

  const applyListingDelta = useCallback(
    (listingId: string, field: 'viewCount' | 'likeCount', delta: number) => {
      setListings((current) => {
        let mutated = false;
        const next = current.map((listing) => {
          if (listing.id !== listingId) {
            return listing;
          }
          mutated = true;
          const nextCount = Math.max(0, listing[field] + delta);
          if (nextCount === listing[field]) {
            return listing;
          }
          return {
            ...listing,
            [field]: nextCount,
          };
        });
        return mutated ? next : current;
      });
    },
    [setListings],
  );

  const formatPrice = useCallback((value?: number | null) => {
    if (!value || Number.isNaN(value)) {
      return 'Tarif non renseigné';
    }
    return `${value.toLocaleString('fr-FR')} FCFA / nuit`;
  }, []);

  const formatLocation = useCallback(
    (addressText?: string | null, district?: string | null, city?: string | null) =>
      formatListingLocation({ addressText, district, city, fallback: 'Localisation indisponible' }) || 'Localisation indisponible',
    [],
  );

  const formatCreatedAt = useCallback((iso: string) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) {
      return 'Date inconnue';
    }
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }, []);

  const handleEditListing = useCallback(
    (listingId: string) => {
      router.push(`/host-listings/${listingId}/edit` as never);
    },
    [router],
  );

  const handleCreateListing = useCallback(() => {
    if (hostState === 'approved') {
      router.push('/host-listings/new' as never);
      return;
    }

    router.push('/host' as never);
  }, [hostState, router]);

  const fetchHostListings = useCallback(async () => {
    if (!supabaseProfile?.id) {
      setIsLoading(false);
      setListings([]);
      setError(isLoggedIn ? "Impossible d'identifier votre profil hôte." : 'Connectez-vous pour voir vos annonces.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data: listingRows, error: listingsError } = await supabase
        .from('listings')
        .select('*')
        .eq('host_id', supabaseProfile.id)
        .order('created_at', { ascending: false });

      if (listingsError) {
        throw listingsError;
      }

      const rows = listingRows ?? [];

      if (!rows.length) {
        listingIdsRef.current = new Set();
        setListings([]);
        return;
      }

      const listingIds = rows.map((row) => row.id);
      listingIdsRef.current = new Set(listingIds);
      const [mediaResult, viewCountByListing, likeCountByListing] = await Promise.all([
        supabase
          .from('listing_media')
          .select('*')
          .in('listing_id', listingIds)
          .order('position', { ascending: true }),
        fetchListingCountMap('listing_views', listingIds),
        fetchListingCountMap('listing_likes', listingIds),
      ]);

      const { data: mediaRows, error: mediaError } = mediaResult;
      if (mediaError) {
        throw mediaError;
      }

      const mediaByListing = (mediaRows ?? []).reduce<Record<string, ListingMediaRow[]>>((acc, media) => {
        if (!acc[media.listing_id]) {
          acc[media.listing_id] = [];
        }
        acc[media.listing_id].push(media as ListingMediaRow);
        return acc;
      }, {});

      const mapped: HostListingCardData[] = rows.map((listing) => {
        const mediaList = mediaByListing[listing.id] ?? [];
        const coverPhotoUrl = listing.cover_photo_url ?? null;

        let previewUrl: string | null = coverPhotoUrl;
        let previewType: HostListingCardData['previewType'] = coverPhotoUrl ? 'photo' : 'none';

        if (!previewUrl) {
          const primaryVideo = mediaList.find((item) => item.media_type === 'video');
          const fallbackMedia = mediaList[0];
          const previewMedia = primaryVideo ?? fallbackMedia ?? null;
          previewUrl = previewMedia?.media_url ?? null;
          previewType = previewMedia?.media_type
            ? (previewMedia.media_type as 'video' | 'photo')
            : previewUrl
            ? 'photo'
            : 'none';
        }

        const isDraft = (listing.status ?? '').toLowerCase() !== 'published';
        const statusLabel = isDraft ? 'Brouillon' : 'Publié';

        return {
          id: listing.id,
          title: listing.title,
          locationLabel: formatLocation(listing.address_text, listing.district, listing.city),
          priceLabel: formatPrice(listing.price_per_night),
          statusLabel,
          previewUrl,
          previewType,
          createdAtLabel: formatCreatedAt(listing.created_at),
          propertyTypeLabel: listing.property_type ?? 'Type non défini',
          capacityLabel: listing.capacity ? `${listing.capacity} pers.` : 'Capacité inconnue',
          viewCount: viewCountByListing[listing.id] ?? 0,
          likeCount: likeCountByListing[listing.id] ?? 0,
        };
      });

      setListings(mapped);
    } catch (fetchError) {
      console.error('[HostListings] fetch error', fetchError);
      setListings([]);
      setError("Impossible de charger vos annonces.");
    } finally {
      setIsLoading(false);
    }
  }, [formatCreatedAt, formatLocation, formatPrice, isLoggedIn, supabaseProfile?.id]);

  useEffect(() => {
    fetchHostListings();
  }, [fetchHostListings]);

  useFocusEffect(
    useCallback(() => {
      fetchHostListings();
    }, [fetchHostListings]),
  );

  useEffect(() => {
    const hostId = supabaseProfile?.id;
    if (!hostId) {
      return undefined;
    }

    type ListingEdge = { listing_id?: string | null } | null;

    const channel = supabase
      .channel(`host-listings:${hostId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listings', filter: `host_id=eq.${hostId}` },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
            void fetchHostListings();
          }
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listing_views' }, (payload) => {
        const next = (payload.new as ListingEdge) ?? null;
        const prev = (payload.old as ListingEdge) ?? null;
        const listingId = next?.listing_id ?? prev?.listing_id ?? null;
        if (listingId && listingIdsRef.current.has(listingId)) {
          if (payload.eventType === 'INSERT') {
            applyListingDelta(listingId, 'viewCount', 1);
          } else if (payload.eventType === 'DELETE') {
            applyListingDelta(listingId, 'viewCount', -1);
          } else {
            void fetchHostListings();
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listing_likes' }, (payload) => {
        const next = (payload.new as ListingEdge) ?? null;
        const prev = (payload.old as ListingEdge) ?? null;
        const listingId = next?.listing_id ?? prev?.listing_id ?? null;
        if (listingId && listingIdsRef.current.has(listingId)) {
          if (payload.eventType === 'INSERT') {
            applyListingDelta(listingId, 'likeCount', 1);
          } else if (payload.eventType === 'DELETE') {
            applyListingDelta(listingId, 'likeCount', -1);
          } else {
            void fetchHostListings();
          }
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [applyListingDelta, fetchHostListings, supabaseProfile?.id]);

  const isEmpty = useMemo(() => !isLoading && listings.length === 0 && !error, [isLoading, listings.length, error]);

  const shouldShowPendingNotice = hostState === 'pending';

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
            <Text style={styles.headerSubtitle}>Retrouvez tous vos logements publiés</Text>
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
            <Text style={styles.loaderLabel}>Chargement de vos annonces…</Text>
          </View>
        )}

        {shouldShowPendingNotice && !isLoading && !error && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingIcon}>
              <Feather name="clock" size={20} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pendingTitle}>Activation en cours</Text>
              <Text style={styles.pendingSubtitle}>
                Ton accès hôte est en vérification. Dès validation, tu pourras publier tes annonces depuis cet espace.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.pendingButton}
              activeOpacity={0.88}
              onPress={() => router.push('/host' as never)}
            >
              <Text style={styles.pendingButtonText}>Voir ma demande</Text>
            </TouchableOpacity>
          </View>
        )}

        {!!error && !isLoading && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Oups…</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
            <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={fetchHostListings}>
              <Text style={styles.ctaText}>Réessayer</Text>
              <Feather name="refresh-ccw" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {isEmpty && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="video" size={30} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Aucune annonce publiée</Text>
            <Text style={styles.emptySubtitle}>
              Dès que vous publiez une vidéo ou une annonce, elle apparaîtra automatiquement dans cet historique.
            </Text>
            <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={handleCreateListing}>
              <Text style={styles.ctaText}>Créer une annonce</Text>
              <Feather name="plus" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {listings.map((listing) => {
          const statItems = [
            { key: 'type', label: 'Type', value: listing.propertyTypeLabel, icon: 'home' as const },
            { key: 'capacity', label: 'Capacité', value: listing.capacityLabel, icon: 'users' as const },
            { key: 'views', label: 'Vues', value: listing.viewCount.toString(), icon: 'eye' as const },
            { key: 'likes', label: 'Likes', value: listing.likeCount.toString(), icon: 'heart' as const },
          ];

          return (
          <TouchableOpacity
            key={listing.id}
            style={styles.listingCard}
            activeOpacity={0.88}
            onPress={() => handleEditListing(listing.id)}
          >
            <View style={styles.cardMedia}>
              {listing.previewType === 'video' && listing.previewUrl ? (
                <Video
                  source={{ uri: listing.previewUrl }}
                  style={styles.cardVideo}
                  resizeMode={ResizeMode.COVER}
                  isMuted
                  shouldPlay={false}
                  useNativeControls={false}
                />
              ) : listing.previewUrl ? (
                <Image source={{ uri: listing.previewUrl }} style={styles.cardImage} />
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
                  onPress={() => handleEditListing(listing.id)}
                >
                  <Feather name="edit-3" size={14} color="#FFFFFF" />
                  <Text style={styles.overlayEditText}>Modifier</Text>
                </TouchableOpacity>
                <View
                  style={[styles.statusPill, listing.statusLabel === 'Publié' ? styles.statusPillPublished : styles.statusPillDraft]}
                >
                  <Feather
                    name={listing.statusLabel === 'Publié' ? 'zap' : 'edit-3'}
                    size={12}
                    color={COLORS.accent}
                  />
                  <Text style={styles.statusPillText}>{listing.statusLabel}</Text>
                </View>
              </View>
            </View>

            <View style={styles.cardHeader}>
              <Text style={styles.listingTitle} numberOfLines={1}>
                {listing.title}
              </Text>
              <View style={styles.cardMetaRow}>
                <Text style={styles.listingLocation} numberOfLines={2} ellipsizeMode="tail">
                  {listing.locationLabel}
                </Text>
                <View style={styles.priceColumn}>
                  <Text style={styles.cardPrice} numberOfLines={1} adjustsFontSizeToFit>
                    {listing.priceLabel}
                  </Text>
                  <Text style={styles.cardDate}>{listing.createdAtLabel}</Text>
                </View>
              </View>
            </View>
            <View style={styles.cardStatsRow}>
              {statItems.map((stat) => (
                <View key={`${listing.id}-${stat.key}`} style={styles.statItem}>
                  <Feather name={stat.icon} size={16} color={COLORS.accent} />
                  <View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={styles.statLabel}>{stat.label}</Text>
                  </View>
                </View>
              ))}
            </View>
          </TouchableOpacity>
          );
        })}

      </ScrollView>

      {!isEmpty && !isLoading && (
        <View pointerEvents="box-none" style={styles.floatingCtaWrapper}>
          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={handleCreateListing}>
            <Text style={styles.ctaText}>Créer une annonce</Text>
            <Feather name="plus" size={16} color="#FFFFFF" />
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
  safeAreaAndroid: {
    backgroundColor: '#F9FAFB',
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  headerWrapperAndroid: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerWrapperAndroidScrolled: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
  },
  headerSpacerAndroid: {
    width: 40,
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
    paddingBottom: 140,
    gap: 16,
  },
  loaderWrapper: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 12,
  },
  loaderLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  pendingIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: 'rgba(46,204,113,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  pendingSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.muted,
  },
  pendingButton: {
    alignSelf: 'stretch',
    backgroundColor: COLORS.accent,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingButtonText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 28,
    paddingRight: 28,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  ctaText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  floatingCtaWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 54,
    alignItems: 'center',
  },
  listingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 10,
  },
  cardMedia: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  cardVideo: {
    width: '100%',
    height: 170,
  },
  cardPlaceholder: {
    width: '100%',
    height: 170,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  placeholderText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  mediaOverlayRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'column',
    gap: 2,
  },
  locationPriceRow: {
    marginTop: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.35)',
    backgroundColor: '#FFFFFF',
    shadowColor: '#2ECC71',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  statusPillPublished: {
    borderColor: 'rgba(46,204,113,0.35)',
  },
  statusPillDraft: {
    borderColor: 'rgba(46,204,113,0.25)',
  },
  statusPillText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.accent,
  },
  listingTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginTop: 6,
  },
  cardMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  priceColumn: {
    alignItems: 'flex-end',
    gap: 2,
    flexShrink: 0,
    minWidth: 90,
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
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listingLocation: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    flex: 1,
    flexShrink: 1,
    lineHeight: 18,
  },
  overlayEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  overlayEditText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardImage: {
    width: '100%',
    height: 170,
  },
  cardStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    rowGap: 12,
    columnGap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexBasis: '48%',
  },
  statValue: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
});
