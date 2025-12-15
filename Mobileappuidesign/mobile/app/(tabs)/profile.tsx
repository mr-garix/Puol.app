import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  InteractionManager,
  FlatList,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

import { ProfileScreen } from '@/src/features/auth/components/ProfileScreen';
import { AuthModal } from '@/src/features/auth/components/AuthModal';
import { LoginWithOTPScreen } from '@/src/features/auth/components/LoginWithOTPScreen';
import { SignUpScreen } from '@/src/features/auth/components/SignUpScreen';
import { useReservations } from '@/src/contexts/ReservationContext';
import { useAuth, type AuthUser } from '@/src/contexts/AuthContext';
import { useProfile } from '@/src/contexts/ProfileContext';
import { getUserCommentConversations } from '@/src/features/comments/services';
import { useUserReviews } from '@/src/features/reviews/hooks/useUserReviews';
import { useFollowStats } from '@/src/features/follows/hooks/useFollowState';
import { FollowListModal } from '@/src/features/follows/components/FollowListModal';
import {
  getFollowersList,
  getFollowingList,
  followProfile,
  unfollowProfile,
  type ProfileFollowListItem,
} from '@/src/features/follows/services';
import { supabase } from '@/src/supabaseClient';
import { getViewedListings, type ViewedListing } from '@/src/features/listings/viewHistoryStorage';

