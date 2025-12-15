import React, { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ImageBackground,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';

import { useFeed, type PropertyListing } from '@/src/contexts/FeedContext';
import { prefetchListingData } from '@/features/listings/hooks/useListingDetails';
import { PUOL_COLORS } from '@/src/constants/theme';
import TopFeedTabs from '../../components/navigation/TopFeedTabs';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const EXPLORER_HORIZONTAL_PADDING = 20;
const EXPLORER_CARD_GAP = 16;
const EXPLORER_LARGE_CARD_HEIGHT = 240;
const EXPLORER_SMALL_CARD_HEIGHT = 188;
const EXPLORER_SMALL_CARD_WIDTH = (SCREEN_WIDTH - EXPLORER_HORIZONTAL_PADDING * 2 - EXPLORER_CARD_GAP) / 2;
const TOP_TAB_BUTTON_WIDTH = 86;
const TOP_TAB_SPACING = 8;
const TOP_TAB_UNDERLINE_WIDTH = 48;
const TOP_TAB_TOTAL_WIDTH = TOP_TAB_BUTTON_WIDTH * 2 + TOP_TAB_SPACING;

const EXPLORER_FALLBACK_COVER =
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80';

const EXPLORER_TYPE_METADATA = {
  apartment: {
    label: 'Appartements',
    accent: PUOL_COLORS.primary,
    badgeBackground: PUOL_COLORS.primaryLight,
  },
  studio: {
    label: 'Studios',
    accent: PUOL_COLORS.primary,
    badgeBackground: PUOL_COLORS.primaryLight,
  },
  chambre: {
    label: 'Chambres',
    accent: PUOL_COLORS.primary,
    badgeBackground: PUOL_COLORS.primaryLight,
  },
  house: {
    label: 'Maisons',
    accent: PUOL_COLORS.primary,
    badgeBackground: PUOL_COLORS.primaryLight,
  },
  villa: {
    label: 'Villas',
    accent: PUOL_COLORS.primary,
    badgeBackground: PUOL_COLORS.primaryLight,
  },
  boutique: {
    label: 'Boutiques',
    accent: PUOL_COLORS.primary,
    badgeBackground: PUOL_COLORS.primaryLight,
  },
  bureau: {
    label: 'Bureaux',
    accent: PUOL_COLORS.primary,
    badgeBackground: PUOL_COLORS.primaryLight,
  },
  'espace commercial': {
    label: 'Espaces commerciaux',
    accent: PUOL_COLORS.primary,
    badgeBackground: PUOL_COLORS.primaryLight,
  },
  terrain: {
    label: 'Terrains',
    accent: PUOL_COLORS.primary,
    badgeBackground: PUOL_COLORS.primaryLight,
  },
  autre: {
    label: 'Coup de cœur',
    accent: PUOL_COLORS.primary,
    badgeBackground: PUOL_COLORS.primaryLight,
  },
} as const;

type ExplorerTypeKey = keyof typeof EXPLORER_TYPE_METADATA;

type ExplorerSection = {
  key: ExplorerTypeKey;
  title: string;
  accent: string;
  badgeBackground: string;
  listings: PropertyListing[];
};

const EXPLORER_SECTION_ORDER: ExplorerTypeKey[] = [
  'apartment',
  'studio',
  'chambre',
  'house',
  'villa',
  'boutique',
  'bureau',
  'espace commercial',
  'terrain',
  'autre',
];

const normalizeExplorerPropertyType = (value?: string | null): ExplorerTypeKey => {
  const raw = (value ?? '').trim().toLowerCase();
  if (raw && raw in EXPLORER_TYPE_METADATA) {
    return raw as ExplorerTypeKey;
  }

  if (!raw) {
    return 'autre';
  }

  const sanitized = raw
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9 ]/g, '');

  if (sanitized.includes('appart')) {
    return 'apartment';
  }
  if (sanitized.includes('studio')) {
    return 'studio';
  }
  if (sanitized.includes('chambre') || sanitized.includes('room')) {
    return 'chambre';
  }
  if (sanitized.includes('villa')) {
    return 'villa';
  }
  if (sanitized.includes('maison') || sanitized.includes('house') || sanitized.includes('duplex')) {
    return 'house';
  }
  if (sanitized.includes('boutique') || sanitized.includes('shop') || sanitized.includes('magasin')) {
    return 'boutique';
  }
  if (sanitized.includes('bureau') || sanitized.includes('office')) {
    return 'bureau';
  }
  if (sanitized.includes('terrain') || sanitized.includes('lot')) {
    return 'terrain';
  }
  if (sanitized.includes('commercial')) {
    return 'espace commercial';
  }

  return 'autre';
};

