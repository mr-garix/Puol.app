import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  Image,
  InteractionManager,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '@/src/contexts/AuthContext';
import { useFollowState, useFollowStats } from '@/src/features/follows/hooks/useFollowState';
import { FollowListModal } from '@/src/features/follows/components/FollowListModal';
import {
  getFollowersList,
  getFollowingList,
  followProfile,
  unfollowProfile,
  type ProfileFollowListItem,
} from '@/src/features/follows/services';
import { recordProfileShare, resolveProfileShareChannel } from '@/src/features/profiles/services/shareService';
import { buildProfileShareUrl } from '@/src/utils/helpers';
import { supabase } from '@/src/supabaseClient';
import { fetchListingCountMap } from '@/src/features/listings/services/engagementCounts';
import { AuthModal } from '@/src/features/auth/components/AuthModal';
import { LoginWithOTPScreen } from '@/src/features/auth/components/LoginWithOTPScreen';
import { SignUpScreen } from '@/src/features/auth/components/SignUpScreen';

import { useHostViewStats } from '@/src/features/host/hooks/useHostViewStats';
import { useHostLikeActivities } from '@/src/features/likes/hooks/useHostLikeActivities';
import { useHostReviews } from '@/src/features/reviews/hooks/useHostReviews';
import { useUserReviews } from '@/src/features/reviews/hooks/useUserReviews';
import type { UserReview } from '@/src/features/reviews/hooks/useUserReviews';
import { useLandlordCommentThreads } from '@/src/features/comments/hooks';
import { getUserCommentConversations } from '@/src/features/comments/services';
import type { CommentConversation } from '@/src/features/comments/services';

type PublicProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string | null;
  avatarUrl: string | null;
  role: 'host' | 'landlord' | 'user';
  hostStatus: string | null;
  landlordStatus?: string | null;
  enterpriseName?: string | null;
  enterpriseLogoUrl?: string | null;
};

type ListingCard = {
  id: string;
  title: string;
  coverUrl: string | null;
  city: string | null;
  district: string | null;
  views: number;
  likes: number;
  comments: number;
  priceLabel: string | null;
};

type ReviewListItem = {
  id: string;
  listingId?: string | null;
  listingTitle: string | null;
  listingCity?: string | null;
  listingDistrict?: string | null;
  listingLocation?: string | null;
  comment: string | null;
  rating: number;
  createdAt: string | null;
  authorName?: string | null;
};

type UserLikedListing = {
  id: string;
  listingId: string;
  title: string | null;
  city: string | null;
  district: string | null;
  coverPhotoUrl: string | null;
  likedAt: string | null;
};

type UserCommentEntry = {
  id: string;
  listingId: string;
  title: string | null;
  city: string | null;
  district: string | null;
  listingLocation?: string | null;
  coverPhotoUrl: string | null;
  content: string;
  createdAt: string | null;
};

type PendingFollowAction = {
  action: 'follow' | 'unfollow';
  targetProfileId: string;
  modalType: 'followers' | 'following' | null;
};

const { width } = Dimensions.get('window');
const HORIZONTAL_PADDING = 20;
const CARD_GAP = 10;
const GRID_ROW_GAP = 20;
const GRID_AVAILABLE_WIDTH = width - HORIZONTAL_PADDING * 2;
const CARD_SIZE = (GRID_AVAILABLE_WIDTH - CARD_GAP * 2) / 3;
const FALLBACK_LISTING_IMAGE = 'https://images.unsplash.com/photo-1505691723495-2320b0b7b2c9?w=600&auto=format&fit=crop';

const formatDateLabel = (iso?: string | null) => {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatLocationLabel = (city?: string | null, district?: string | null) => {
  if (city && district) {
    return `${district}, ${city}`;
  }
  return city ?? district ?? null;
};

const defaultStats = {
  listings: 0,
  followers: 0,
  following: 0,
  views: 0,
  likes: 0,
  comments: 0,
};

const HostStatHighlightModal = ({
  visible,
  onClose,
  icon,
  title,
  value,
  subtitle,
}: {
  visible: boolean;
  onClose: () => void;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  value: string;
  subtitle: string;
}) => (
  <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.highlightModalContainer}>
        <TouchableOpacity style={[styles.modalCloseButton, styles.highlightCloseButton]} onPress={onClose}>
          <Feather name="x" size={18} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.highlightContent}>
          <View style={styles.highlightIconCircle}>
            <Feather name={icon} size={28} color="#2ECC71" />
          </View>
          <Text style={styles.highlightTitle}>{title}</Text>
          <Text style={styles.highlightValue}>{value}</Text>
          <Text style={styles.highlightSubtitle}>{subtitle}</Text>
        </View>
      </View>
    </View>
  </Modal>
);

type ReviewsModalProps = {
  visible: boolean;
  onClose: () => void;
  reviews: ReviewListItem[];
  isLoading: boolean;
  averageRating: number;
  totalCount: number;
  onRefresh: () => Promise<void>;
  title?: string;
  emptyTitle?: string;
  emptySubtitle?: string;
  onListingPress?: (listingId: string) => void;
};

