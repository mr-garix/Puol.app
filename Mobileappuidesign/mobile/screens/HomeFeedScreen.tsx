  import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Pressable,
  Dimensions,
  Image,
  FlatList,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  Platform,
  SafeAreaView,
  PanResponder,
  Modal,
  GestureResponderEvent,
  AppState,
  type AppStateStatus,
  ViewToken,
  ActivityIndicator,
} from 'react-native';

import { BlurView } from 'expo-blur';
import { ResizeMode } from 'expo-av';
import * as FileSystem from 'expo-file-system';

import { useRouter } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import PagerView from 'react-native-pager-view';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';

import { CommentBottomSheet } from '@/features/host/components/CommentBottomSheet';
import { useComments as useListingComments } from '@/features/comments/hooks';
import { ShareFeature } from '@/src/components/ui/ShareFeature';
import { SearchModal } from '@/src/features/search/components/SearchModal';
import { useFeed, type PropertyListing } from '@/src/contexts/FeedContext';
import { useListingDetails, prefetchListingData, listingPrefetchCache } from '@/features/listings/hooks/useListingDetails';
import { VideoWithThumbnail } from '@/src/components/VideoWithThumbnail';
import { LoadingImageBackground } from '@/src/components/LoadingImageBackground';
import { useAuth } from '@/src/contexts/AuthContext';
import { AuthModal } from '@/src/features/auth/components/AuthModal';
import { LoginWithOTPScreen } from '@/src/features/auth/components/LoginWithOTPScreen';
import { SignUpScreen } from '@/src/features/auth/components/SignUpScreen';
import TopFeedTabs from '../components/navigation/TopFeedTabs';

import { trackListingView } from '@/src/features/listings/services/viewService';

import type { SearchCriteria } from '@/src/types/search';
import { searchListings, type SearchResultCard } from '@/src/utils/searchResults';
import { usePreloadedVideo } from '@/src/contexts/PreloadContext';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const PUOL_GREEN = '#2ECC71';
const BOTTOM_NAV_HEIGHT = 88;
const PROGRESS_STRIP_WIDTH = SCREEN_WIDTH - 40;
const PROGRESS_SEGMENT_MARGIN = 2;
const TOP_TAB_BUTTON_WIDTH = 86;
const TOP_TAB_SPACING = 8;
const TOP_TAB_UNDERLINE_WIDTH = 48;
const TOP_TAB_TOTAL_WIDTH = TOP_TAB_BUTTON_WIDTH * 2 + TOP_TAB_SPACING;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

const LISTING_MOUNT_WINDOW = 3;
const NEIGHBOR_MEDIA_LIMIT = 2;
const FAST_SCROLL_THRESHOLD_PX_PER_SEC = 1800;
const FAST_SCROLL_COOLDOWN_MS = 700;
const MAX_CACHED_VIDEOS = 6;
const LISTING_VIEW_TRIGGER_DELAY_MS = 1_000;

const getCacheDirectory = () => {
  const fs = FileSystem as { cacheDirectory?: string | null; documentDirectory?: string | null };
  return fs.cacheDirectory ?? fs.documentDirectory ?? '';
};

const buildCachedVideoPath = (mediaKey: string) => `${getCacheDirectory()}feed-video-${mediaKey}.mp4`;

const PROPERTY_TYPE_SUMMARY: Record<string, string> = {
  studio: 'Studio',
  chambre: 'Chambre',
  apartment: 'Appartement',
  house: 'Maison',
  villa: 'Villa',
  boutique: 'Boutique',
  bureau: 'Bureau',
  'espace commercial': 'Espace commercial',
  terrain: 'Terrain',
  autre: 'Coup de cœur',
};

const getMediaItems = (listing: PropertyListing) => listing.media ?? [];

type AuthPurpose = 'comment' | 'comment_like' | 'like';

const TagChips = ({ tags }: { tags: (string | undefined)[] }) => {
  const filtered = tags.filter(Boolean) as string[];
  if (!filtered.length) return null;
  return (
    <View style={styles.tagsRow}>
      {filtered.map((tag, tokenIndex) => (
        <BlurView key={`${tag}-${tokenIndex}`} intensity={28} tint="light" style={styles.tagChip}>
          <View style={styles.tagInner}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        </BlurView>
      ))}
    </View>
  );
};

const formatCurrency = (value?: string) => {
  if (!value) {
    return undefined;
  }
  const numeric = Number(String(value).replace(/\s/g, ''));
  if (!Number.isFinite(numeric)) {
    return value;
  }
  return numeric.toLocaleString('fr-FR');
};

const buildCriteriaChips = (criteria: SearchCriteria | null): string[] => {
  if (!criteria) {
    return [];
  }

  const chips: string[] = [];

  if (criteria.location) {
    chips.push(criteria.location);
  }

  if (criteria.type) {
    chips.push(PROPERTY_TYPE_SUMMARY[criteria.type] ?? criteria.type);
  }

  if (criteria.furnishingType && criteria.type !== 'boutique') {
    chips.push(criteria.furnishingType === 'furnished' ? 'Meublé' : 'Non meublé');
  }

  if (criteria.bedrooms > 0) {
    chips.push(`≥ ${criteria.bedrooms} ch`);
  }

  if (criteria.surfaceArea && criteria.type === 'boutique') {
    chips.push(`${criteria.surfaceArea} m²`);
  }

  return chips.slice(0, 4);
};