const formatCompactNumber = (value?: number | null) => {
  if (!value || value <= 0) {
    return '0';
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, '')}k`;
  }
  return `${value}`;
};

const ExplorerScreen = () => {
  const { propertyListings, isLoadingListings, listingsError, refreshListings } = useFeed();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // États pour la gestion des onglets
  const [activeTopTab, setActiveTopTab] = useState<'explorer' | 'pourToi'>('explorer');
  const topTabAnim = useRef(new Animated.Value(0)).current; // 0 = explorer, 1 = pourToi
  const lastAutoRefreshRef = useRef(0);
  const isExplorerFocused = useIsFocused();
  
  // Gestion du changement d'onglet avec animation améliorée
  const handleTopTabChange = useCallback((tab: 'explorer' | 'pourToi') => {
    if (tab === activeTopTab) return;
    
    setActiveTopTab(tab);
    Animated.spring(topTabAnim, {
      toValue: tab === 'pourToi' ? 1 : 0,
      useNativeDriver: true,
      friction: 4.5,
      tension: 140,
    }).start();

    if (tab === 'pourToi') {
      router.push('/(tabs)/home');
    }
  }, [activeTopTab, router, topTabAnim]);

  const tabSwipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -30) {
          handleTopTabChange('pourToi');
        } else if (gestureState.dx > 30) {
          handleTopTabChange('explorer');
        }
      },
    }),
  ).current;

  useEffect(() => {
    if (!isExplorerFocused) {
      return;
    }

    setActiveTopTab('explorer');
    topTabAnim.stopAnimation(() => {
      topTabAnim.setValue(0.08);
      Animated.spring(topTabAnim, {
        toValue: 0,
        useNativeDriver: true,
        friction: 6,
        tension: 150,
      }).start();
    });
  }, [isExplorerFocused, topTabAnim]);

  useEffect(() => {
    if (!isExplorerFocused) {
      return;
    }

    const now = Date.now();
    const MIN_REFRESH_INTERVAL = 30_000;

    if (now - lastAutoRefreshRef.current < MIN_REFRESH_INTERVAL) {
      return;
    }

    lastAutoRefreshRef.current = now;
    void refreshListings();
  }, [isExplorerFocused, refreshListings]);

  const underlineBaseOffset = useMemo(
    () => (TOP_TAB_BUTTON_WIDTH - TOP_TAB_UNDERLINE_WIDTH) / 2,
    [],
  );

  const underlineTranslateX = useMemo(
    () =>
      topTabAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [
          underlineBaseOffset,
          underlineBaseOffset + TOP_TAB_BUTTON_WIDTH + TOP_TAB_SPACING,
        ],
        extrapolate: 'clamp',
      }),
    [topTabAnim, underlineBaseOffset],
  );

  const explorerOpacity = useMemo(
    () =>
      topTabAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0.7],
        extrapolate: 'clamp',
      }),
    [topTabAnim],
  );

  const pourToiOpacity = useMemo(
    () =>
      topTabAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.7, 1],
        extrapolate: 'clamp',
      }),
    [topTabAnim],
  );

  const explorerScale = useMemo(
    () =>
      topTabAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1.06, 0.94],
        extrapolate: 'clamp',
      }),
    [topTabAnim],
  );

  const pourToiScale = useMemo(
    () =>
      topTabAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.94, 1.06],
        extrapolate: 'clamp',
      }),
    [topTabAnim],
  );

  const underlineColor = PUOL_COLORS.primary;

  const getListingCover = useCallback((listing: PropertyListing) => {
    const candidates = [listing.coverPhotoUrl, listing.imageUrl];
    const valid = candidates.find((uri) => typeof uri === 'string' && uri.trim().length > 0);
    return valid ?? EXPLORER_FALLBACK_COVER;
  }, []);

  const sections = useMemo(() => {
    const buckets = new Map<ExplorerTypeKey, PropertyListing[]>();
    EXPLORER_SECTION_ORDER.forEach((key) => buckets.set(key, []));

    propertyListings.forEach((listing) => {
      const normalized = normalizeExplorerPropertyType(listing.propertyType);
      const bucket = buckets.get(normalized);
      if (bucket) {
        bucket.push(listing);
      }
    });

    return EXPLORER_SECTION_ORDER.map((key) => {
      const entries = buckets.get(key) ?? [];
      if (!entries.length) {
        return null;
      }
      const metadata = EXPLORER_TYPE_METADATA[key];
      const sorted = [...entries].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
      return {
        key,
        title: metadata.label,
        accent: metadata.accent,
        badgeBackground: metadata.badgeBackground,
        listings: sorted.slice(0, 8),
      } satisfies ExplorerSection;
    }).filter(Boolean) as ExplorerSection[];
  }, [propertyListings]);

  const [highlightIndexBySection, setHighlightIndexBySection] = useState<Partial<Record<ExplorerTypeKey, number>>>({});

  useEffect(() => {
    if (!sections.length) {
      setHighlightIndexBySection((prev) => (Object.keys(prev).length ? {} : prev));
      return;
    }

    setHighlightIndexBySection((prev) => {
      const next: Partial<Record<ExplorerTypeKey, number>> = {};
      let changed = Object.keys(prev).length !== sections.length;

      sections.forEach((section) => {
        const total = section.listings.length;
        if (!total) {
          return;
        }

        const previousIndex = prev[section.key] ?? -1;
        const nextIndex = (previousIndex + 1) % total;
        next[section.key] = nextIndex;

        if ((prev[section.key] ?? -1) !== nextIndex) {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [sections]);

  const handleOpenListing = useCallback(
    async (listingId: string) => {
      try {
        await prefetchListingData(listingId);
      } catch (error) {
        console.warn('[Explorer] prefetch error', listingId, error);
      }
      router.push(`/property/${listingId}`);
    },
    [router],
  );

  const renderLargeCard = (section: ExplorerSection, listing: PropertyListing) => {
    const coverUri = getListingCover(listing);
    return (
      <TouchableOpacity
        key={listing.id}
        activeOpacity={0.9}
        onPress={() => handleOpenListing(listing.id)}
        style={styles.largeCard}
      >
        <ImageBackground
          source={{ uri: coverUri }}
          style={styles.largeCardImage}
          resizeMode="cover"
        >
          <View style={styles.largeCardOverlay}>
            <View style={styles.cardTopRow}>
              {listing.hasPromotion && (
                <View style={[styles.pillBadge, { backgroundColor: section.accent }]}> 
                  <Text style={styles.pillBadgeText}>Offre</Text>
                </View>
              )}
              <View style={[styles.pillBadge, styles.pillBadgeLight]}> 
                <Text style={[styles.pillBadgeText, styles.pillBadgeLightText, { color: section.accent }]}>
                  {section.title}
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.largeCardBody}>
          <Text style={styles.largeCardTitle} numberOfLines={2}>
            {listing.title}
          </Text>
          <View style={styles.largeCardLocationRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={section.accent} />
            <Text style={styles.largeCardLocation} numberOfLines={1}>
              {listing.location}
            </Text>
          </View>
          <View style={styles.largeCardFooter}>
            <Text style={[styles.largeCardPrice, { color: section.accent }]}>{listing.price}</Text>
            <View style={styles.largeCardStat}>
              <MaterialCommunityIcons name="heart" size={18} color={section.accent} />
              <Text style={[styles.largeCardStatText, { color: section.accent }]}>
                {formatCompactNumber(listing.likes)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSmallCard = (section: ExplorerSection, listing: PropertyListing) => {
    const tags = (listing.tags ?? []).slice(0, 2);
    const coverUri = getListingCover(listing);
    return (
      <TouchableOpacity
        key={listing.id}
        activeOpacity={0.9}
        onPress={() => handleOpenListing(listing.id)}
        style={styles.smallCard}
      >
        <ImageBackground
          source={{ uri: coverUri }}
          style={styles.smallCardImage}
          resizeMode="cover"
        >
          {listing.hasPromotion && (
            <View style={[styles.pillBadge, styles.smallCardPromotion, { backgroundColor: section.accent }]}> 
              <Text style={styles.pillBadgeText}>Offre</Text>
            </View>
          )}
        </ImageBackground>
        <View style={styles.smallCardBody}>
          <Text style={styles.smallCardTitle} numberOfLines={2}>
            {listing.title}
          </Text>
          <Text style={styles.smallCardLocation} numberOfLines={1}>
            {listing.location}
          </Text>
          {!!tags.length && (
            <View style={styles.smallCardTags}>
              {tags.map((tag) => (
                <View
                  key={`${listing.id}-${tag}`}
                  style={[styles.smallTag, { backgroundColor: '#E5E7EB' }]}
                > 
                  <Text style={[styles.smallTagText, { color: '#111827' }]}>{tag}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.smallCardFooter}>
            <Text style={[styles.smallCardPrice, { color: section.accent }]}>{listing.price}</Text>
            <View style={styles.smallCardStat}>
              <MaterialCommunityIcons name="heart" size={15} color={section.accent} />
              <Text style={[styles.smallCardStatText, { color: section.accent }]}>
                {formatCompactNumber(listing.likes)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSection = (section: ExplorerSection) => {
    const highlightIndex = highlightIndexBySection[section.key] ?? 0;
    const featuredListing = section.listings[highlightIndex] ?? section.listings[0];
    const rest = section.listings.filter((_, index) => index !== highlightIndex);

    if (!featuredListing) {
      return null;
    }

    return (
      <View key={section.key} style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={[styles.sectionBadge, { backgroundColor: section.badgeBackground }]}> 
            <Text style={[styles.sectionBadgeText, { color: section.accent }]}>
              {`${section.listings.length} sélection${section.listings.length > 1 ? 's' : ''}`}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionSubtitle}>Les logements les plus appréciés de cette catégorie.</Text>
        {renderLargeCard(section, featuredListing)}
        {rest.length > 0 && (
          <View style={styles.smallCardsGrid}>
            {rest.map((listing) => renderSmallCard(section, listing))}
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (isLoadingListings && !sections.length) {
      return (
        <View style={styles.stateWrapper}>
          <ActivityIndicator size="large" color="#0EA5E9" />
          <Text style={styles.stateText}>Chargement des découvertes…</Text>
        </View>
      );
    }

    if (listingsError && !sections.length) {
      return (
        <View style={styles.stateWrapper}>
          <Text style={styles.stateText}>Impossible de charger Explorer pour le moment.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refreshListings()} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!sections.length) {
      return (
        <View style={styles.stateWrapper}>
          <Text style={styles.stateText}>Aucun logement n'est disponible pour l'instant.</Text>
        </View>
      );
    }

    return sections.map(renderSection);
  };

  // Fonction pour gérer le retour à l'écran précédent
  const handleBackToFeed = useCallback(() => {
    router.back();
  }, [router]);

  // Rendu de la vue
  return (
    <View style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header sticky avec fond blanc */}
        <Animated.View 
          style={[
            styles.headerSticky, 
            { 
              paddingTop: insets.top,
              backgroundColor: PUOL_COLORS.background,
              zIndex: 10,
              borderBottomWidth: 0,
              elevation: 0,
            }
          ]}
        >
          {/* Barre d'onglets centrée */}
          <View style={styles.headerTabsWrapper}>
            <TopFeedTabs
              activeTab={activeTopTab}
              onTabChange={handleTopTabChange}
              underlineTranslateX={underlineTranslateX}
              underlineColor={underlineColor}
              explorerStyle={{
                opacity: explorerOpacity,
                transform: [{ scale: explorerScale }],
              }}
              pourToiStyle={{
                opacity: pourToiOpacity,
                transform: [{ scale: pourToiScale }],
              }}
              panHandlers={tabSwipeResponder.panHandlers}
              containerStyle={styles.headerTabsContainer}
              activeTextStyles={{
                explorer: styles.headerTabTextActive,
                pourToi: styles.headerTabTextInactive,
              }}
              inactiveTextStyle={styles.headerTabTextInactive}
              underlineStyle={styles.headerTabUnderline}
            />
          </View>
        </Animated.View>
        
        <ScrollView
          style={{
            flex: 1,
            paddingTop: 45, // Ajustement total de -15 px vs. les 60 px initiaux
            paddingBottom: 48,
            paddingHorizontal: EXPLORER_HORIZONTAL_PADDING,
          }}
          contentContainerStyle={{
            paddingTop: insets.top + 45, // Aligné avec le nouveau décalage
          }}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          bounces={true}
        >
          {renderContent()}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: PUOL_COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: PUOL_COLORS.background,
  },
  // Styles de l'en-tête et des onglets mis à jour pour correspondre au HomeFeedScreen
  headerSticky: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingBottom: 12,
    zIndex: 10,
  },
  headerTabsWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  headerTabsContainer: {
    width: 180,
    position: 'relative',
    alignSelf: 'center',
  },
  headerTabTextInactive: {
    color: 'rgba(0, 0, 0, 0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  headerTabTextActive: {
    color: PUOL_COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  headerTabUnderline: {
    position: 'absolute',
    bottom: -8,
    height: 3,
    width: 60,
    borderRadius: 1.5,
    backgroundColor: PUOL_COLORS.primary,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: PUOL_COLORS.dark,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: PUOL_COLORS.muted,
  },
  section: {
    marginBottom: 36,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  sectionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
  },
  largeCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 22,
    backgroundColor: '#F9FAFB',
    shadowColor: '#0F172A',
    shadowOpacity: 0.22,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 18 },
    elevation: 10,
  },
  largeCardImage: {
    width: '100%',
    height: EXPLORER_LARGE_CARD_HEIGHT,
    justifyContent: 'flex-start',
  },
  largeCardOverlay: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(15,23,42,0.18)',
    justifyContent: 'flex-start',
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pillBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: 'rgba(15,23,42,0.45)',
  },
  pillBadgeLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  pillBadgeLightText: {
    color: '#0F172A',
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  largeCardBody: {
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  largeCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  largeCardLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  largeCardLocation: {
    color: '#6B7280',
    fontSize: 12,
  },
  largeCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  largeCardPrice: {
    fontSize: 15,
    fontWeight: '700',
  },
  largeCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  largeCardStatText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  smallCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: EXPLORER_CARD_GAP,
  },
  smallCard: {
    width: EXPLORER_SMALL_CARD_WIDTH,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: PUOL_COLORS.surface,
    shadowColor: PUOL_COLORS.dark,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  smallCardImage: {
    width: '100%',
    height: EXPLORER_SMALL_CARD_HEIGHT,
  },
  smallCardPromotion: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  smallCardBody: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  smallCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PUOL_COLORS.dark,
  },
  smallCardLocation: {
    fontSize: 11,
    color: PUOL_COLORS.muted,
  },
  smallCardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  smallTag: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  smallTagText: {
    fontSize: 8.5,
    fontWeight: '600',
  },
  smallCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  smallCardPrice: {
    fontSize: 11,
    fontWeight: '700',
  },
  smallCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  smallCardStatText: {
    fontSize: 11,
    fontWeight: '600',
  },
  stateWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  stateText: {
    marginTop: 12,
    fontSize: 14,
    color: PUOL_COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: PUOL_COLORS.primary,
  },
  retryButtonText: {
    color: PUOL_COLORS.surface,
    fontSize: 13,
    fontWeight: '700',
  },
});

export default ExplorerScreen;