type LikedListing = {
  id: string;
  listingId: string;
  title: string | null;
  city: string | null;
  district: string | null;
  coverPhotoUrl: string | null;
  likedAt: string | null;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 10;
const MODAL_MAX_WIDTH = 420;
const MODAL_CONTENT_PADDING = 20;
const MODAL_SIDE_PADDING = 24;
const effectiveHistoryWidth = Math.max(
  Math.min(SCREEN_WIDTH, MODAL_MAX_WIDTH) - 2 * (MODAL_CONTENT_PADDING + MODAL_SIDE_PADDING),
  220,
);
const CARD_WIDTH = (effectiveHistoryWidth - CARD_GAP) / 2;
const HISTORY_CARD_ASPECT_RATIO = 4 / 3;

const buildFallbackAvatar = (firstName: string, lastName: string) => {
  const fullName = `${firstName} ${lastName}`.trim() || 'PUOL User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=2ECC71&color=ffffff&bold=true`;
};

export default function ProfileTabScreen() {
  const router = useRouter();
  const { reservations, isLoading: reservationsLoading, error: reservationsError, refreshReservations } = useReservations();
  const { isLoggedIn, logout, supabaseProfile, isLoading } = useAuth();
  const { profile, isProfileLoading } = useProfile();
  const currentProfileId = profile?.id ?? supabaseProfile?.id ?? null;
  const {
    followersCount: dynamicFollowersCount,
    followingCount: dynamicFollowingCount,
    refresh: refreshFollowStats,
    isFetching: isFollowStatsFetching,
  } = useFollowStats(currentProfileId, { enabled: Boolean(currentProfileId) });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLoginScreen, setShowLoginScreen] = useState(false);
  const [showSignUpScreen, setShowSignUpScreen] = useState(false);
  const reservationsCount = reservations.length;
  const [commentsCount, setCommentsCount] = useState(0);
  const [isAvatarVisible, setIsAvatarVisible] = useState(false);
  const [followModalType, setFollowModalType] = useState<'followers' | 'following' | null>(null);
  const [followList, setFollowList] = useState<ProfileFollowListItem[]>([]);
  const [isFollowListLoading, setIsFollowListLoading] = useState(false);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [viewerFollowerIds, setViewerFollowerIds] = useState<Set<string>>(new Set());
  const [viewerFollowingIds, setViewerFollowingIds] = useState<Set<string>>(new Set());
  const [followActionLoadingId, setFollowActionLoadingId] = useState<string | null>(null);
  const [unfollowActionLoadingId, setUnfollowActionLoadingId] = useState<string | null>(null);
  const { totalCount: userReviewsCount } = useUserReviews(supabaseProfile?.id ?? null);
  const [viewedListings, setViewedListings] = useState<ViewedListing[]>([]);
  const [likedListings, setLikedListings] = useState<LikedListing[]>([]);
  const [isHistoryModalVisible, setIsHistoryModalVisible] = useState(false);
  const [isLikesModalVisible, setIsLikesModalVisible] = useState(false);
  const [isLikesLoading, setIsLikesLoading] = useState(false);

  useEffect(() => {
    if (isLoggedIn) {
      setShowAuthModal(false);
      setShowLoginScreen(false);
      setShowSignUpScreen(false);
    } else {
      setShowLoginScreen(false);
      setShowSignUpScreen(false);
    }
  }, [isLoggedIn]);

  const openAuthFlow = () => {
    setShowAuthModal(true);
  };

  const handleLoginAuthenticated = () => {
    setShowLoginScreen(false);
    setShowAuthModal(false);
  };

  const handleSignUpSuccess = (_user: AuthUser) => {
    setShowSignUpScreen(false);
    setShowAuthModal(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('[ProfileTab] logout error', error);
    } finally {
      setShowAuthModal(false);
      setShowLoginScreen(false);
      setShowSignUpScreen(false);
    }
  };

  const hostDashboardStatus = useMemo(() => {
    if (!profile) {
      return undefined;
    }

    if (profile.role === 'host' && profile.hostStatus === 'approved') {
      return 'approved' as const;
    }

    if (profile.hostStatus === 'pending') {
      return 'pending' as const;
    }

    if (profile.hostStatus === 'rejected') {
      return 'rejected' as const;
    }

    return undefined;
  }, [profile]);

  const hostStatusMessage = useMemo(() => {
    switch (hostDashboardStatus) {
      case 'pending':
        return "Ta demande pour devenir hôte est en cours de vérification. Profite pour explorer l’application pendant que l’équipe finalise la validation.";
      case 'rejected':
        return 'Votre demande pour devenir hôte a été refusée.';
      default:
        return undefined;
    }
  }, [hostDashboardStatus]);

  const landlordDashboardStatus = useMemo(() => {
    if (!profile) {
      return undefined;
    }

    if (profile.role === 'landlord' && profile.landlordStatus === 'approved') {
      return 'approved' as const;
    }

    if (profile.landlordStatus === 'pending') {
      return 'pending' as const;
    }

    if (profile.landlordStatus === 'rejected') {
      return 'rejected' as const;
    }

    return undefined;
  }, [profile]);

  const landlordStatusMessage = useMemo(() => {
    switch (landlordDashboardStatus) {
      case 'pending':
        return "Ta demande bailleur est en cours de vérification. L'équipe te recontacte très vite pour finaliser.";
      case 'rejected':
        return 'Votre demande pour devenir bailleur a été refusée.';
      default:
        return undefined;
    }
  }, [landlordDashboardStatus]);

  const mergedStats = useMemo(() => {
    const stats = profile?.stats;
    const baseFollowers = stats?.followers ?? 0;
    const baseFollowing = stats?.following ?? 0;
    const viewedListingsCount = viewedListings.length;
    const likedListingsCount = likedListings.length;

    return {
      listings: stats?.listings ?? 0,
      followers: dynamicFollowersCount ?? baseFollowers,
      following: dynamicFollowingCount ?? baseFollowing,
      views: viewedListingsCount,
      likes: likedListingsCount,
      comments: commentsCount,
    };
  }, [commentsCount, dynamicFollowersCount, dynamicFollowingCount, likedListings.length, profile?.stats, viewedListings.length]);

  const friendStorageKey = useMemo(
    () => (currentProfileId ? `puol:friends:${currentProfileId}` : null),
    [currentProfileId],
  );

  const loadFriendIdsSnapshot = useCallback(async () => {
    if (!friendStorageKey) {
      setFriendIds(new Set());
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(friendStorageKey);
      if (!raw) {
        setFriendIds(new Set());
        return;
      }
      const parsed = JSON.parse(raw) as string[];
      setFriendIds(new Set(parsed));
    } catch (error) {
      console.warn('[ProfileTab] Unable to load friend IDs', error);
      setFriendIds(new Set());
    }
  }, [friendStorageKey]);

  const persistFriendIds = useCallback(
    async (ids: Set<string>) => {
      if (!friendStorageKey) {
        return;
      }
      try {
        await AsyncStorage.setItem(friendStorageKey, JSON.stringify(Array.from(ids)));
      } catch (error) {
        console.warn('[ProfileTab] Unable to persist friend IDs', error);
      }
    },
    [friendStorageKey],
  );

  useEffect(() => {
    void loadFriendIdsSnapshot();
  }, [loadFriendIdsSnapshot]);

  const loadCommentsCount = useCallback(async () => {
    if (!supabaseProfile?.id) {
      setCommentsCount(0);
      return;
    }

    try {
      const conversations = await getUserCommentConversations(supabaseProfile.id);
      const totalReplies = conversations.reduce((acc, conversation) => acc + (conversation.replyCount ?? 0), 0);
      setCommentsCount(totalReplies);
    } catch (error) {
      console.error('[ProfileTab] Unable to load comment count', error);
      setCommentsCount(0);
    }
  }, [supabaseProfile?.id]);

  useEffect(() => {
    void loadCommentsCount();
  }, [loadCommentsCount]);

  useEffect(() => {
    if (!supabaseProfile?.id) {
      return;
    }

    const channel = supabase
      .channel(`profile-comments:${supabaseProfile.id}`)
      .on('postgres_changes', { schema: 'public', table: 'listing_comments', event: '*' }, () => {
        void loadCommentsCount();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadCommentsCount, supabaseProfile?.id]);

  const recomputeFriendships = useCallback(
    async ({
      followersSnapshot,
      followingSnapshot,
    }: {
      followersSnapshot?: ProfileFollowListItem[];
      followingSnapshot?: ProfileFollowListItem[];
    } = {}) => {
      if (!currentProfileId) {
        setViewerFollowerIds(new Set());
        setViewerFollowingIds(new Set());
        setFriendIds(() => {
          const next = new Set<string>();
          void persistFriendIds(next);
          return next;
        });
        return;
      }
      try {
        const [followers, following] = await Promise.all([
          followersSnapshot ? Promise.resolve(followersSnapshot) : getFollowersList(currentProfileId),
          followingSnapshot ? Promise.resolve(followingSnapshot) : getFollowingList(currentProfileId),
        ]);

        const followerSet = new Set(followers.map((item) => item.id));
        const followingSet = new Set(following.map((item) => item.id));

        setViewerFollowerIds(followerSet);
        setViewerFollowingIds(followingSet);

        setFriendIds(() => {
          const next = new Set<string>();
          followerSet.forEach((id) => {
            if (followingSet.has(id)) {
              next.add(id);
            }
          });
          void persistFriendIds(next);
          return next;
        });
      } catch (error) {
        console.error('[ProfileTab] Unable to recompute friendships', error);
        setViewerFollowerIds(new Set());
        setViewerFollowingIds(new Set());
        setFriendIds(() => {
          const next = new Set<string>();
          void persistFriendIds(next);
          return next;
        });
      }
    },
    [currentProfileId, persistFriendIds],
  );

  const loadFollowList = useCallback(
    async (type: 'followers' | 'following') => {
      if (!currentProfileId) {
        setFollowList([]);
        return;
      }
      setIsFollowListLoading(true);
      try {
        const data =
          type === 'followers' ? await getFollowersList(currentProfileId) : await getFollowingList(currentProfileId);
        setFollowList(data);
        await recomputeFriendships({
          followersSnapshot: type === 'followers' ? data : undefined,
          followingSnapshot: type === 'following' ? data : undefined,
        });
      } catch (error) {
        console.error('[ProfileTab] Unable to load follow list', error);
        setFollowList([]);
      } finally {
        setIsFollowListLoading(false);
      }
    },
    [currentProfileId, recomputeFriendships],
  );

  const handleOpenFollowModal = useCallback(
    (type: 'followers' | 'following') => {
      if (!currentProfileId) {
        return;
      }
      setFollowModalType(type);
      void loadFollowList(type);
    },
    [currentProfileId, loadFollowList],
  );

  const handleCloseFollowModal = useCallback(() => {
    setFollowModalType(null);
    setFollowList([]);
  }, []);

  const loadViewedListings = useCallback(async () => {
    const items = await getViewedListings();
    setViewedListings(items);
  }, []);

  const loadLikedListings = useCallback(async () => {
    if (!currentProfileId) {
      setLikedListings([]);
      return;
    }
    setIsLikesLoading(true);
    try {
      const { data, error } = await supabase
        .from('listing_likes')
        .select(
          `
            id,
            created_at,
            listing_id,
            listing:listings!inner(
              id,
              title,
              city,
              district,
              cover_photo_url
            )
          `,
        )
        .eq('profile_id', currentProfileId)
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
        } satisfies LikedListing;
      });

      setLikedListings(mapped);
    } catch (error) {
      console.error('[ProfileTab] Unable to load liked listings', error);
      setLikedListings([]);
    } finally {
      setIsLikesLoading(false);
    }
  }, [currentProfileId]);

  const handleOpenHistory = useCallback(() => {
    void loadViewedListings();
    setIsHistoryModalVisible(true);
  }, [loadViewedListings]);

  const handleOpenLikes = useCallback(() => {
    void loadLikedListings();
    setIsLikesModalVisible(true);
  }, [loadLikedListings]);

  useEffect(() => {
    if (isLoggedIn) {
      void loadViewedListings();
      void loadLikedListings();
    }
  }, [isLoggedIn, loadLikedListings, loadViewedListings]);

  const handleFollowListProfilePress = useCallback(
    (targetProfileId: string) => {
      if (!targetProfileId) {
        return;
      }
      const normalizedId = String(targetProfileId);
      handleCloseFollowModal();
      InteractionManager.runAfterInteractions(() => {
        router.push({ pathname: '/profile/[profileId]', params: { profileId: normalizedId } } as never);
      });
    },
    [handleCloseFollowModal, router],
  );

  const handleFollowBack = useCallback(
    async (targetProfileId: string) => {
      if (!supabaseProfile?.id || followActionLoadingId === targetProfileId) {
        return;
      }
      setFollowActionLoadingId(targetProfileId);
      try {
        await followProfile(supabaseProfile.id, targetProfileId);
        setFriendIds((prev) => {
          const next = new Set(prev);
          next.add(targetProfileId);
          void persistFriendIds(next);
          return next;
        });
        await refreshFollowStats();
        await recomputeFriendships();
        if (followModalType) {
          await loadFollowList(followModalType);
        }
      } catch (error) {
        console.error('[ProfileTab] follow back error', error);
      } finally {
        setFollowActionLoadingId((current) => (current === targetProfileId ? null : current));
      }
    },
    [
      followActionLoadingId,
      followModalType,
      loadFollowList,
      persistFriendIds,
      recomputeFriendships,
      refreshFollowStats,
      supabaseProfile?.id,
    ],
  );

  const handleUnfollow = useCallback(
    async (targetProfileId: string) => {
      if (!supabaseProfile?.id || unfollowActionLoadingId === targetProfileId) {
        return;
      }
      setUnfollowActionLoadingId(targetProfileId);
      try {
        await unfollowProfile(supabaseProfile.id, targetProfileId);
        setFriendIds((prev) => {
          const next = new Set(prev);
          next.delete(targetProfileId);
          void persistFriendIds(next);
          return next;
        });
        await refreshFollowStats();
        await recomputeFriendships();
        if (followModalType) {
          await loadFollowList(followModalType);
        }
      } catch (error) {
        console.error('[ProfileTab] unfollow error', error);
      } finally {
        setUnfollowActionLoadingId((current) => (current === targetProfileId ? null : current));
      }
    },
    [
      followModalType,
      loadFollowList,
      persistFriendIds,
      recomputeFriendships,
      refreshFollowStats,
      supabaseProfile?.id,
      unfollowActionLoadingId,
    ],
  );

  if (!isLoggedIn) {
    return (
      <>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockedTitle}>Connectez-vous pour accéder à votre profil</Text>
          <Text style={styles.lockedSubtitle}>
            Retrouvez vos réservations, vos favoris et vos informations personnelles.
          </Text>
          <TouchableOpacity style={styles.lockedButton} activeOpacity={0.85} onPress={openAuthFlow}>
            <Text style={styles.lockedButtonText}>Se connecter / Créer un compte</Text>
          </TouchableOpacity>
        </View>

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
          message="Connectez-vous pour accéder à votre profil"
        />
        <LoginWithOTPScreen
          visible={showLoginScreen}
          onClose={() => {
            setShowLoginScreen(false);
            if (!isLoggedIn) {
              setShowAuthModal(true);
            }
          }}
          onAuthenticated={handleLoginAuthenticated}
          onRequestSignUp={() => {
            setShowLoginScreen(false);
            setShowSignUpScreen(true);
          }}
        />
        <SignUpScreen
          visible={showSignUpScreen}
          onClose={() => {
            setShowSignUpScreen(false);
            if (!isLoggedIn) {
              setShowAuthModal(true);
            }
          }}
          onSuccess={handleSignUpSuccess}
        />
      </>
    );
  }

  if (isLoading || isProfileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#2ECC71" />
        <Text style={styles.loadingText}>Chargement de votre profil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Profil introuvable.</Text>
      </View>
    );
  }

  const userPhoto = profile.avatarUrl || buildFallbackAvatar(profile.firstName, profile.lastName);

  return (
    <>
      <ProfileScreen
        userData={{
          firstName: profile.firstName,
          lastName: profile.lastName,
          photo: userPhoto,
          username: profile.username,
          verified: Boolean(supabaseProfile?.is_certified),
          companyName: profile.enterpriseName,
          companyLogoUrl: profile.enterpriseLogoUrl,
          stats: mergedStats,
        }}
        reservationsCount={reservationsCount}
        reservationsLoading={reservationsLoading}
        reservationsError={reservationsError}
        onRetryReservations={refreshReservations}
        reviewsCount={userReviewsCount}
        unreadMessagesCount={0}
        unreadCommentsCount={0}
        onEditProfile={() => router.push('/profile/edit' as never)}
        onNavigateToMessages={() => router.push('/messages' as never)}
        onNavigateToReservations={() => router.push('/reservations' as never)}
        onNavigateToListings={() => router.push('/listings' as never)}
        onNavigateToContents={() => router.push('/contents' as never)}
        onNavigateToReviews={() => router.push('/reviews' as never)}
        onNavigateToSupport={() => router.push('/support' as never)}
        onShowQRCode={() => {}}
        onLogout={handleLogout}
        onProfileImagePress={() => setIsAvatarVisible(true)}
        onCommentsPress={() => router.push('/comments' as never)}
        onLikesPress={handleOpenLikes}
        onFollowersPress={() => handleOpenFollowModal('followers')}
        onFollowingPress={() => handleOpenFollowModal('following')}
        onViewsPress={handleOpenHistory}
        hostDashboardStatus={hostDashboardStatus}
        hostStatusMessage={hostStatusMessage}
        onHostDashboardPress={() => router.push('/host-dashboard' as never)}
        landlordDashboardStatus={landlordDashboardStatus}
        landlordStatusMessage={landlordStatusMessage}
        onLandlordDashboardPress={() => router.push('/landlord-dashboard' as never)}
        showListingsMenu={profile.role === 'user'}
      />

      <Modal
        visible={isAvatarVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAvatarVisible(false)}
      >
        <TouchableOpacity
          style={styles.avatarOverlay}
          activeOpacity={1}
          onPress={() => setIsAvatarVisible(false)}
        >
          <View style={styles.avatarContent}>
            <Image source={{ uri: userPhoto }} style={styles.avatarFullImage} />
            <TouchableOpacity style={styles.avatarCloseButton} activeOpacity={0.85} onPress={() => setIsAvatarVisible(false)}>
              <Text style={styles.avatarCloseText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {followModalType && (
        <FollowListModal
          visible={followModalType !== null}
          type={followModalType}
          items={followList}
          loading={isFollowListLoading}
          onClose={handleCloseFollowModal}
          onRefresh={() => followModalType && loadFollowList(followModalType)}
          friendIds={friendIds}
          onFollowBack={handleFollowBack}
          onUnfollow={handleUnfollow}
          followActionLoadingId={followActionLoadingId}
          unfollowActionLoadingId={unfollowActionLoadingId}
          viewerId={currentProfileId}
          onProfilePress={handleFollowListProfilePress}
          viewerFollowerIds={viewerFollowerIds}
          viewerFollowingIds={viewerFollowingIds}
          ownerView
        />
      )}

      <Modal
        visible={isHistoryModalVisible}
        onRequestClose={() => setIsHistoryModalVisible(false)}
        animationType="slide"
        transparent
      >
        <View style={styles.historyModalBackdrop}>
          <View style={styles.historyModalContent}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>Annonces consultées</Text>
              <TouchableOpacity onPress={() => setIsHistoryModalVisible(false)} activeOpacity={0.75}>
                <Feather name="x" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            {viewedListings.length === 0 ? (
              <View style={styles.historyEmptyState}>
                <Feather name="eye-off" size={24} color="#9CA3AF" />
                <Text style={styles.historyEmptyTitle}>Aucune annonce consultée pour le moment</Text>
                <Text style={styles.historyEmptySubtitle}>Visitez quelques biens pour les retrouver ici.</Text>
              </View>
            ) : (
              <FlatList
                data={viewedListings}
                keyExtractor={(item) => item.listingId}
                numColumns={2}
                columnWrapperStyle={{ gap: CARD_GAP, justifyContent: 'center' }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: CARD_GAP, alignItems: 'center' }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.historyCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      setIsHistoryModalVisible(false);
                      router.push(`/property/${item.listingId}` as never);
                    }}
                  >
                    <View style={styles.historyCardImageWrapper}>
                      {item.coverPhotoUrl ? (
                        <Image source={{ uri: item.coverPhotoUrl }} style={styles.historyCardImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.historyCardPlaceholder}>
                          <Feather name="image" size={20} color="#9CA3AF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.historyCardBody}>
                      <Text style={styles.historyCardTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                      <Text style={styles.historyCardSubtitle} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={isLikesModalVisible}
        onRequestClose={() => setIsLikesModalVisible(false)}
        animationType="slide"
        transparent
      >
        <View style={styles.historyModalBackdrop}>
          <View style={styles.historyModalContent}>
            <View style={styles.historyModalHeader}>
              <Text style={styles.historyModalTitle}>Annonces likées</Text>
              <TouchableOpacity onPress={() => setIsLikesModalVisible(false)} activeOpacity={0.75}>
                <Feather name="x" size={20} color="#111827" />
              </TouchableOpacity>
            </View>
            {isLikesLoading ? (
              <View style={styles.historyEmptyState}>
                <ActivityIndicator size="small" color="#2ECC71" />
                <Text style={styles.historyEmptyTitle}>Chargement des favoris…</Text>
              </View>
            ) : likedListings.length === 0 ? (
              <View style={styles.historyEmptyState}>
                <Feather name="heart" size={24} color="#9CA3AF" />
                <Text style={styles.historyEmptyTitle}>Aucun favori enregistré</Text>
                <Text style={styles.historyEmptySubtitle}>Likez des annonces pour les retrouver ici.</Text>
              </View>
            ) : (
              <FlatList
                data={likedListings}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={{ gap: CARD_GAP, justifyContent: 'center' }}
                contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 16, gap: CARD_GAP, alignItems: 'center' }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.historyCard}
                    activeOpacity={0.85}
                    onPress={() => {
                      setIsLikesModalVisible(false);
                      router.push(`/property/${item.listingId}` as never);
                    }}
                  >
                    <View style={styles.historyCardImageWrapper}>
                      {item.coverPhotoUrl ? (
                        <Image source={{ uri: item.coverPhotoUrl }} style={styles.historyCardImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.historyCardPlaceholder}>
                          <Feather name="image" size={20} color="#9CA3AF" />
                        </View>
                      )}
                    </View>
                    <View style={styles.historyCardBody}>
                      <Text style={styles.historyCardTitle} numberOfLines={2}>
                        {item.title ?? 'Annonce PUOL'}
                      </Text>
                      <Text style={styles.historyCardSubtitle} numberOfLines={1}>
                        {[item.district, item.city].filter(Boolean).join(', ') || 'Localisation PUOL'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

    </>
  );
}

const styles = StyleSheet.create({
  lockedContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 16,
  },
  lockedTitle: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  lockedSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  lockedButton: {
    marginTop: 8,
    backgroundColor: '#2ECC71',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  lockedButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#6B7280',
  },
  avatarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  avatarContent: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  avatarFullImage: {
    width: '100%',
    height: '100%',
  },
  avatarCloseButton: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: [{ translateX: -60 }],
    width: 120,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.7)',
    alignItems: 'center',
  },
  avatarCloseText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  historyModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  historyModalContent: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    gap: 18,
  },
  historyModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyModalTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  historyEmptyState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 40,
  },
  historyEmptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  historyEmptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  historyCard: {
    width: CARD_WIDTH,
    borderRadius: 18,
    backgroundColor: '#F9FAFB',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyCardImageWrapper: {
    width: '100%',
    aspectRatio: HISTORY_CARD_ASPECT_RATIO,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  historyCardImage: {
    width: '100%',
    height: '100%',
  },
  historyCardPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyCardBody: {
    padding: 10,
    gap: 4,
  },
  historyCardTitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  historyCardSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
});