const formatTitleForDisplay = (title: string, limit = 32): string => {
  if (title.length <= limit) {
    return title;
  }

  const breakIndex = title.lastIndexOf(' ', limit);
  if (breakIndex === -1) {
    return `${title.slice(0, limit)}\n${title.slice(limit)}`;
  }

  const firstLine = title.slice(0, breakIndex).trimEnd();
  const secondLine = title.slice(breakIndex + 1).trimStart();
  return `${firstLine}\n${secondLine}`;
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerTopOffset = insets.top + 8;
  const [activeTopTab, setActiveTopTab] = useState<'explorer' | 'pourToi'>('pourToi');
  const topTabAnim = useRef(new Animated.Value(1)).current; // 0 = explorer, 1 = pourToi

  const [mediaIndexById, setMediaIndexById] = useState<Record<string, number>>({});
  const [videoPlaybackState, setVideoPlaybackState] = useState<Record<string, boolean>>({});
  const activeVideoKeyRef = useRef<string | null>(null);
  const pagerRef = useRef<PagerView>(null);

  const heartAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const likeButtonScale = useRef(new Animated.Value(1)).current;
  const mediaScrollX = useRef(new Animated.Value(0)).current;
  const { propertyListings, likesById, toggleLike, updateListingCommentCount, refreshListings, preserveFeedForAuthFlow } = useFeed();

  const [activeListingIdx, setActiveListingIdx] = useState(0);
  const prevListingsLengthRef = useRef<number>(0);
  const { preloadedVideoUri } = usePreloadedVideo();
  const isFeedFocused = useIsFocused();
  const [isAppActive, setIsAppActive] = useState(true);
  const allowPlaybackRef = useRef(true);
  const [cachedVideoUris, setCachedVideoUris] = useState<Record<string, string>>({});
  const cleanupCacheRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isScrollAcceleratedRef = useRef(false);
  const { supabaseProfile } = useAuth();
  const supabaseProfileRef = useRef(supabaseProfile);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [showSignUpScreen, setShowSignUpScreen] = useState(false);
  const [authPurpose, setAuthPurpose] = useState<AuthPurpose>('comment');
  const pendingActionRef = useRef<(() => void) | null>(null);
  const pendingListingIdRef = useRef<string | null>(null);

  const viewerForTracking = useMemo(() => {
    if (!supabaseProfile) {
      return null;
    }
    return {
      id: supabaseProfile.id,
      city: supabaseProfile.city ?? null,
    } as const;
  }, [supabaseProfile]);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const activeListingViewRef = useRef<{ listingId: string; startedAt: number } | null>(null);
  const searchResultViewEntriesRef = useRef<Record<string, { startedAt: number }>>({});

  const activeListing = propertyListings[activeListingIdx] ?? null;

  const activeListingId = activeListing?.id ?? '';
  const activeListingHostId = activeListing?.hostId ?? null;
  supabaseProfileRef.current = supabaseProfile;

  useEffect(() => {
    const previousLength = prevListingsLengthRef.current;
    if (previousLength > 0 && propertyListings.length === 0) {
      void refreshListings();
    }
    prevListingsLengthRef.current = propertyListings.length;
  }, [propertyListings.length, refreshListings]);

  useEffect(() => {
    if (propertyListings.length === 0) {
      if (activeListingIdx !== 0) {
        setActiveListingIdx(0);
      }
      return;
    }
    if (activeListingIdx >= propertyListings.length) {
      setActiveListingIdx(0);
    }
  }, [activeListingIdx, propertyListings.length]);

  useEffect(() => {
    if (!supabaseProfile?.id) {
      return;
    }

    const pendingListingId = pendingListingIdRef.current;
    if (!pendingListingId) {
      return;
    }

    const preservedIndex = propertyListings.findIndex((listing) => listing.id === pendingListingId);
    if (preservedIndex >= 0) {
      setActiveListingIdx(preservedIndex);
      requestAnimationFrame(() => {
        pagerRef.current?.setPage?.(preservedIndex);
      });
    }

    pendingListingIdRef.current = null;
  }, [propertyListings, supabaseProfile?.id]);

  const {
    comments,
    replies,
    isLoading: areCommentsLoading,
    isSubmitting: isSubmittingComment,
    loadComments,
    loadReplies,
    addComment,
    deleteComment,
    getRepliesForComment,
    hasReplies,
    getReplyCount,
    getFirstReply,
    totalCommentsCount,
    loadedListingId,
    toggleCommentLike,
    isCommentLiked,
    getCommentLikeCount,
  } = useListingComments(activeListingId, supabaseProfile?.id ?? null, activeListingHostId);
  const addCommentRef = useRef(addComment);
  addCommentRef.current = addComment;
  const toggleCommentLikeRef = useRef(toggleCommentLike);
  toggleCommentLikeRef.current = toggleCommentLike;
  const toggleLikeRef = useRef(toggleLike);
  toggleLikeRef.current = toggleLike;

  const prefetchedCommentsRef = useRef<Set<string>>(new Set());
  const prefetchedListingsRef = useRef<Set<string>>(new Set());

  const hasLoadedComments = loadedListingId === activeListingId;

  useEffect(() => {
    if (!activeListingId || !hasLoadedComments) {
      return;
    }
    updateListingCommentCount(activeListingId, totalCommentsCount);
  }, [activeListingId, hasLoadedComments, totalCommentsCount, updateListingCommentCount]);

  const fetchCommentsForActiveListing = useCallback(async () => {
    if (!activeListingId) {
      return;
    }

    if (!activeListingId || loadedListingId === activeListingId) {
      return;
    }
    await loadComments();
  }, [activeListingId, loadComments, loadedListingId]);

  useEffect(() => {
    if (!activeListingId) {
      return;
    }

    if (!prefetchedCommentsRef.current.has(activeListingId)) {
      prefetchedCommentsRef.current.add(activeListingId);
      loadComments()
        .catch((error) => {
          console.warn('[HomeFeed] preload comments error', error);
          prefetchedCommentsRef.current.delete(activeListingId);
        })
        .then(() => {
          prefetchedCommentsRef.current.add(activeListingId);
        });
    }

    const listingsToPrefetch = [activeListingId];
    const nextListing = propertyListings[activeListingIdx + 1];
    if (nextListing?.id) {
      listingsToPrefetch.push(nextListing.id);
    }

    listingsToPrefetch.forEach((listingId) => {
      if (prefetchedListingsRef.current.has(listingId) || listingPrefetchCache.has(listingId)) {
        return;
      }
      prefetchedListingsRef.current.add(listingId);
      prefetchListingData(listingId).catch((error) => {
        console.warn('[HomeFeed] preload listing error', listingId, error);
        prefetchedListingsRef.current.delete(listingId);
      });
    });
  }, [activeListingId, activeListingIdx, loadComments, propertyListings]);

  const handleOpenComments = useCallback(() => {
    if (!activeListingId) {
      return;
    }
    setIsCommentsVisible(true);
  }, [activeListingId]);

  const handleCloseComments = useCallback(() => {
    setIsCommentsVisible(false);
  }, []);

  useEffect(() => {
    if (!isCommentsVisible) {
      return;
    }
    if (!activeListingId) {
      setIsCommentsVisible(false);
      return;
    }
    void fetchCommentsForActiveListing();
  }, [activeListingId, fetchCommentsForActiveListing, isCommentsVisible, loadComments]);

  const [isSearchVisible, setIsSearchVisible] = useState(false);

  const [searchResults, setSearchResults] = useState<SearchResultCard[] | null>(null);
  const [searchCriteria, setSearchCriteria] = useState<SearchCriteria | null>(null);
  const [isSearchLoading, setIsSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isResultsOverlayVisible, setIsResultsOverlayVisible] = useState(false);
  const [isResultsOverlayMounted, setIsResultsOverlayMounted] = useState(false);
  const [shouldReopenSearch, setShouldReopenSearch] = useState(false);
  const [resultsContext, setResultsContext] = useState<'exact' | 'fallback'>('exact');

  const searchChips = buildCriteriaChips(searchCriteria);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const overlayTranslateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: isResultsOverlayVisible ? 1 : 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayTranslateY, {
        toValue: isResultsOverlayVisible ? 0 : SCREEN_HEIGHT,
        duration: 260,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isResultsOverlayVisible, overlayOpacity, overlayTranslateY]);

  const handleOpenSearch = useCallback(() => {
    setIsSearchVisible(true);
  }, []);

  const handleCloseSearch = useCallback(() => {
    setIsSearchVisible(false);
  }, []);

  const handleSearchSubmit = useCallback(
    async (criteria: SearchCriteria) => {
      setIsSearchLoading(true);
      setSearchError(null);
      try {
        const response = await searchListings(criteria);
        setSearchCriteria(criteria);
        setSearchResults(response.results);
        setResultsContext(response.isFallback ? 'fallback' : 'exact');
        setIsResultsOverlayVisible(true);
        handleCloseSearch();
      } catch (error) {
        console.error('[Search] failed to load listings', error);
        setSearchCriteria(criteria);
        setSearchResults([]);
        setResultsContext('exact');
        setSearchError("Impossible de charger les résultats. Réessaie plus tard.");
        setIsResultsOverlayVisible(true);
        handleCloseSearch();
      } finally {
        setIsSearchLoading(false);
      }
    },
    [handleCloseSearch],
  );

  const handleHideResults = useCallback(() => {
    setIsResultsOverlayVisible(false);
  }, []);

  const handleEditSearch = useCallback(() => {
    setIsResultsOverlayVisible(false);
    setShouldReopenSearch(true);
  }, []);

  useEffect(() => {
    if (!isResultsOverlayMounted && shouldReopenSearch) {
      handleOpenSearch();
      setShouldReopenSearch(false);
    }
  }, [handleOpenSearch, isResultsOverlayMounted, shouldReopenSearch]);

  const isBlockingOverlayOpen =
    isSearchVisible ||
    isResultsOverlayVisible ||
    isResultsOverlayMounted ||
    isCommentsVisible ||
    showAuthModal ||
    showLoginScreen ||
    showSignUpScreen;

  const allowFeedPlayback = isFeedFocused && isAppActive && !isBlockingOverlayOpen;

  useEffect(() => {
    allowPlaybackRef.current = allowFeedPlayback;
  }, [allowFeedPlayback]);

  const trackListingViewWithDuration = useCallback(
    (listingId: string, source: 'feed' | 'search', durationMs: number) => {
      if (!listingId) {
        return;
      }

      const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
      void trackListingView({
        listingId,
        source,
        durationSeconds,
        viewer: viewerForTracking,
      });
    },
    [viewerForTracking],
  );

  const searchViewabilityConfig = useMemo(() => ({ itemVisiblePercentThreshold: 70 }), []);

  const flushActiveListingView = useCallback(() => {
    const data = activeListingViewRef.current;
    if (!data) {
      return;
    }

    const durationMs = Date.now() - data.startedAt;
    if (durationMs >= LISTING_VIEW_TRIGGER_DELAY_MS) {
      trackListingViewWithDuration(data.listingId, 'feed', durationMs);
    }

    activeListingViewRef.current = null;
  }, [trackListingViewWithDuration]);

  useEffect(() => {
    if (!allowFeedPlayback) {
      flushActiveListingView();
      activeListingViewRef.current = null;
      return;
    }

    if (!activeListingId) {
      activeListingViewRef.current = null;
      return;
    }

    const currentView = activeListingViewRef.current;

    if (!currentView || currentView.listingId !== activeListingId) {
      if (currentView) {
        flushActiveListingView();
      }
      activeListingViewRef.current = { listingId: activeListingId, startedAt: Date.now() };
    }
  }, [activeListingId, allowFeedPlayback, flushActiveListingView]);

  const flushSearchViewEntry = useCallback(
    (listingId: string) => {
      const entry = searchResultViewEntriesRef.current[listingId];
      if (!entry) {
        return;
      }

      const durationMs = Date.now() - entry.startedAt;
      if (durationMs >= LISTING_VIEW_TRIGGER_DELAY_MS) {
        trackListingViewWithDuration(listingId, 'search', durationMs);
      }

      delete searchResultViewEntriesRef.current[listingId];
    },
    [trackListingViewWithDuration],
  );

  const flushAllSearchViewEntries = useCallback(() => {
    Object.keys(searchResultViewEntriesRef.current).forEach((id) => {
      const entry = searchResultViewEntriesRef.current[id];
      if (!entry) {
        return;
      }

      const durationMs = Date.now() - entry.startedAt;
      if (durationMs >= LISTING_VIEW_TRIGGER_DELAY_MS) {
        trackListingViewWithDuration(id, 'search', durationMs);
      }
    });
    searchResultViewEntriesRef.current = {};
  }, [trackListingViewWithDuration]);

  const handleSearchViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!isResultsOverlayVisible) {
        return;
      }

      const visibleIds = new Set<string>();

      viewableItems.forEach((token) => {
        if (!token?.isViewable) return;
        const card = token.item as SearchResultCard;
        if (!card?.id) return;
        visibleIds.add(card.id);
        if (searchResultViewEntriesRef.current[card.id]) {
          return;
        }
        searchResultViewEntriesRef.current[card.id] = { startedAt: Date.now() };
      });

      Object.keys(searchResultViewEntriesRef.current).forEach((id) => {
        if (visibleIds.has(id)) {
          return;
        }
        flushSearchViewEntry(id);
      });
    },
    [flushSearchViewEntry, isResultsOverlayVisible],
  );

  useEffect(() => {
    if (!isResultsOverlayMounted && shouldReopenSearch) {
      handleOpenSearch();
      setShouldReopenSearch(false);
    }
  }, [handleOpenSearch, isResultsOverlayMounted, shouldReopenSearch]);

  useEffect(() => {
    if (!isResultsOverlayVisible) {
      flushAllSearchViewEntries();
    }
  }, [flushAllSearchViewEntries, isResultsOverlayVisible]);

  useEffect(() => {
    return () => {
      flushActiveListingView();
      flushAllSearchViewEntries();
    };
  }, [flushActiveListingView, flushAllSearchViewEntries]);

  const getHeroVideoUri = useCallback(
    (listing: PropertyListing) => {
      const heroMedia = listing.media?.find((item) => item.type === 'video');
      if (!heroMedia) return null;
      const mediaKey = `${listing.id}-${heroMedia.id}`;
      if (cachedVideoUris[mediaKey]) {
        return cachedVideoUris[mediaKey];
      }
      const isFirstListing = propertyListings[0]?.id === listing.id;
      const isFirstMedia = listing.media?.[0]?.id === heroMedia.id;
      if (isFirstListing && isFirstMedia && preloadedVideoUri) {
        return preloadedVideoUri;
      }
      return null;
    },
    [cachedVideoUris, preloadedVideoUri, propertyListings],
  );

  const navigateToListing = useCallback(
    async (listingId: string) => {
      const activeVideoKey = activeVideoKeyRef.current;

      await prefetchListingData(listingId);
      const listing = propertyListings.find((item) => item.id === listingId);
      const heroUri = listing ? getHeroVideoUri(listing) : null;
      const query = heroUri ? `?heroUri=${encodeURIComponent(heroUri)}` : '';
      router.push(`/property/${listingId}${query}`);

      if (activeVideoKey) {
        requestAnimationFrame(() => {
          setVideoPlaybackState((prev) => ({
            ...prev,
            [activeVideoKey]: false,
          }));
        });
        activeVideoKeyRef.current = null;
      }
    },
    [getHeroVideoUri, prefetchListingData, propertyListings, router],
  );

  const handleResultPress = useCallback(
    (propertyId: string) => {
      setIsResultsOverlayVisible(false);
      navigateToListing(propertyId);
    },
    [navigateToListing],
  );

  const handleTopTabChange = useCallback(
    (tab: 'explorer' | 'pourToi') => {
      if (tab === activeTopTab) {
        return;
      }

      setActiveTopTab(tab);
      Animated.spring(topTabAnim, {
        toValue: tab === 'pourToi' ? 1 : 0,
        useNativeDriver: true,
        friction: 4.5,
        tension: 140,
      }).start();

      if (tab === 'explorer') {
        router.push('/(tabs)/explore');
      }
    },
    [activeTopTab, router, topTabAnim],
  );

  useEffect(() => {
    if (!isFeedFocused) {
      return;
    }

    topTabAnim.setValue(1);
    setActiveTopTab((prev) => (prev === 'pourToi' ? prev : 'pourToi'));
  }, [isFeedFocused, topTabAnim]);

  const toggleVideoPlayback = useCallback((listingId: string, mediaId: string) => {
    const key = `${listingId}-${mediaId}`;
    setVideoPlaybackState((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? true),
    }));
  }, []);

  const tabSwipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 30) {
          handleTopTabChange('explorer');
        } else if (gestureState.dx < -30) {
          handleTopTabChange('pourToi');
        }
      },
    }),
  ).current;

  const underlineBaseOffset = (TOP_TAB_BUTTON_WIDTH - TOP_TAB_UNDERLINE_WIDTH) / 2;
  const underlineTranslateX = topTabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      underlineBaseOffset,
      underlineBaseOffset + TOP_TAB_BUTTON_WIDTH + TOP_TAB_SPACING,
    ],
    extrapolate: 'clamp',
  });
  const underlineColor = activeTopTab === 'pourToi' ? PUOL_GREEN : '#FFFFFF';

  const explorerScale = topTabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1.06, 0.94],
  });
  const pourToiScale = topTabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.06],
  });
  const explorerOpacity = topTabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.7],
  });
  const pourToiOpacity = topTabAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  const triggerHeartAnimation = () => {
    heartAnim.setValue(0);
    Animated.timing(heartAnim, {
      toValue: 1,
      duration: 750,
      useNativeDriver: true,
    }).start();
  };

  const handleToggleLike = (listingId: string) => {
    const currentlyLiked = !!likesById[listingId];
    if (!currentlyLiked) {
      triggerHeartAnimation();
    }

    Animated.sequence([
      Animated.timing(likeButtonScale, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(likeButtonScale, {
        toValue: 1.25,
        friction: 4,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.spring(likeButtonScale, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    ensureAuthenticated('like', () => {
      toggleLikeRef.current(listingId);
    });
  };

  const handleCardTap = (listingId: string) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 400;

    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleToggleLike(listingId);
      lastTapRef.current = 0;
      return;
    }

    lastTapRef.current = now;
  };

  const onHorizontalScrollEnd = (
    listing: PropertyListing,
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const mediaCount = getMediaItems(listing).length;
    const offsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offsetX / SCREEN_WIDTH);

    if (mediaCount === 0) {
      setMediaIndexById((prev) => ({ ...prev, [listing.id]: 0 }));
      return;
    }

    const clampedIndex = Math.max(0, Math.min(newIndex, mediaCount - 1));
    setMediaIndexById((prev) => ({ ...prev, [listing.id]: clampedIndex }));
  };

  const onHorizontalEndDrag = (
    listing: PropertyListing,
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const mediaCount = getMediaItems(listing).length;

    if (mediaCount === 0) {
      navigateToListing(listing.id);
      return;
    }

    const currentIndex = mediaIndexById[listing.id] ?? 0;
    const velocityX = event.nativeEvent.velocity?.x ?? 0;
    const threshold = Platform.OS === 'ios' ? 0.2 : 0.5;

    if (currentIndex >= mediaCount - 1 && velocityX > threshold) {
      navigateToListing(listing.id);
    }
  };

  const handlePageSelected = useCallback(({ nativeEvent }: { nativeEvent: { position: number } }) => {
    const nextIndex = nativeEvent.position;
    const nextListing = propertyListings[nextIndex];
    const nextListingId = nextListing?.id ?? null;

    setActiveListingIdx(nextIndex);
    mediaScrollX.setValue(0);

    if (!nextListingId) {
      return;
    }

    setMediaIndexById((prev) => {
      const currentValue = prev[nextListingId];
      if (currentValue === 0 || currentValue === undefined) {
        return prev;
      }
      return { ...prev, [nextListingId]: 0 };
    });
  }, [propertyListings, mediaScrollX]);

  const handlePageScrollStateChanged = useCallback(({ nativeEvent }: { nativeEvent: { pageScrollState: string } }) => {
    isScrollAcceleratedRef.current = nativeEvent.pageScrollState === 'dragging';
  }, []);

  const renderListingCard = ({ item, index }: { item: PropertyListing; index: number }) => {
    const listing = item;
    const listingIdx = index;
    const isScrollAccelerated = isScrollAcceleratedRef.current;

    const isLiked = !!likesById[listing.id];

    const formattedTitle = formatTitleForDisplay(listing.title);
    const formattedLikes = (listing.likes ?? 0).toLocaleString('fr-FR');
    const commentCountForDisplay =
      activeListingIdx === index
        ? hasLoadedComments
          ? totalCommentsCount
          : listing.comments ?? 0
        : listing.comments ?? 0;
    const formattedComments = commentCountForDisplay.toLocaleString('fr-FR');

    const shareCount = listing.shares ?? 0;
    const shareUrl = `https://app.puol.co/property/${listing.id}`;
    const tagTokens = (listing.tags ?? []).filter(Boolean) as string[];
    const mediaItems = getMediaItems(listing);

    const heartScale = heartAnim.interpolate({
      inputRange: [0, 0.6, 1],
      outputRange: [0.4, 1.2, 1],
    });
    const heartOpacity = heartAnim.interpolate({
      inputRange: [0, 0.4, 1],
      outputRange: [0, 1, 0],
    });

    return (
      <View style={styles.storiesContainer}>
        <View style={styles.cardBackground}>
          <AnimatedScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => onHorizontalScrollEnd(listing, event)}
            onScrollEndDrag={(event) => onHorizontalEndDrag(listing, event)}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: mediaScrollX } } }],
              { useNativeDriver: false },
            )}
            style={StyleSheet.absoluteFillObject}
          >
            {mediaItems.length > 0 ? (
              mediaItems.map((mediaItem, mediaIdx) => {
                const activeMediaIndex = mediaIndexById[listing.id] ?? 0;
                const mediaKey = `${listing.id}-${mediaItem.id}`;
                const userPrefersPlay = videoPlaybackState[mediaKey] ?? true;
                const allowPlayback = allowFeedPlayback;
                const isVideoActive = activeListingIdx === index && activeMediaIndex === mediaIdx;
                const shouldPlayVideo = allowPlayback && isVideoActive && userPrefersPlay;

                const shouldShowPlayOverlay = isVideoActive && !shouldPlayVideo;
                const isFirstListingVideo = propertyListings[0]?.id === listing.id && mediaIdx === 0;
                const cachedUri = cachedVideoUris[mediaKey];
                const effectiveVideoUrl =
                  cachedUri ?? (isFirstListingVideo && preloadedVideoUri ? preloadedVideoUri : mediaItem.url);

                const listingWindow = isScrollAccelerated ? LISTING_MOUNT_WINDOW + 1 : LISTING_MOUNT_WINDOW;
                const neighborLimit = isScrollAccelerated ? NEIGHBOR_MEDIA_LIMIT + 1 : NEIGHBOR_MEDIA_LIMIT;
                const verticalDistanceFromActive = Math.abs(activeListingIdx - listingIdx);
                const shouldMountListingVideo = verticalDistanceFromActive <= listingWindow;
                const shouldMountVideoInstance =
                  mediaItem.type === 'video' &&
                  shouldMountListingVideo &&
                  (activeListingIdx === index ? Math.abs(activeMediaIndex - mediaIdx) <= 1 : mediaIdx < neighborLimit);

                if (mediaItem.type === 'video' && isVideoActive) {
                  activeVideoKeyRef.current = mediaKey;
                }

                const handlePress = () => {
                  if (mediaItem.type === 'video') {
                    toggleVideoPlayback(listing.id, mediaItem.id);
                    return;
                  }
                  handleCardTap(listing.id);
                };

                return (
                  <Pressable
                    key={`${listing.id}-${mediaItem.id}-${mediaIdx}`}
                    onPress={handlePress}
                    delayLongPress={220}
                    onLongPress={() => handleCardTap(listing.id)}
                  >
                    {mediaItem.type === 'video' ? (
                      shouldMountVideoInstance ? (
                        <View style={styles.videoWrapper}>
                          <VideoWithThumbnail
                            videoUrl={effectiveVideoUrl}
                            style={styles.videoPlayer}
                            resizeMode={ResizeMode.COVER}
                            shouldPlay={shouldPlayVideo}
                            isLooping
                            isMuted={!shouldPlayVideo}
                            useNativeControls={false}
                            onError={(error) => {
                              console.warn('[FeedVideo] error', listing.id, mediaItem.id, error);
                            }}
                            onLoad={() => {
                              if (!cachedUri) {
                                const targetPath = buildCachedVideoPath(mediaKey);
                                FileSystem.getInfoAsync(targetPath)
                                  .then((info) => {
                                    if (info.exists) {
                                      setCachedVideoUris((prev) => ({ ...prev, [mediaKey]: targetPath }));
                                      return;
                                    }
                                    return FileSystem.downloadAsync(effectiveVideoUrl, targetPath)
                                      .then(({ uri }) => {
                                        setCachedVideoUris((prev) => {
                                          const nextEntries = [...Object.entries(prev), [mediaKey, uri]];
                                          while (nextEntries.length > MAX_CACHED_VIDEOS) {
                                            const [evictedKey, evictedUri] = nextEntries.shift() ?? [];
                                            if (typeof evictedUri === 'string') {
                                              FileSystem.deleteAsync(evictedUri, { idempotent: true }).catch(() => null);
                                            }
                                            if (evictedKey) {
                                              // continue to shrink map
                                            }
                                          }
                                          return Object.fromEntries(nextEntries);
                                        });
                                      })
                                      .catch(() => {
                                        FileSystem.deleteAsync(targetPath, { idempotent: true }).catch(() => null);
                                      });
                                  })
                                  .catch(() => null);
                              }
                            }}
                          />
                          {shouldShowPlayOverlay && (
                            <View style={styles.videoControlOverlay} pointerEvents="box-none">
                              <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={(event: GestureResponderEvent) => {
                                  event.stopPropagation();
                                  toggleVideoPlayback(listing.id, mediaItem.id);
                                }}
                              >
                                <Text style={styles.videoControlIcon}>▶</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      ) : (
                        <View style={styles.videoWrapper}>
                          <View
                            style={[
                              styles.videoPlayer,
                              {
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: '#000',
                              },
                            ]}
                          >
                            <Text style={styles.videoControlIcon}>▶</Text>
                          </View>
                        </View>
                      )
                    ) : (
                      <LoadingImageBackground
                        uri={mediaItem.url}
                        style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                        imageStyle={styles.cardImage}
                      />
                    )}
                  </Pressable>
                );
              })
            ) : (
              <Pressable key={`${listing.id}-placeholder`} onPress={() => navigateToListing(listing.id)}>
                <View style={styles.mediaSentinel}>
                  <View style={styles.mediaSentinelContent}>
                    <Text style={styles.mediaSentinelLabel}>AUCUN MÉDIA</Text>
                    <Text style={styles.mediaSentinelTitle}>Visite virtuelle indisponible</Text>
                    <Text style={styles.mediaSentinelSubtitle}>
                      Touchez pour découvrir tous les détails de cette annonce.
                    </Text>
                  </View>
                </View>
              </Pressable>
            )}
          </AnimatedScrollView>

          <Animated.View
            pointerEvents="none"
            style={[
              styles.bigHeartOverlay,
              {
                opacity: heartOpacity,
                transform: [{ scale: heartScale }],
              },
            ]}
          >
            <Image
              source={require('../assets/icons/feed-icon-like.png')}
              style={styles.bigHeartIconImage}
              resizeMode="contain"
            />
          </Animated.View>

          <View style={styles.bottomInfo} pointerEvents="box-none">
            <TagChips tags={tagTokens} />

            <View style={styles.textBlock}>
              <Text
                style={[styles.titleText, styles.textMediumShadow]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {formattedTitle}
              </Text>
              <View style={styles.locationRow}>
                <Image
                  source={require('../assets/icons/feed-icon-location.png')}
                  style={styles.locationPinImage}
                  resizeMode="contain"
                />
                <Text numberOfLines={1} style={[styles.locationText, styles.textLightShadow]}>
                  {listing.location}
                </Text>
              </View>
              <Text style={[styles.priceText, styles.textMediumShadow]}>{listing.price}</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.ctaButton}
              onPress={() => navigateToListing(listing.id)}
            >
              <Text style={styles.ctaText}>DÉCOUVRIR L'OFFRE</Text>
              <Text style={styles.ctaArrow}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rightColumn} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.avatarWrapper}
              activeOpacity={0.8}
              onPress={() => navigateToListing(listing.id)}
            >
              <View style={styles.avatarContainer}>
                <Image source={{ uri: listing.hostAvatar }} style={styles.avatarImage} />
                <View style={styles.avatarVerifiedBadge}>
                  <Image
                    source={require('../assets/icons/feed-icon-verified.png')}
                    style={styles.avatarVerifiedBadgeIcon}
                    resizeMode="contain"
                  />
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} style={styles.rightStatBlock} onPress={() => handleToggleLike(listing.id)}>
              <Animated.View style={[styles.iconShadowContainer, { transform: [{ scale: likeButtonScale }] }]}
              >
                <Image
                  source={require('../assets/icons/feed-icon-like.png')}
                  style={[styles.rightIconImage, isLiked && styles.rightIconImageLiked]}
                  resizeMode="contain"
                />
              </Animated.View>
              <Text style={styles.rightStatText}>{formattedLikes}</Text>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.85} style={styles.rightStatBlock} onPress={handleOpenComments}>
              <View style={styles.iconShadowContainer}>
                <Image
                  source={require('../assets/icons/feed-icon-comment.png')}
                  style={styles.rightIconImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.rightStatText}>{formattedComments}</Text>
            </TouchableOpacity>

            <View style={styles.shareWrapper}>
              <ShareFeature
                listingId={listing.id}
                listingTitle={listing.title}
                shareCount={shareCount}
                buttonColor="#FFFFFF"
                profileId={supabaseProfile?.id ?? null}
              />
            </View>

          </View>
        </View>
      </View>
    );
  };

  const renderSearchResultCard = ({ item }: { item: SearchResultCard }) => {
    const isCommercial = ['boutique', 'espace commercial', 'bureau', 'terrain'].includes(item.propertyType);
    const badgesToShow = item.badges.slice(0, 4);

    const roomMetrics = !isCommercial
      ? [
          { icon: 'bed-outline', label: `${item.bedrooms} chambre${item.bedrooms > 1 ? 's' : ''}` },
          { icon: 'shower', label: `${item.bathrooms} salle${item.bathrooms > 1 ? 's' : ''} de bain` },
          {
            icon: 'silverware-fork-knife',
            label: `${item.kitchens ?? 0} cuisine${(item.kitchens ?? 0) > 1 ? 's' : ''}`,
          },
        ]
      : [];

    return (
      <TouchableOpacity
        style={styles.searchResultCard}
        activeOpacity={0.9}
        onPress={() => handleResultPress(item.id)}
      >
        <ImageBackground
          source={{ uri: item.image }}
          style={styles.searchResultImage}
          imageStyle={styles.searchResultImageRadius}
        />

        <View style={styles.searchResultBody}>
          <View style={styles.searchResultTitleRow}>
            <View style={styles.searchResultTitleWrapper}>
              <Text style={styles.searchResultTitle}>{item.title}</Text>
              <View style={styles.searchResultLocationRow}>
                <MaterialCommunityIcons
                  name="map-marker"
                  size={14}
                  color={PUOL_GREEN}
                  style={styles.searchResultLocationIcon}
                />
                <Text style={styles.searchResultLocation}>{item.locationLabel}</Text>
              </View>
            </View>

            <View style={styles.searchResultPriceBlock}>
              <Text style={styles.searchResultPrice}>{item.priceDisplay}</Text>
              <Text style={styles.searchResultPricePeriod}>{item.pricePeriodLabel}</Text>
            </View>
          </View>

          <View style={styles.searchResultMetricsRow}>
            {!isCommercial && (
              <View style={styles.searchResultMetrics}>
                {roomMetrics.map(({ icon, label }) => (
                  <View key={label} style={styles.metricChip}>
                    <MaterialCommunityIcons
                      name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
                      size={18}
                      color={PUOL_GREEN}
                      style={styles.metricIcon}
                    />
                    <Text style={styles.metricText}>{label}</Text>
                  </View>
                ))}
              </View>
            )}

            {!!badgesToShow.length && (
              <View
                style={[
                  styles.searchResultTagsRowInline,
                  isCommercial && styles.searchResultTagsRowInlineFullWidth,
                ]}
              >
                {badgesToShow.map((badge) => (
                  <View key={badge} style={styles.searchResultTagInline}>
                    <Text style={styles.searchResultTagInlineText}>{badge}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchOverlay = () => {
    if ((!searchResults && !isSearchLoading) || !isResultsOverlayMounted) {
      return null;
    }

    const resultCount = searchResults?.length ?? 0;
    const hasResults = resultCount > 0;
    const showingFallback = resultsContext === 'fallback';
    const modalHeaderPaddingTop = Math.max(insets.top, 20);

    return (
      <Modal
        visible={isResultsOverlayMounted}
        transparent
        statusBarTranslucent
        animationType="slide"
        onRequestClose={handleHideResults}
      >
        <View style={styles.searchOverlayModalRoot} pointerEvents="box-none">
          <View
            pointerEvents={isResultsOverlayVisible ? 'auto' : 'none'}
            style={styles.searchOverlayContainer}
          >
            <Animated.View style={[styles.searchOverlayBackdrop, { opacity: overlayOpacity }]} />
            <Animated.View style={[styles.searchOverlayPanel, { transform: [{ translateY: overlayTranslateY }] }]}>
              <SafeAreaView style={[styles.searchOverlaySafeArea, { paddingTop: modalHeaderPaddingTop }]}>
                <View style={styles.searchOverlayHeader}>
                  <TouchableOpacity style={styles.overlayIconButton} onPress={handleHideResults}>
                    <Text style={styles.overlayIconButtonText}>←</Text>
                  </TouchableOpacity>
                  <View style={styles.overlayHeaderCenter}>
                    <Text style={styles.overlayTitle}>Résultats</Text>
                    <Text style={styles.overlaySubtitle}>
                      {isSearchLoading
                        ? 'Chargement en cours...'
                        : hasResults
                          ? `${resultCount} logement${resultCount > 1 ? 's' : ''} trouvé${resultCount > 1 ? 's' : ''}`
                          : 'Aucun logement trouvé'}
                    </Text>
                  </View>

                  <TouchableOpacity style={styles.overlayIconButton} onPress={handleEditSearch}>
                    <Text style={styles.overlayIconButtonText}>⌕</Text>
                  </TouchableOpacity>
                </View>

                {!!searchChips.length && (
                  <View style={styles.searchChipsRow}>
                    {searchChips.map((chip) => (
                      <View key={chip} style={styles.searchChip}>
                        <Text style={styles.searchChipText}>{chip}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {showingFallback && !isSearchLoading && (
                  <View style={styles.searchFallbackNotice}>
                    <Text style={styles.searchFallbackTitle}>Suggestions similaires</Text>
                    <Text style={styles.searchFallbackSubtitle}>
                      Aucun résultat exact pour ces filtres, voici des logements proches.
                    </Text>
                  </View>
                )}

                {isSearchLoading ? (
                  <View style={styles.searchLoadingState}>
                    <ActivityIndicator size="large" color={PUOL_GREEN} />
                    <Text style={styles.searchLoadingText}>Recherche des meilleures offres...</Text>
                  </View>
                ) : (
                  <>
                    {!!searchError && (
                      <View style={styles.searchErrorBanner}>
                        <Text style={styles.searchErrorText}>{searchError}</Text>
                      </View>
                    )}
                    <FlatList<SearchResultCard>
                      data={searchResults ?? []}
                      keyExtractor={(item) => item.id}
                      renderItem={renderSearchResultCard}
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.searchResultsList}
                      onViewableItemsChanged={handleSearchViewableItemsChanged}
                      viewabilityConfig={searchViewabilityConfig}
                      ListEmptyComponent={!searchError ? (
                        <View style={styles.searchEmptyState}>
                          <Text style={styles.searchEmptyTitle}>Aucun logement trouvé</Text>
                          <Text style={styles.searchEmptySubtitle}>
                            Ajuste les filtres ou essaie une autre localisation.
                          </Text>
                        </View>
                      ) : null}
                    />
                  </>
                )}
              </SafeAreaView>
            </Animated.View>
          </View>
        </View>
      </Modal>
    );
  };

  useEffect(() => {
    if (isResultsOverlayVisible && searchResults) {
      setIsResultsOverlayMounted(true);
      return;
    }

    if (!isResultsOverlayVisible && isResultsOverlayMounted) {
      const delay = shouldReopenSearch ? 40 : 260;
      const timeout = setTimeout(() => setIsResultsOverlayMounted(false), delay);
      return () => clearTimeout(timeout);
    }
  }, [isResultsOverlayMounted, isResultsOverlayVisible, searchResults, shouldReopenSearch]);

  const authRequirementMessage = useMemo(() => {
    switch (authPurpose) {
      case 'like':
        return 'Connectez-vous pour aimer cette annonce.';
      case 'comment_like':
        return 'Connectez-vous pour aimer ce commentaire.';
      case 'comment':
      default:
        return 'Connectez-vous pour publier un commentaire.';
    }
  }, [authPurpose]);

  const ensureAuthenticated = useCallback(
    (purpose: AuthPurpose, action: () => void) => {
      if (supabaseProfileRef.current?.id) {
        action();
        return;
      }

      pendingActionRef.current = action;
      setAuthPurpose(purpose);

      if (purpose === 'like' || purpose === 'comment' || purpose === 'comment_like') {
        pendingListingIdRef.current = activeListingId || null;
        preserveFeedForAuthFlow();
      }

      if (purpose !== 'like') {
        setIsCommentsVisible(false);
      }

      setShowAuthModal(true);
    },
    [activeListingId, preserveFeedForAuthFlow],
  );

  useEffect(() => {
    if (!supabaseProfileRef.current?.id || !pendingActionRef.current) {
      if (!supabaseProfileRef.current?.id) {
        pendingActionRef.current = null;
      }
      return;
    }
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    action();
  }, [supabaseProfile?.id]);

  const requestAddComment = useCallback(
    (text: string, replyToId?: string | null) => {
      if (supabaseProfileRef.current?.id) {
        return addCommentRef.current(text, replyToId);
      }
      ensureAuthenticated('comment', () => {
        void addCommentRef.current(text, replyToId).catch((error) => {
          console.error('[HomeFeed] addComment after auth error', error);
        });
      });

      return Promise.resolve();
    },
    [addComment, ensureAuthenticated],
  );

  const requestToggleCommentLike = useCallback(
    (commentId: string) => {
      if (supabaseProfileRef.current?.id) {
        toggleCommentLikeRef.current(commentId);
        return;
      }
      ensureAuthenticated('comment_like', () => {
        toggleCommentLikeRef.current(commentId);
      });
    },
    [ensureAuthenticated],
  );

  return (
    <View style={styles.screen}>
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        orientation="vertical"
        onPageSelected={handlePageSelected}
        onPageScrollStateChanged={handlePageScrollStateChanged}
      >
        {propertyListings.map((item, index) => (
          <View key={item.id} style={styles.pagerPage}>
            {renderListingCard({ item, index })}
          </View>
        ))}
      </PagerView>

      <AuthModal
        visible={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLogin={() => {
          setShowAuthModal(false);
          setShowLoginScreen(true);
        }}
        onSignUp={() => {
          setShowAuthModal(false);
          setShowSignUpScreen(true);
        }}
        message={authRequirementMessage}
      />

      <LoginWithOTPScreen
        visible={showLoginScreen}
        onClose={() => {
          setShowLoginScreen(false);
          setShowAuthModal(true);
        }}
        onAuthenticated={() => {
          setShowLoginScreen(false);
          setShowAuthModal(false);
        }}
        onRequestSignUp={() => {
          setShowLoginScreen(false);
          setShowSignUpScreen(true);
        }}
      />

      <SignUpScreen
        visible={showSignUpScreen}
        onClose={() => {
          setShowSignUpScreen(false);
          setShowAuthModal(true);
        }}
        onSuccess={() => {
          setShowSignUpScreen(false);
          setShowAuthModal(false);
        }}
      />

      <CommentBottomSheet
        visible={isCommentsVisible}
        onClose={handleCloseComments}
        comments={comments}
        replies={replies}
        onAddComment={(text, replyToId) => requestAddComment(text, replyToId)}
        onDeleteComment={(commentId) => deleteComment(commentId)}
        onLoadReplies={loadReplies}
        getRepliesForComment={getRepliesForComment}
        hasReplies={hasReplies}
        isLoading={areCommentsLoading}
        isSubmitting={isSubmittingComment}
        currentUserId={supabaseProfile?.id ?? undefined}
        currentUserAvatar={supabaseProfile?.avatar_url ?? undefined}
        propertyTitle={activeListing?.title}
        getReplyCount={getReplyCount}
        totalCommentsCount={totalCommentsCount}
        getFirstReply={getFirstReply}
        onToggleCommentLike={requestToggleCommentLike}
        isCommentLiked={isCommentLiked}
        getCommentLikeCount={getCommentLikeCount}
        listingHostId={activeListingHostId}
      />

      <SearchModal visible={isSearchVisible} onClose={handleCloseSearch} onSearch={handleSearchSubmit} />

      {(() => {
        const currentListing = propertyListings[activeListingIdx] ?? propertyListings[0];
        const currentMediaItems = currentListing ? getMediaItems(currentListing) : [];
        const currentMediaIndex = mediaIndexById[currentListing?.id ?? ''] ?? 0;
        const headerWrapperStyle = [
          styles.fixedHeaderWrapper,
          { top: headerTopOffset },
        ];

        const stripCount = Math.max(currentMediaItems.length, 1);
        const currentMediaCount = Math.max(1, currentMediaItems.length);
        const totalScrollableWidth = Math.max(1, currentMediaCount - 1) * SCREEN_WIDTH;
        const progressRatio = Animated.divide(mediaScrollX, totalScrollableWidth);
        const clampedProgressRatio = progressRatio.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        });
        const totalSegmentMargin = stripCount * PROGRESS_SEGMENT_MARGIN * 2;
        const availableWidth = Math.max(PROGRESS_STRIP_WIDTH - totalSegmentMargin, PROGRESS_STRIP_WIDTH * 0.25);
        const segmentWidth = availableWidth / stripCount;
        const segmentStep = segmentWidth + PROGRESS_SEGMENT_MARGIN * 2;
        const maxHighlightTranslate = segmentStep * (stripCount - 1);
        const highlightTranslateX = Animated.add(
          PROGRESS_SEGMENT_MARGIN,
          Animated.multiply(clampedProgressRatio, maxHighlightTranslate),
        );
        const currentMediaTag = currentMediaItems[currentMediaIndex]?.tag?.trim();

        return (
          <View pointerEvents="box-none" style={headerWrapperStyle}>
            <View style={styles.headerProgressStripContainer}>
              <View style={styles.headerProgressStrip}>
                <Animated.View
                  style={[
                    styles.headerProgressFill,
                    {
                      width: segmentWidth,
                      transform: [{ translateX: highlightTranslateX }],
                    },
                  ]}
                />
                {Array.from({ length: stripCount }).map((_, index) => (
                  <View
                    key={`strip-${currentListing?.id ?? 'progress'}-${index}`}
                    style={[
                      styles.headerProgressSegment,
                      { width: segmentWidth },
                      index <= currentMediaIndex && styles.headerProgressSegmentActive,
                    ]}
                  />
                ))}
              </View>
              {!!currentMediaTag && (
                <View style={styles.mediaTagBadge}>
                  <Text style={styles.mediaTagBadgeText}>{currentMediaTag}</Text>
                </View>
              )}
            </View>
            <View pointerEvents="box-none" style={styles.headerTabsWrapper}>
              <TopFeedTabs
                activeTab={activeTopTab}
                onTabChange={handleTopTabChange}
                underlineTranslateX={underlineTranslateX}
                underlineColor={underlineColor}
                explorerStyle={{ opacity: explorerOpacity, transform: [{ scale: explorerScale }] }}
                pourToiStyle={{ opacity: pourToiOpacity, transform: [{ scale: pourToiScale }] }}
                inactiveTextStyle={styles.headerTabTextInactive}
                activeTextStyles={{ explorer: styles.headerTabTextActiveNeutral, pourToi: styles.headerTabTextActiveGreen }}
                underlineStyle={styles.headerTabUnderline}
                containerStyle={styles.headerTabsCenter}
                panHandlers={tabSwipeResponder.panHandlers}
              />
              <TouchableOpacity style={styles.searchButton} onPress={handleOpenSearch} activeOpacity={0.8}>
                <View style={styles.searchCircle}>
                  <Image
                    source={require('../assets/icons/feed-icon-search.png')}
                    style={styles.searchIconImage}
                    resizeMode="contain"
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
        );
      })()}

      {renderSearchOverlay()}

      {!isResultsOverlayMounted && (
        <View style={styles.bottomNavContainer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  pager: {
    flex: 1,
  },
  pagerPage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  storiesContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBackground: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    borderRadius: 0,
    overflow: 'hidden',
    backgroundColor: '#000000',
    paddingBottom: 120,
  },
  cardImage: {
    borderRadius: 0,
  },
  videoWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoControlIcon: {
    fontSize: 110,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
  videoControlOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoControlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  playIcon: {
    color: '#FFFFFF',
    fontSize: 124,
    fontWeight: '700',
    opacity: 0.5,
  },

  mediaSentinel: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaSentinelContent: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(15,23,42,0.5)',
  },
  mediaSentinelLabel: {
    color: '#F3F4F6',
    fontSize: 12,
    letterSpacing: 2,
    marginBottom: 12,
  },
  mediaSentinelTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  mediaSentinelSubtitle: {
    color: '#D1D5DB',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  bigHeartOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bigHeartIconImage: {
    width: 140,
    height: 140,
    tintColor: PUOL_GREEN,
  },
  fixedHeaderWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  hiddenHeader: {
    opacity: 0,
  },
  headerTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTabsWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTabsCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTabs: {
    flexDirection: 'row',
    width: TOP_TAB_TOTAL_WIDTH,
    justifyContent: 'space-between',
    alignSelf: 'center',
    position: 'relative',
  },
  headerTabButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTabText: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerTabTextInactive: {
    color: 'rgba(255,255,255,0.7)',
  },
  headerTabTextActiveNeutral: {
    color: '#FFFFFF',
  },
  headerTabTextActiveGreen: {
    color: PUOL_GREEN,
  },
  headerUnderlineSlider: {
    position: 'absolute',
    bottom: -4,
    height: 3,
    width: 52,
    borderRadius: 999,
  },
  headerTabUnderline: {
    position: 'absolute',
    bottom: -4,
    left: 0,
    width: TOP_TAB_UNDERLINE_WIDTH,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  headerProgressStripContainer: {
    position: 'absolute',
    top: -8,
    left: 20,
    right: 20,
  },
  headerProgressStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    padding: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
    height: 4,
    overflow: 'hidden',
  },
  headerProgressFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  headerProgressSegment: {
    flex: 1,
    height: 4,
    marginHorizontal: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  headerProgressSegmentActive: {
    backgroundColor: '#FFFFFF',
  },
  mediaTagBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  mediaTagBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  searchButton: {
    position: 'absolute',
    right: 0,
    paddingLeft: 16,
  },
  searchCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  searchIconImage: {
    width: 20,
    height: 20,
  },
  rightColumn: {
    position: 'absolute',
    right: 18,
    top: SCREEN_HEIGHT * 0.4,
    alignItems: 'center',
  },
  avatarWrapper: {
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarVerifiedBadgeIcon: {
    width: 19,
    height: 19,
  },
  rightStatBlock: {
    alignItems: 'center',
    marginBottom: 18,
  },
  rightIconImage: {
    width: 30,
    height: 30,
    marginBottom: 4,
    tintColor: '#FFFFFF',
  },
  rightIconImageLiked: {
    tintColor: PUOL_GREEN,
  },
  iconShadowContainer: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  rightStatText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  shareWrapper: {
    marginTop: 8,
    alignItems: 'center',
  },
  textLightShadow: {
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  textSubtleShadow: {
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  textMediumShadow: {
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  textStrongShadow: {
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  bottomInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BOTTOM_NAV_HEIGHT - 6,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  tagChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    overflow: 'hidden',
    marginRight: 6,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 4,
  },
  tagInner: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderRadius: 999,
  },
  tagText: {
    fontSize: 12,
    color: '#F9FAFB',
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  textBlock: {
    marginBottom: 8,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationPinImage: {
    width: 14,
    height: 14,
    marginRight: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#FFFFFF',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  ctaButton: {
    marginTop: 10,
    backgroundColor: PUOL_GREEN,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginHorizontal: 0,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.4,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ctaArrow: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  bottomNavContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: BOTTOM_NAV_HEIGHT,
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingBottom: 15,
    paddingTop: 0,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -2 },
    shadowRadius: 6,
  },
  bottomItem: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 5,
  },
  bottomItemPlusWrapper: {
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  bottomIconWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  bottomIcon: {
    width: 22,
    height: 22,
    tintColor: '#9CA3AF',
  },
  bottomIconActive: {
    tintColor: PUOL_GREEN,
  },
  bottomPlusCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  bottomPlusIcon: {
    width: 72,
    height: 72,
  },
  bottomLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textShadowColor: 'rgba(0,0,0,0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  bottomLabelActive: {
    color: PUOL_GREEN,
    fontWeight: '600',
  },
  searchOverlayModalRoot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 40,
  },
  searchOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    zIndex: 40,
  },
  searchOverlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  searchOverlayPanel: {
    flex: 1,
    minHeight: SCREEN_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
  },
  searchOverlaySafeArea: {
    flex: 1,
    paddingBottom: 8,
  },
  searchOverlayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  overlayIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlayIconButtonText: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '600',
  },
  overlayHeaderCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  overlayTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
  },
  overlaySubtitle: {
    color: '#6B7280',
    fontSize: 13,
  },
  searchLoadingState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  searchLoadingText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
  },
  searchErrorBanner: {
    backgroundColor: '#B91C1C',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchErrorText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  searchResultsList: {
    paddingBottom: 40,
  },
  searchEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  searchEmptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  searchEmptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
  searchChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  searchChip: {
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  searchChipText: {
    color: '#1F2937',
    fontSize: 11,
  },
  searchResultCtaFull: {
    width: '100%',
    backgroundColor: PUOL_GREEN,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchResultCtaFullText: {
    color: '#041005',
    fontSize: 15,
    fontWeight: '700',
  },
  searchResultCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  searchResultImage: {
    width: '100%',
    height: 220,
  },
  searchResultImageRadius: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  searchResultImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: 12,
    justifyContent: 'flex-start',
  },
  matchBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  matchBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  searchResultBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 14,
  },
  searchResultTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  searchResultTitleWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  searchResultTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  searchResultLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  searchResultLocationIcon: {
    marginTop: 1,
  },
  searchResultLocation: {
    marginTop: 2,
    color: '#6B7280',
    fontSize: 12,
  },
  searchResultPriceBlock: {
    alignItems: 'flex-end',
  },
  searchResultPrice: {
    color: PUOL_GREEN,
    fontSize: 15,
    fontWeight: '700',
  },
  searchResultPricePeriod: {
    color: '#6B7280',
    fontSize: 12,
    marginTop: 2,
  },
  searchResultMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  searchResultMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  searchResultMetricText: {
    color: '#6B7280',
    fontSize: 12,
    marginRight: 12,
    marginBottom: 4,
  },
  searchResultChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  metricIconText: {
    fontSize: 16,
    marginRight: 6,
    color: PUOL_GREEN,
  },
  metricIcon: {
    marginRight: 6,
  },
  metricText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  searchResultTagsRowInline: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 6,
    flexShrink: 1,
  },
  searchResultTagsRowInlineFullWidth: {
    flexBasis: '100%',
    justifyContent: 'flex-start',
  },
  searchResultTagInline: {
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  searchResultTagInlineText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '600',
  },
  searchResultTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  searchResultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 999,
  },
  searchResultTagText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '600',
  },
  searchResultFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  searchResultCta: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  searchResultCtaText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '700',
  },
  searchFallbackNotice: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginTop: -10,
    marginBottom: 8,
  },
  searchFallbackTitle: {
    color: PUOL_GREEN,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  searchFallbackSubtitle: {
    color: '#4B5563',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
});