const ReviewsModal = ({
  visible,
  onClose,
  reviews,
  isLoading,
  averageRating,
  totalCount,
  onRefresh,
  title = 'Avis',
  emptyTitle = 'Aucun avis pour le moment',
  emptySubtitle = 'Les retours clients apparaîtront ici.',
  onListingPress,
}: ReviewsModalProps) => {
  const renderStars = (rating: number) => (
    <View style={styles.reviewStarsRow}>
      {[1, 2, 3, 4, 5].map((value) => {
        const delta = rating - value + 1;
        let icon: 'star' | 'star-half-full' | 'star-outline' = 'star-outline';
        if (delta >= 1) {
          icon = 'star';
        } else if (delta >= 0.5) {
          icon = 'star-half-full';
        }
        return (
          <MaterialCommunityIcons
            key={value}
            name={icon}
            size={18}
            color={icon === 'star-outline' ? '#E5E7EB' : '#F59E0B'}
          />
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {title} ({totalCount})
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Feather name="x" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalStatsRow}>
            <Text style={styles.modalRatingValue}>{averageRating.toFixed(1)}</Text>
            <View style={{ alignItems: 'flex-start' }}>
              {renderStars(Math.round(averageRating))}
              <Text style={styles.modalRatingLabel}>Note moyenne</Text>
            </View>
            <TouchableOpacity onPress={onRefresh} style={styles.modalRefreshButton}>
              <Feather name="refresh-ccw" size={16} color="#0F172A" />
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.modalLoader}>
              <ActivityIndicator size="small" color="#2ECC71" />
              <Text style={styles.modalLoaderText}>Chargement des avis…</Text>
            </View>
          ) : reviews.length === 0 ? (
            <View style={styles.modalEmptyState}>
              <Feather name="message-circle" size={28} color="#9CA3AF" />
              <Text style={styles.modalEmptyTitle}>{emptyTitle}</Text>
              <Text style={styles.modalEmptySubtitle}>{emptySubtitle}</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.modalReviewsList} showsVerticalScrollIndicator={false}>
              {reviews.map((review) => {
                const isClickable = Boolean(onListingPress && review.listingId);
                const handlePress = () => {
                  if (!isClickable || !review.listingId) {
                    return;
                  }
                  const targetId = String(review.listingId);
                  onClose();
                  InteractionManager.runAfterInteractions(() => {
                    onListingPress?.(targetId);
                  });
                };
                return (
                  <TouchableOpacity
                    key={review.id}
                    style={styles.reviewCard}
                    activeOpacity={0.85}
                    disabled={!isClickable}
                    onPress={handlePress}
                  >
                    <View style={styles.reviewHeader}>
                      <Text style={styles.reviewAuthor}>{review.authorName ?? 'Client PUOL'}</Text>
                      <Text style={styles.reviewDate}>
                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString('fr-FR') : ''}
                      </Text>
                    </View>
                    {renderStars(review.rating)}
                    <Text style={styles.reviewListing}>{review.listingTitle ?? 'Annonce PUOL'}</Text>
                    {!!review.comment && <Text style={styles.reviewComment}>{review.comment}</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const HostReviewsModal = (props: ReviewsModalProps) => <ReviewsModal {...props} />;

type UserLikesModalProps = {
  visible: boolean;
  onClose: () => void;
  items: UserLikedListing[];
  isLoading: boolean;
  onRefresh?: () => Promise<void> | void;
  onListingPress?: (listingId: string) => void;
};

const UserLikesModal = ({ visible, onClose, items, isLoading, onRefresh, onListingPress }: UserLikesModalProps) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Favoris ({items.length})</Text>
          <View style={styles.modalHeaderActions}>
            {onRefresh ? (
              <TouchableOpacity style={styles.modalHeaderIconButton} onPress={onRefresh}>
                <Feather name="refresh-ccw" size={18} color="#0F172A" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Feather name="x" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.modalLoader}>
            <ActivityIndicator size="small" color="#2ECC71" />
            <Text style={styles.modalLoaderText}>Chargement des favoris…</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.modalEmptyState}>
            <Feather name="heart" size={28} color="#9CA3AF" />
            <Text style={styles.modalEmptyTitle}>Aucun favori enregistré</Text>
            <Text style={styles.modalEmptySubtitle}>Likez des annonces pour les retrouver ici.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
            {items.map((item) => {
              const location = formatLocationLabel(item.city, item.district);
              const canNavigate = Boolean(onListingPress && item.listingId);
              const handlePress = () => {
                if (!canNavigate || !item.listingId) {
                  return;
                }
                const targetId = String(item.listingId);
                onClose();
                InteractionManager.runAfterInteractions(() => {
                  onListingPress?.(targetId);
                });
              };
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.listCard}
                  onPress={handlePress}
                  activeOpacity={0.85}
                  disabled={!canNavigate}
                >
                  {item.coverPhotoUrl ? (
                    <Image source={{ uri: item.coverPhotoUrl }} style={styles.listCardImage} />
                  ) : (
                    <View style={styles.listCardImagePlaceholder}>
                      <Feather name="image" size={18} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.listCardBody}>
                    <Text style={styles.listCardTitle} numberOfLines={2}>
                      {item.title ?? 'Annonce PUOL'}
                    </Text>
                    {location ? (
                      <Text style={styles.listCardSubtitle} numberOfLines={1}>
                        {location}
                      </Text>
                    ) : null}
                    <Text style={styles.listCardMeta}>
                      Ajouté le {formatDateLabel(item.likedAt) || '—'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  </Modal>
);

type UserCommentsModalProps = {
  visible: boolean;
  onClose: () => void;
  items: UserCommentEntry[];
  isLoading: boolean;
  onRefresh?: () => Promise<void> | void;
  onListingPress?: (listingId: string) => void;
};

const UserCommentsModal = ({ visible, onClose, items, isLoading, onRefresh, onListingPress }: UserCommentsModalProps) => (
  <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Commentaires ({items.length})</Text>
          <View style={styles.modalHeaderActions}>
            {onRefresh ? (
              <TouchableOpacity style={styles.modalHeaderIconButton} onPress={onRefresh}>
                <Feather name="refresh-ccw" size={18} color="#0F172A" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
              <Feather name="x" size={20} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.modalLoader}>
            <ActivityIndicator size="small" color="#2ECC71" />
            <Text style={styles.modalLoaderText}>Chargement des commentaires…</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.modalEmptyState}>
            <Feather name="message-circle" size={28} color="#9CA3AF" />
            <Text style={styles.modalEmptyTitle}>Aucun commentaire</Text>
            <Text style={styles.modalEmptySubtitle}>Vos interactions apparaîtront ici.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.modalList} showsVerticalScrollIndicator={false}>
            {items.map((item) => {
              const location = formatLocationLabel(item.city, item.district);
              const isClickable = Boolean(onListingPress && item.listingId);
              const handlePress = () => {
                if (!isClickable || !item.listingId) {
                  return;
                }
                const targetId = String(item.listingId);
                onClose();
                InteractionManager.runAfterInteractions(() => {
                  onListingPress?.(targetId);
                });
              };
              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.listCard}
                  onPress={handlePress}
                  activeOpacity={0.85}
                  disabled={!isClickable}
                >
                  {item.coverPhotoUrl ? (
                    <Image source={{ uri: item.coverPhotoUrl }} style={styles.listCardImage} />
                  ) : (
                    <View style={styles.listCardImagePlaceholder}>
                      <Feather name="align-left" size={18} color="#9CA3AF" />
                    </View>
                  )}
                  <View style={styles.listCardBody}>
                    <Text style={styles.listCardTitle} numberOfLines={2}>
                      {item.title ?? 'Annonce PUOL'}
                    </Text>
                    {location ? (
                      <Text style={styles.listCardSubtitle} numberOfLines={1}>
                        {location}
                      </Text>
                    ) : null}
                    <Text style={styles.listCardMeta}>{formatDateLabel(item.createdAt) || '—'}</Text>
                    <Text style={styles.listCardContent} numberOfLines={3}>
                      {item.content || 'Sans contenu'}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  </Modal>
);

const formatPriceLabel = (price?: number | null) => {
  if (!price || Number.isNaN(price)) {
    return null;
  }
  return `${price.toLocaleString('fr-FR')} FCFA`;
};

export default function PublicProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profileId: profileIdParam } = useLocalSearchParams<{ profileId?: string | string[] }>();
  const profileId = useMemo(() => {
    if (Array.isArray(profileIdParam)) {
      return profileIdParam[0] ?? null;
    }
    return profileIdParam ?? null;
  }, [profileIdParam]);

  const { supabaseProfile, isLoggedIn } = useAuth();
  const currentUserId = supabaseProfile?.id ?? null;
  const isOwnProfile = Boolean(currentUserId && profileId && currentUserId === profileId);

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [listings, setListings] = useState<ListingCard[]>([]);
  const [isListingsLoading, setIsListingsLoading] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'listings' | 'publications'>('listings');

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [showSignUpScreen, setShowSignUpScreen] = useState(false);
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [showViewsModal, setShowViewsModal] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [showUserReviewsModal, setShowUserReviewsModal] = useState(false);
  const [showUserLikesModal, setShowUserLikesModal] = useState(false);
  const [showUserCommentsModal, setShowUserCommentsModal] = useState(false);
  const [showLandlordViewsModal, setShowLandlordViewsModal] = useState(false);
  const [showLandlordLikesModal, setShowLandlordLikesModal] = useState(false);
  const [showLandlordCommentsModal, setShowLandlordCommentsModal] = useState(false);

  const pendingFollowActionRef = useRef<PendingFollowAction | null>(null);

  const isHostProfile = profile?.role === 'host';
  const isLandlordProfile = profile?.role === 'landlord';
  const isRegularUserProfile = !isHostProfile && !isLandlordProfile;
  const hasEnterpriseBranding = Boolean(
    isHostProfile && profile?.enterpriseName?.trim() && profile?.enterpriseLogoUrl?.trim(),
  );
  const rotationAnimRef = useRef(new Animated.Value(0));
  const flipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showEnterpriseAvatar, setShowEnterpriseAvatar] = useState(false);
  const [isAvatarPreviewVisible, setIsAvatarPreviewVisible] = useState(false);
  const [avatarPreviewUri, setAvatarPreviewUri] = useState<string | null>(null);

  const animatedRotationY = rotationAnimRef.current.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const animatedOpacity = rotationAnimRef.current.interpolate({
    inputRange: [0, 0.25, 0.5, 0.75, 1],
    outputRange: [1, 0.4, 0.05, 0.4, 1],
  });

  useEffect(() => {
    const clearTimers = () => {
      if (flipTimeoutRef.current) {
        clearTimeout(flipTimeoutRef.current);
        flipTimeoutRef.current = null;
      }
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
        spinIntervalRef.current = null;
      }
      rotationAnimRef.current.stopAnimation();
    };

    if (!hasEnterpriseBranding || isAvatarPreviewVisible) {
      setShowEnterpriseAvatar(false);
      clearTimers();
      rotationAnimRef.current.setValue(0);
      return;
    }

    const runSpin = () => {
      rotationAnimRef.current.stopAnimation();
      rotationAnimRef.current.setValue(0);
      if (flipTimeoutRef.current) {
        clearTimeout(flipTimeoutRef.current);
        flipTimeoutRef.current = null;
      }

      Animated.timing(rotationAnimRef.current, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          rotationAnimRef.current.setValue(0);
        }
      });

      flipTimeoutRef.current = setTimeout(() => {
        setShowEnterpriseAvatar((prev) => !prev);
        flipTimeoutRef.current = null;
      }, 350);
    };

    runSpin();
    spinIntervalRef.current = setInterval(runSpin, 5000);

    return () => {
      clearTimers();
      rotationAnimRef.current.setValue(0);
    };
  }, [hasEnterpriseBranding, isAvatarPreviewVisible]);

  const handleAvatarPress = useCallback(() => {
    const currentUri =
      showEnterpriseAvatar && profile?.enterpriseLogoUrl
        ? profile.enterpriseLogoUrl
        : profile?.avatarUrl ?? buildFallbackAvatar(profile ?? { firstName: '', lastName: '' });

    if (spinIntervalRef.current) {
      clearInterval(spinIntervalRef.current);
      spinIntervalRef.current = null;
    }

    setAvatarPreviewUri(currentUri);
    setIsAvatarPreviewVisible(true);
  }, [profile, showEnterpriseAvatar]);

  const handleCloseAvatarPreview = useCallback(() => {
    setIsAvatarPreviewVisible(false);
  }, []);

  const openAuthPrompt = useCallback(() => {
    setShowAuthModal(true);
    setShowLoginScreen(false);
    setShowSignUpScreen(false);
  }, []);

  const followStats = useFollowStats(profileId, { enabled: Boolean(profileId) });
  const followState = useFollowState({
    followerId: currentUserId ?? null,
    followedId: profileId,
    enabled: Boolean(profileId && currentUserId && !isOwnProfile),
  });
  const hostStatsProfileId = isHostProfile ? profileId : null;
  const shouldLoadRegularStats = Boolean(profileId && isRegularUserProfile);
  const { total: hostViewsTotal } = useHostViewStats(hostStatsProfileId);
  const { summary: hostLikeSummary } = useHostLikeActivities(hostStatsProfileId);
  const {
    reviews: hostReviews,
    averageRating: hostAverageRating,
    totalCount: hostReviewsCount,
    isLoading: hostReviewsLoading,
    refresh: refreshHostReviews,
  } = useHostReviews(hostStatsProfileId);
  const hostReviewItems = useMemo<ReviewListItem[]>(
    () =>
      hostReviews.map((review) => ({
        id: review.id,
        listingId: review.listingId,
        listingTitle: review.listingTitle ?? 'Annonce PUOL',
        comment: review.comment ?? null,
        rating: review.rating,
        createdAt: review.createdAt,
        authorName: review.authorName ?? 'Client PUOL',
      })),
    [hostReviews],
  );
  const {
    reviews: userReviewsData,
    averageRating: userAverageRating,
    totalCount: userReviewsCount,
    isLoading: userReviewsLoading,
    refresh: refreshUserReviews,
  } = useUserReviews(shouldLoadRegularStats ? profileId : null);
  const userReviewItems = useMemo<ReviewListItem[]>(() => {
    const authorLabel =
      [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() || profile?.username || 'Vous';
    return userReviewsData.map((review) => ({
      id: review.id,
      listingId: review.listingId,
      listingTitle: review.listingTitle ?? 'Annonce PUOL',
      listingLocation: review.listingLocation ?? null,
      comment: review.comment ?? null,
      rating: review.rating,
      createdAt: review.createdAt,
      authorName: authorLabel,
    }));
  }, [profile?.firstName, profile?.lastName, profile?.username, userReviewsData]);
  const [userLikedListings, setUserLikedListings] = useState<UserLikedListing[]>([]);
  const [isUserLikesLoading, setIsUserLikesLoading] = useState(false);
  const [userComments, setUserComments] = useState<UserCommentEntry[]>([]);
  const [isUserCommentsLoading, setIsUserCommentsLoading] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<ProfileFollowListItem[]>([]);
  const [isFollowListLoading, setIsFollowListLoading] = useState(false);
  const [followActionLoadingId, setFollowActionLoadingId] = useState<string | null>(null);
  const [unfollowActionLoadingId, setUnfollowActionLoadingId] = useState<string | null>(null);
  const [viewerFollowingIds, setViewerFollowingIds] = useState<Set<string>>(new Set());
  const [viewerFollowerIds, setViewerFollowerIds] = useState<Set<string>>(new Set());
  const [viewerMutualIds, setViewerMutualIds] = useState<Set<string>>(new Set());
  const viewerMode = useMemo(() => Boolean(currentUserId && profileId && currentUserId !== profileId), [currentUserId, profileId]);
  const {
    threads: landlordCommentThreads,
    isLoading: areLandlordCommentsLoading,
    refresh: refreshLandlordComments,
    totalCount: landlordCommentsTotal,
  } = useLandlordCommentThreads(isLandlordProfile ? profileId : null);
  const fetchUserLikes = useCallback(async () => {
    if (!shouldLoadRegularStats || !profileId) {
      setUserLikedListings([]);
      return;
    }

    setIsUserLikesLoading(true);
    try {
      const { data, error } = await supabase
        .from('listing_likes')
        .select(
          `
            id,
            listing_id,
            created_at,
            listing:listings!inner(
              id,
              title,
              city,
              district,
              cover_photo_url
            )
          `,
        )
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const mapped = (data ?? []).map((row: any) => {
        const listingRecord = Array.isArray(row.listing) ? row.listing[0] : row.listing;
        const listingId = listingRecord?.id ?? row.listing_id ?? '';
        return {
          id: row.id?.toString() ?? `${listingId}-${row.created_at}`,
          listingId: listingId?.toString?.() ?? `${listingId}`,
          title: listingRecord?.title ?? 'Annonce PUOL',
          city: listingRecord?.city ?? null,
          district: listingRecord?.district ?? null,
          coverPhotoUrl: listingRecord?.cover_photo_url ?? null,
          likedAt: row.created_at ?? null,
        };
      });

      setUserLikedListings(mapped);
    } catch (error) {
      console.error('[PublicProfile] fetch user likes error', error);
      setUserLikedListings([]);
    } finally {
      setIsUserLikesLoading(false);
    }
  }, [profileId, shouldLoadRegularStats]);

  const fetchUserComments = useCallback(async () => {
    if (!shouldLoadRegularStats || !profileId) {
      setUserComments([]);
      return;
    }

    setIsUserCommentsLoading(true);
    try {
      const conversations = await getUserCommentConversations(profileId);
      const mapped = (conversations ?? []).map<UserCommentEntry>((conversation: CommentConversation) => ({
        id: conversation.id,
        listingId: conversation.listingId ?? '',
        title: conversation.listingTitle ?? 'Annonce PUOL',
        city: conversation.listingCity ?? null,
        district: conversation.listingDistrict ?? null,
        listingLocation: formatLocationLabel(conversation.listingCity ?? null, conversation.listingDistrict ?? null),
        coverPhotoUrl: conversation.listingCoverPhotoUrl ?? null,
        content: conversation.content,
        createdAt: conversation.createdAt,
      }));
      setUserComments(mapped);
    } catch (error) {
      console.error('[PublicProfile] fetch user comments error', error);
      setUserComments([]);
    } finally {
      setIsUserCommentsLoading(false);
    }
  }, [profileId, shouldLoadRegularStats]);

  useEffect(() => {
    if (!shouldLoadRegularStats) {
      setUserLikedListings([]);
      setUserComments([]);
      return;
    }
    void fetchUserLikes();
    void fetchUserComments();
  }, [fetchUserComments, fetchUserLikes, shouldLoadRegularStats]);

  const userReviewsTotal = userReviewsCount;
  const userLikesTotal = userLikedListings.length;
  const userCommentsTotal = userComments.length;

  const landlordViewsTotal = useMemo(() => {
    if (!isLandlordProfile) {
      return 0;
    }
    return listings.reduce((acc, listing) => acc + (listing.views ?? 0), 0);
  }, [isLandlordProfile, listings]);

  const landlordLikesTotal = useMemo(() => {
    if (!isLandlordProfile) {
      return 0;
    }
    return listings.reduce((acc, listing) => acc + (listing.likes ?? 0), 0);
  }, [isLandlordProfile, listings]);

  const landlordCommentEntries = useMemo<UserCommentEntry[]>(() => {
    if (!isLandlordProfile) {
      return [];
    }

    const entries = landlordCommentThreads.flatMap((thread) => {
      const listingLocation = formatLocationLabel(thread.listingCity ?? null, thread.listingDistrict ?? null);
      const mapComment = (comment: typeof thread.rootComment) => ({
        id: comment.id,
        listingId: thread.listingId,
        title: thread.listingTitle ?? 'Annonce PUOL',
        city: thread.listingCity ?? null,
        district: thread.listingDistrict ?? null,
        listingLocation,
        coverPhotoUrl: thread.listingCoverPhotoUrl ?? null,
        content: comment.content ?? '',
        createdAt: comment.createdAt ?? null,
      });

      const rootEntry = mapComment(thread.rootComment);
      const replyEntries = thread.replies
        .filter((reply) => reply.author.id !== profileId)
        .map((reply) => mapComment(reply));

      return [rootEntry, ...replyEntries];
    });

    return entries.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }, [isLandlordProfile, landlordCommentThreads, profileId]);

  const displayStats = useMemo(() => {
    const base = {
      ...defaultStats,
      listings: listings.length,
      followers: followStats.followersCount ?? 0,
      following: followStats.followingCount ?? 0,
    };

    if (isHostProfile) {
      return {
        ...base,
        views: hostViewsTotal ?? base.views,
        likes: hostLikeSummary.total ?? base.likes,
        comments: hostReviewsCount ?? base.comments,
      };
    }

    if (isLandlordProfile) {
      return {
        ...base,
        views: landlordViewsTotal,
        likes: landlordLikesTotal,
        comments: landlordCommentsTotal,
      };
    }

    return {
      ...base,
      likes: userLikesTotal,
      comments: userCommentsTotal,
    };
  }, [
    followStats.followersCount,
    followStats.followingCount,
    hostLikeSummary.total,
    hostReviewsCount,
    hostViewsTotal,
    isHostProfile,
    isLandlordProfile,
    landlordCommentsTotal,
    landlordLikesTotal,
    landlordViewsTotal,
    listings.length,
    userCommentsTotal,
    userLikesTotal,
  ]);

  const fetchProfile = useCallback(async () => {
    if (!profileId) {
      setProfileError('Profil introuvable.');
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);
    setProfileError(null);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          id,
          first_name,
          last_name,
          username,
          avatar_url,
          role,
          host_status,
          landlord_status,
          enterprise_name,
          enterprise_logo_url
        `,
        )
        .eq('id', profileId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        setProfileError('Profil introuvable.');
        setProfile(null);
        return;
      }

      setProfile({
        id: data.id,
        firstName: data.first_name ?? '',
        lastName: data.last_name ?? '',
        username: data.username ?? null,
        avatarUrl: data.avatar_url ?? null,
        role: (data.role ?? 'user') as PublicProfile['role'],
        hostStatus: data.host_status ?? null,
        landlordStatus: data.landlord_status ?? null,
        enterpriseName: data.enterprise_name ?? null,
        enterpriseLogoUrl: data.enterprise_logo_url ?? null,
      });
    } catch (error) {
      console.error('[PublicProfile] fetch profile error', error);
      setProfileError("Impossible de charger ce profil.");
      setProfile(null);
    } finally {
      setIsProfileLoading(false);
    }
  }, [profileId]);

  const fetchListings = useCallback(async () => {
    if (!profileId) {
      setListings([]);
      setIsListingsLoading(false);
      return;
    }

    setIsListingsLoading(true);
    setListingsError(null);

    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id,title,cover_photo_url,city,district,price_per_night,status')
        .eq('host_id', profileId)
        .in('status', ['published', 'active'])
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      const rows = data ?? [];
      const listingIds = rows.map((listing) => listing.id).filter((id): id is string => Boolean(id));
      let viewCountByListing: Record<string, number> = {};
      let likeCountByListing: Record<string, number> = {};
      let commentCountByListing: Record<string, number> = {};

      if (listingIds.length > 0) {
        const [viewsData, likesData, commentsData] = await Promise.all([
          fetchListingCountMap('listing_views', listingIds),
          fetchListingCountMap('listing_likes', listingIds),
          fetchListingCountMap('listing_comments', listingIds),
        ]);
        viewCountByListing = viewsData;
        likeCountByListing = likesData;
        commentCountByListing = commentsData;
      }

      const mapped: ListingCard[] = rows.map((listing) => {
        const views = viewCountByListing[listing.id] ?? 0;
        const likes = likeCountByListing[listing.id] ?? 0;
        const comments = commentCountByListing[listing.id] ?? 0;
        return {
          id: listing.id,
          title: listing.title,
          coverUrl: listing.cover_photo_url ?? null,
          city: listing.city ?? null,
          district: listing.district ?? null,
          views,
          likes,
          comments,
          priceLabel: formatPriceLabel(listing.price_per_night),
        };
      });

      setListings(mapped);
    } catch (error) {
      console.error('[PublicProfile] fetch listings error', error);
      setListingsError("Impossible de charger les annonces.");
    } finally {
      setIsListingsLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      return;
    }
    void fetchProfile();
  }, [fetchProfile, profileId]);

  useEffect(() => {
    if (!profileId || activeTab !== 'listings') {
      return;
    }
    void fetchListings();
  }, [activeTab, fetchListings, profileId]);

  const loadFollowList = useCallback(
    async (type: 'followers' | 'following') => {
      if (!profileId) {
        setFollowList([]);
        return;
      }
      setIsFollowListLoading(true);
      try {
        const data = type === 'followers' ? await getFollowersList(profileId) : await getFollowingList(profileId);
        setFollowList(data);

        if (viewerMode && currentUserId) {
          const [viewerFollowing, viewerFollowers] = await Promise.all([
            getFollowingList(currentUserId),
            getFollowersList(currentUserId),
          ]);

          const followingSet = new Set(viewerFollowing.map((item) => item.id));
          const followerSet = new Set(viewerFollowers.map((item) => item.id));
          const mutualSet = new Set<string>();
          followingSet.forEach((id) => {
            if (followerSet.has(id)) {
              mutualSet.add(id);
            }
          });

          setViewerFollowingIds(followingSet);
          setViewerFollowerIds(followerSet);
          setViewerMutualIds(mutualSet);
        } else if (currentUserId && currentUserId === profileId) {
          const [ownerFollowing, ownerFollowers] = await Promise.all([
            type === 'following' ? Promise.resolve(data) : getFollowingList(profileId),
            type === 'followers' ? Promise.resolve(data) : getFollowersList(profileId),
          ]);

          const followingSet = new Set(ownerFollowing.map((item) => item.id));
          const followerSet = new Set(ownerFollowers.map((item) => item.id));
          const mutualSet = new Set<string>();
          followingSet.forEach((id) => {
            if (followerSet.has(id)) {
              mutualSet.add(id);
            }
          });

          setViewerFollowingIds(followingSet);
          setViewerFollowerIds(followerSet);
          setViewerMutualIds(mutualSet);
        } else if (currentUserId && currentUserId === profileId) {
          const [ownerFollowing, ownerFollowers] = await Promise.all([
            type === 'following' ? Promise.resolve(data) : getFollowingList(profileId),
            type === 'followers' ? Promise.resolve(data) : getFollowersList(profileId),
          ]);

          const followingSet = new Set(ownerFollowing.map((item) => item.id));
          const followerSet = new Set(ownerFollowers.map((item) => item.id));
          const mutualSet = new Set<string>();
          followingSet.forEach((id) => {
            if (followerSet.has(id)) {
              mutualSet.add(id);
            }
          });

          setViewerFollowingIds(followingSet);
          setViewerFollowerIds(followerSet);
          setViewerMutualIds(mutualSet);
        } else {
          setViewerFollowingIds(new Set());
          setViewerFollowerIds(new Set());
          setViewerMutualIds(new Set());
        }
      } catch (error) {
        console.error('[PublicProfile] load follow list error', error);
        setFollowList([]);
        setViewerFollowingIds(new Set());
        setViewerFollowerIds(new Set());
        setViewerMutualIds(new Set());
      } finally {
        setIsFollowListLoading(false);
      }
    },
    [currentUserId, profileId, viewerMode],
  );

  const handleOpenFollowModal = useCallback(
    (type: 'followers' | 'following') => {
      setFollowModalType(type);
      void loadFollowList(type);
    },
    [loadFollowList],
  );

  const handleCloseFollowModal = useCallback(() => {
    setFollowModalType(null);
    setFollowList([]);
    setFollowActionLoadingId(null);
    setUnfollowActionLoadingId(null);
  }, []);

  const handleFollowListProfilePress = useCallback(
    (targetProfileId: string) => {
      if (!targetProfileId) {
        return;
      }
      handleCloseFollowModal();
      router.push({ pathname: '/profile/[profileId]', params: { profileId: targetProfileId } } as never);
    },
    [handleCloseFollowModal, router],
  );

  const handleFollowBack = useCallback(
    async (targetProfileId: string) => {
      if (!currentUserId) {
        pendingFollowActionRef.current = {
          action: 'follow',
          targetProfileId,
          modalType: followModalType,
        };
        handleCloseFollowModal();
        openAuthPrompt();
        return;
      }
      if (followActionLoadingId === targetProfileId) {
        return;
      }
      setFollowActionLoadingId(targetProfileId);
      try {
        await followProfile(currentUserId, targetProfileId);
        await followStats.refresh?.();
        setViewerFollowingIds((prev) => {
          const next = new Set(prev);
          next.add(targetProfileId);
          return next;
        });
        setViewerMutualIds((prev) => {
          const next = new Set(prev);
          if (viewerFollowerIds.has(targetProfileId)) {
            next.add(targetProfileId);
          }
          return next;
        });
        if (followModalType) {
          void loadFollowList(followModalType);
        }
      } catch (error) {
        console.error('[PublicProfile] follow back error', error);
      } finally {
        setFollowActionLoadingId((current) => (current === targetProfileId ? null : current));
      }
    },
    [currentUserId, followActionLoadingId, followModalType, followStats, loadFollowList, openAuthPrompt, viewerFollowerIds],
  );

  const handleUnfollow = useCallback(
    async (targetProfileId: string) => {
      if (!currentUserId) {
        pendingFollowActionRef.current = {
          action: 'unfollow',
          targetProfileId,
          modalType: followModalType,
        };
        handleCloseFollowModal();
        openAuthPrompt();
        return;
      }
      if (unfollowActionLoadingId === targetProfileId) {
        return;
      }
      setUnfollowActionLoadingId(targetProfileId);
      try {
        await unfollowProfile(currentUserId, targetProfileId);
        await followStats.refresh?.();
        setViewerFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(targetProfileId);
          return next;
        });
        setViewerMutualIds((prev) => {
          const next = new Set(prev);
          next.delete(targetProfileId);
          return next;
        });
        if (followModalType) {
          void loadFollowList(followModalType);
        }
      } catch (error) {
        console.error('[PublicProfile] unfollow error', error);
      } finally {
        setUnfollowActionLoadingId((current) => (current === targetProfileId ? null : current));
      }
    },
    [currentUserId, followModalType, loadFollowList, unfollowActionLoadingId, followStats, openAuthPrompt],
  );

  const handleFollowPress = useCallback(() => {
    if (!profileId) {
      return;
    }
    if (!isLoggedIn) {
      pendingFollowActionRef.current = {
        action: followState.isFollowing ? 'unfollow' : 'follow',
        targetProfileId: profileId,
        modalType: null,
      };
      openAuthPrompt();
      return;
    }
    if (followState.isProcessing) {
      return;
    }

    followState
      .toggleFollow()
      .then(() => {
        void followStats.refresh?.();
        void fetchProfile();
      })
      .catch((error: unknown) => {
        console.error('[PublicProfile] follow toggle error (main button)', error);
      });
  }, [fetchProfile, followState, followStats, isLoggedIn, openAuthPrompt, profileId]);

  const handleListingPress = useCallback(
    (listingId: string) => {
      router.push({ pathname: '/property/[id]', params: { id: listingId } } as never);
    },
    [router],
  );

  const fullName = useMemo(() => {
    if (!profile) {
      return 'Profil';
    }
    return `${profile.firstName} ${profile.lastName}`.trim() || 'PUOL User';
  }, [profile]);

  const usernameLabel = useMemo(() => {
    if (!profile) {
      return '';
    }
    if (profile.username) {
      return `@${profile.username}`;
    }
    const base = `${profile.firstName}${profile.lastName}`.trim() || 'user';
    return `@${base.toLowerCase().replace(/\s+/g, '')}`;
  }, [profile]);

  const renderListingsGrid = () => {
    if (isListingsLoading) {
      return (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="small" color="#2ECC71" />
          <Text style={styles.loaderLabel}>Chargement des annonces…</Text>
        </View>
      );
    }

    if (listingsError) {
      return (
        <View style={styles.emptyCard}>
          <Feather name='alert-triangle' size={22} color="#EF4444" />
          <Text style={styles.emptyTitle}>Oups…</Text>
          <Text style={styles.emptySubtitle}>{listingsError}</Text>
          <TouchableOpacity style={styles.retryButton} activeOpacity={0.85} onPress={() => fetchListings()}>
            <Feather name="refresh-ccw" size={16} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (listings.length === 0) {
      const emptyTitle = isHostProfile ? 'Aucune annonce publiée' : "Aucune annonce pour l’instant";
      const emptySubtitle = isHostProfile
        ? 'Revenez plus tard pour découvrir de nouvelles publications.'
        : "Cet utilisateur n’a pas encore posté d’annonce.";
      return (
        <View style={styles.emptyCard}>
          <Feather name="video" size={24} color="#9CA3AF" />
          <Text style={styles.emptyTitle}>{emptyTitle}</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
        </View>
      );
    }

    return (
      <View style={styles.grid}>
        {listings.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.gridItem}
            activeOpacity={0.85}
            onPress={() => handleListingPress(item.id)}
          >
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.gridImage} />
            ) : (
              <View style={styles.gridPlaceholder}>
                <Feather name="image" size={20} color="#9CA3AF" />
              </View>
            )}
            <View style={styles.gridOverlay}>
              <View style={styles.overlayBadge}>
                <Feather name="eye" size={12} color="#FFFFFF" />
                <Text style={styles.overlayBadgeText}>{formatCount(item.views)}</Text>
              </View>
              <View style={styles.overlayBadge}>
                <Feather name="heart" size={12} color="#FFFFFF" />
                <Text style={styles.overlayBadgeText}>{formatCount(item.likes)}</Text>
              </View>
            </View>
            <View style={styles.gridFooter}>
              <Text style={styles.gridTitle} numberOfLines={2}>
                {item.title}
              </Text>
              {item.priceLabel && <Text style={styles.gridPrice}>{item.priceLabel}</Text>}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderPublicationsPlaceholder = () => (
    <View style={styles.emptyCard}>
      <Feather name="film" size={24} color="#9CA3AF" />
      <Text style={styles.emptyTitle}>Aucune publication</Text>
      <Text style={styles.emptySubtitle}>Cette section affichera les contenus sociaux publiés par ce profil.</Text>
    </View>
  );

  const renderFollowButton = (options?: { inline?: boolean }) => {
    if (isOwnProfile || !profileId) {
      return null;
    }

    let label = 'Suivre';
    if (followState.isMutual) {
      label = 'Ami(e)';
    } else if (followState.isFollowing) {
      label = 'Abonné(e)';
    } else if (followState.isFollowedByTarget) {
      label = 'Suivre en retour';
    }
    const inline = options?.inline ?? false;

    return (
      <TouchableOpacity
        style={[
          inline ? styles.followButtonInline : styles.followButton,
          followState.isFollowing && (inline ? styles.followButtonInlineActive : styles.followButtonActive),
        ]}
        onPress={handleFollowPress}
        disabled={followState.isProcessing}
        activeOpacity={0.9}
      >
        <Text
          style={[
            inline ? styles.followButtonInlineText : styles.followButtonText,
            followState.isFollowing && (inline ? styles.followButtonInlineTextActive : styles.followButtonTextActive),
          ]}
        >
          {followState.isProcessing ? '...' : label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderInlineFollowColumn = () => {
    const inlineButton = renderFollowButton({ inline: true });
    if (!inlineButton) return null;
    return <View style={[styles.statColumn, styles.followStatColumn]}>{inlineButton}</View>;
  };

  const renderPublicationsColumn = () => (
    <View style={styles.statColumn}>
      <Text style={styles.statValue}>{displayStats.listings}</Text>
      <Text style={styles.statLabel}>publications</Text>
    </View>
  );

  const renderFollowersColumn = () => (
    <TouchableOpacity
      style={styles.statColumn}
      activeOpacity={0.8}
      onPress={() => handleOpenFollowModal('followers')}
    >
      <Text style={styles.statValue}>{displayStats.followers}</Text>
      <Text style={[styles.statLabel, !displayStats.followers && styles.statLabelDisabled]}>followers</Text>
    </TouchableOpacity>
  );

  const renderFollowingColumn = () => (
    <TouchableOpacity
      style={styles.statColumn}
      activeOpacity={0.8}
      onPress={() => handleOpenFollowModal('following')}
    >
      <Text style={styles.statValue}>{displayStats.following}</Text>
      <Text style={[styles.statLabel, !displayStats.following && styles.statLabelDisabled]}>suivi(e)s</Text>
    </TouchableOpacity>
  );

  const handleShareProfile = useCallback(async () => {
    if (!profileId) {
      return;
    }
    const shareUrl = buildProfileShareUrl(profileId);
    const message = `Regarde ce profil sur Puol 👇\n${shareUrl}`;
    try {
      const result = await Share.share({
        title: fullName,
        message,
        url: shareUrl,
      });

      if (result.action === Share.sharedAction) {
        const channel = Platform.OS === 'ios' ? resolveProfileShareChannel(result.activityType) : 'system_share_sheet';
        void recordProfileShare({
          profileId,
          sharedByProfileId: currentUserId,
          channel,
        });
      }
    } catch (error) {
      console.warn('[PublicProfile] Share error', error);
    }
  }, [currentUserId, fullName, profileId]);

  const profileBadge = useMemo(() => {
    if (!profile) {
      return null;
    }

    if (profile.role === 'host' && profile.hostStatus === 'approved') {
      return { label: 'Hôte vérifié', variant: 'host' as const };
    }

    if (profile.role === 'landlord' && profile.landlordStatus === 'approved') {
      return { label: 'Bailleur vérifié', variant: 'landlord' as const };
    }

    return { label: 'Utilisateur', variant: 'user' as const };
  }, [profile]);

  if (!profileId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Aucun profil ciblé.</Text>
          <Text style={styles.errorSubtitle}>Veuillez réessayer.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
            <Feather name="chevron-left" size={16} color="#FFFFFF" />
            <Text style={styles.retryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="chevron-left" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>Profil</Text>
          <TouchableOpacity
            style={styles.shareButton}
            onPress={handleShareProfile}
            activeOpacity={0.8}
            disabled={!profileId}
          >
            <Feather name="share-2" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        {isProfileLoading ? (
          <View style={styles.loaderWrapper}>
            <ActivityIndicator size="small" color="#2ECC71" />
            <Text style={styles.loaderLabel}>Chargement du profil…</Text>
          </View>
        ) : profileError ? (
          <View style={styles.centered}>
            <Text style={styles.errorTitle}>Oups…</Text>
            <Text style={styles.errorSubtitle}>{profileError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchProfile()}>
              <Feather name="refresh-ccw" size={16} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : profile ? (
          <>
            <View style={styles.profileCard}>
              {isHostProfile && profile.enterpriseName ? (
                <Text style={styles.enterpriseName}>{profile.enterpriseName}</Text>
              ) : null}
              <TouchableOpacity activeOpacity={0.85} onPress={handleAvatarPress}>
                <Animated.View
                  style={[
                    styles.avatarWrapper,
                    {
                      transform: [{ perspective: 600 }, { rotateY: animatedRotationY }],
                      opacity: animatedOpacity,
                    },
                  ]}
                >
                  <Image
                    source={{
                      uri:
                        showEnterpriseAvatar && profile.enterpriseLogoUrl
                          ? profile.enterpriseLogoUrl
                          : profile.avatarUrl || buildFallbackAvatar(profile),
                    }}
                    style={styles.avatar}
                  />
                </Animated.View>
              </TouchableOpacity>
              <View style={styles.fullNameRow}>
                <Text style={styles.fullName}>{fullName}</Text>
                {hasProfessionalBadge(profile) && (
                  <Image
                    source={require('@/assets/icons/feed-icon-verified.png')}
                    style={styles.usernameBadgeIcon}
                    resizeMode="contain"
                  />
                )}
              </View>
              <Text style={styles.username}>{usernameLabel}</Text>
              {profileBadge && (
                <View
                  style={[
                    styles.profileBadge,
                    profileBadge.variant === 'host' && styles.profileBadgeHost,
                    profileBadge.variant === 'landlord' && styles.profileBadgeLandlord,
                    profileBadge.variant === 'user' && styles.profileBadgeUser,
                  ]}
                >
                  <Text
                    style={[
                      styles.profileBadgeText,
                      profileBadge.variant === 'host' && styles.profileBadgeHostText,
                      profileBadge.variant === 'landlord' && styles.profileBadgeLandlordText,
                      profileBadge.variant === 'user' && styles.profileBadgeUserText,
                    ]}
                  >
                    {profileBadge.label}
                  </Text>
                </View>
              )}

              <View style={styles.statsRow}>
                {renderInlineFollowColumn() ? (
                  <>
                    {renderFollowersColumn()}
                    {renderInlineFollowColumn()}
                    {renderFollowingColumn()}
                  </>
                ) : (
                  <>
                    {renderPublicationsColumn()}
                    {renderFollowersColumn()}
                    {renderFollowingColumn()}
                  </>
                )}
              </View>

              <View style={styles.metricCards}>
                {isHostProfile ? (
                  <>
                    <TouchableOpacity
                      style={styles.metricCardButton}
                      activeOpacity={0.85}
                      onPress={() => setShowViewsModal(true)}
                    >
                      <MetricCard icon="eye" label="Vues" value={formatCount(displayStats.views)} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.metricCardButton}
                      activeOpacity={0.85}
                      onPress={() => setShowLikesModal(true)}
                    >
                      <MetricCard icon="heart" label="Likes" value={formatCount(displayStats.likes)} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.metricCardButton}
                      activeOpacity={0.85}
                      onPress={() => setShowReviewsModal(true)}
                    >
                      <MetricCard icon="star" label="Avis" value={formatCount(displayStats.comments)} />
                    </TouchableOpacity>
                  </>
                ) : isLandlordProfile ? (
                  <>
                    <TouchableOpacity
                      style={styles.metricCardButton}
                      activeOpacity={0.85}
                      onPress={() => setShowLandlordViewsModal(true)}
                    >
                      <MetricCard icon="eye" label="Vues" value={formatCount(displayStats.views)} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.metricCardButton}
                      activeOpacity={0.85}
                      onPress={() => setShowLandlordLikesModal(true)}
                    >
                      <MetricCard icon="heart" label="Likes" value={formatCount(displayStats.likes)} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.metricCardButton}
                      activeOpacity={0.85}
                      onPress={() => setShowLandlordCommentsModal(true)}
                    >
                      <MetricCard icon="message-square" label="Commentaires" value={formatCount(displayStats.comments)} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.metricCardButton}
                      activeOpacity={0.85}
                      onPress={() => setShowUserReviewsModal(true)}
                    >
                      <MetricCard icon="star" label="Avis" value={formatCount(userReviewsTotal)} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.metricCardButton}
                      activeOpacity={0.85}
                      onPress={() => setShowUserLikesModal(true)}
                    >
                      <MetricCard icon="heart" label="Likes" value={formatCount(displayStats.likes)} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.metricCardButton}
                      activeOpacity={0.85}
                      onPress={() => setShowUserCommentsModal(true)}
                    >
                      <MetricCard icon="message-square" label="Commentaires" value={formatCount(displayStats.comments)} />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>

            <View style={styles.tabBar}>
              {(['listings', 'publications'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.tabButtonText, activeTab === tab && styles.tabButtonTextActive]}>
                    {tab === 'listings' ? 'Annonces' : 'Publications'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {activeTab === 'listings' ? renderListingsGrid() : renderPublicationsPlaceholder()}
          </>
        ) : null}
      </ScrollView>

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
        message="Connectez-vous pour suivre ce profil."
      />

      <LoginWithOTPScreen
        visible={showLoginScreen}
        onClose={() => {
          setShowLoginScreen(false);
        }}
        onAuthenticated={() => {
          setShowLoginScreen(false);
        }}
        onRequestSignUp={() => {
          setShowLoginScreen(false);
          setShowSignUpScreen(true);
        }}
      />

      <SignUpScreen
        visible={showSignUpScreen}
        onClose={() => setShowSignUpScreen(false)}
        onSuccess={() => setShowSignUpScreen(false)}
      />

      {isRegularUserProfile && (
        <>
          <ReviewsModal
            visible={showUserReviewsModal}
            onClose={() => setShowUserReviewsModal(false)}
            reviews={userReviewItems}
            isLoading={userReviewsLoading}
            averageRating={userAverageRating}
            totalCount={userReviewsTotal}
            onRefresh={refreshUserReviews}
            title="Avis publiés"
            emptyTitle="Aucun avis publié"
            emptySubtitle="Publiez un avis pour qu'il apparaisse ici."
            onListingPress={handleListingPress}
          />
          <UserLikesModal
            visible={showUserLikesModal}
            onClose={() => setShowUserLikesModal(false)}
            items={userLikedListings}
            isLoading={isUserLikesLoading}
            onRefresh={() => fetchUserLikes()}
            onListingPress={handleListingPress}
          />
          <UserCommentsModal
            visible={showUserCommentsModal}
            onClose={() => setShowUserCommentsModal(false)}
            items={userComments}
            isLoading={isUserCommentsLoading}
            onRefresh={() => fetchUserComments()}
            onListingPress={handleListingPress}
          />
        </>
      )}

      {isHostProfile && (
        <HostReviewsModal
          visible={showReviewsModal}
          onClose={() => setShowReviewsModal(false)}
          reviews={hostReviews}
          isLoading={hostReviewsLoading}
          averageRating={hostAverageRating}
          totalCount={hostReviewsCount}
          onRefresh={refreshHostReviews}
          onListingPress={handleListingPress}
        />
      )}
      {isHostProfile && (
        <>
          <HostStatHighlightModal
            visible={showViewsModal}
            onClose={() => setShowViewsModal(false)}
            icon="eye"
            title="Vues totales"
            value={displayStats.views.toLocaleString('fr-FR')}
            subtitle={`${fullName} a enregistré ${displayStats.views.toLocaleString('fr-FR')} vues au total.`}
          />
          <HostStatHighlightModal
            visible={showLikesModal}
            onClose={() => setShowLikesModal(false)}
            icon="heart"
            title="Likes reçus"
            value={displayStats.likes.toLocaleString('fr-FR')}
            subtitle={`${fullName} a reçu ${displayStats.likes.toLocaleString('fr-FR')} likes sur ses annonces.`}
          />
        </>
      )}

      {isLandlordProfile && (
        <>
          <HostStatHighlightModal
            visible={showLandlordViewsModal}
            onClose={() => setShowLandlordViewsModal(false)}
            icon="eye"
            title="Vues totales"
            value={landlordViewsTotal.toLocaleString('fr-FR')}
            subtitle={`${fullName} a enregistré ${landlordViewsTotal.toLocaleString('fr-FR')} vues sur ses annonces.`}
          />
          <HostStatHighlightModal
            visible={showLandlordLikesModal}
            onClose={() => setShowLandlordLikesModal(false)}
            icon="heart"
            title="Likes reçus"
            value={landlordLikesTotal.toLocaleString('fr-FR')}
            subtitle={`${fullName} a reçu ${landlordLikesTotal.toLocaleString('fr-FR')} likes sur ses annonces.`}
          />
          <UserCommentsModal
            visible={showLandlordCommentsModal}
            onClose={() => setShowLandlordCommentsModal(false)}
            items={landlordCommentEntries}
            isLoading={areLandlordCommentsLoading}
            onRefresh={() => refreshLandlordComments()}
            onListingPress={handleListingPress}
          />
        </>
      )}

      {followModalType ? (
        <FollowListModal
          visible
          type={followModalType}
          items={followList}
          loading={isFollowListLoading}
          onClose={handleCloseFollowModal}
          onRefresh={() => followModalType && loadFollowList(followModalType)}
          onFollowBack={handleFollowBack}
          onUnfollow={handleUnfollow}
          followActionLoadingId={followActionLoadingId}
          unfollowActionLoadingId={unfollowActionLoadingId}
          viewerMode={viewerMode}
          viewerFollowingIds={viewerFollowingIds}
          viewerFollowerIds={viewerFollowerIds}
          friendIds={viewerMutualIds}
          viewerId={currentUserId}
          onProfilePress={handleFollowListProfilePress}
          ownerView={Boolean(currentUserId && currentUserId === profileId)}
        />
      ) : null}

      <Modal visible={isAvatarPreviewVisible} transparent animationType="fade" onRequestClose={handleCloseAvatarPreview}>
        <TouchableWithoutFeedback onPress={handleCloseAvatarPreview}>
          <View style={styles.previewOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.previewContent}>
                <View style={styles.previewImageWrapper}>
                  {avatarPreviewUri ? (
                    <Image source={{ uri: avatarPreviewUri }} style={styles.previewImage} resizeMode="contain" />
                  ) : (
                    <View style={styles.previewPlaceholder}>
                      <Feather name="image" size={28} color="#9CA3AF" />
                    </View>
                  )}
                  <TouchableOpacity style={styles.previewCloseButton} onPress={handleCloseAvatarPreview} activeOpacity={0.85}>
                    <Feather name="x" size={18} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const MetricCard = ({ icon, label, value }: { icon: keyof typeof Feather.glyphMap; label: string; value: string }) => (
  <View style={styles.metricCard}>
    <Feather name={icon} size={16} color="#2ECC71" />
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const buildFallbackAvatar = (profile: Pick<PublicProfile, 'firstName' | 'lastName'>) => {
  const fullName = `${profile.firstName} ${profile.lastName}`.trim() || 'PUOL User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=0F172A&color=ffffff&bold=true`;
};

const formatCount = (value: number) => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  return `${value}`;
};

const hasProfessionalBadge = (profile: PublicProfile | null) => {
  if (!profile) return false;
  const isHostApproved = profile.role === 'host' && profile.hostStatus === 'approved';
  const isLandlordApproved = profile.role === 'landlord' && profile.landlordStatus === 'approved';
  return isHostApproved || isLandlordApproved;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: 12,
    gap: 16,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  shareButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerShareWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    borderRadius: 24,
    backgroundColor: '#F9FAFB',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 12,
  },
  enterpriseName: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: '#2ECC71',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarWrapper: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  previewContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    alignItems: 'center',
    position: 'relative',
  },
  previewImageWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  previewCloseButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  previewImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
  },
  previewPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullName: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  fullNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  username: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    marginTop: -10,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  usernameBadgeIcon: {
    width: 16,
    height: 16,
  },
  profileBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  profileBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
  },
  profileBadgeHost: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
  },
  profileBadgeHostText: {
    color: '#15803D',
  },
  profileBadgeLandlord: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
  },
  profileBadgeLandlordText: {
    color: '#15803D',
  },
  profileBadgeUser: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
  },
  profileBadgeUserText: {
    color: '#15803D',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  followButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#2ECC71',
  },
  followButtonActive: {
    backgroundColor: '#E5E7EB',
  },
  followButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  followButtonTextActive: {
    color: '#0F172A',
  },
  followButtonInline: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 0,
    borderRadius: 999,
    backgroundColor: '#2ECC71',
  },
  followButtonInlineActive: {
    backgroundColor: '#E5E7EB',
  },
  followButtonInlineText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  followButtonInlineTextActive: {
    color: '#0F172A',
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  followStatColumn: {
    flex: 1,
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  statValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  statLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  statLabelDisabled: {
    color: '#CBD5F5',
  },
  metricCards: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 14,
    gap: 10,
  },
  metricCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 6,
  },
  metricValue: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  metricLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  metricCardButton: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalHeaderIconButton: {
    padding: 6,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
  },
  modalTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalCloseButton: {
    padding: 6,
  },
  modalStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  modalRatingValue: {
    fontFamily: 'Manrope',
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalRatingLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  modalRefreshButton: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
  },
  modalLoader: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 20,
  },
  modalLoaderText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  modalEmptyState: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 32,
  },
  modalEmptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalEmptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalList: {
    gap: 12,
    paddingBottom: 12,
  },
  modalReviewsList: {
    gap: 12,
    paddingBottom: 4,
  },
  listCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
  },
  listCardImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  listCardImagePlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCardBody: {
    flex: 1,
    gap: 4,
  },
  listCardTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  listCardSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  listCardMeta: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#9CA3AF',
  },
  listCardContent: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#111827',
    lineHeight: 18,
  },
  reviewCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    gap: 6,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewAuthor: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  reviewDate: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#9CA3AF',
  },
  reviewListing: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
  reviewComment: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#111827',
    lineHeight: 18,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  highlightModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
    width: '85%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  highlightContent: {
    alignItems: 'center',
    gap: 10,
    marginTop: -30,
  },
  highlightIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: '#6B7280',
  },
  highlightValue: {
    fontFamily: 'Manrope',
    fontSize: 32,
    fontWeight: '700',
    color: '#0F172A',
  },
  highlightSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  highlightCloseButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    marginBottom: -4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 999,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  tabButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabButtonTextActive: {
    color: '#0F172A',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: CARD_GAP,
    rowGap: GRID_ROW_GAP,
  },
  gridItem: {
    width: CARD_SIZE,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  gridImage: {
    width: '100%',
    height: CARD_SIZE,
  },
  gridPlaceholder: {
    width: '100%',
    height: CARD_SIZE,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    top: 6,
    right: 6,
    left: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  overlayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  overlayBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#FFFFFF',
  },
  gridFooter: {
    paddingHorizontal: 6,
    paddingVertical: 8,
    gap: 2,
  },
  gridTitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  gridPrice: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#6B7280',
  },
  loaderWrapper: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 10,
  },
  loaderLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    padding: 20,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  errorTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  errorSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#0F172A',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  retryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
