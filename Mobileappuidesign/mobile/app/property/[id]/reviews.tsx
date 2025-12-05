import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import type { ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import { useListingDetails } from '@/src/features/listings/hooks';
import { useListingReviews, type ListingReview } from '@/src/features/reviews/hooks/useListingReviews';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';
import type { FullListing } from '@/src/types/listings';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const REVIEW_FORM_RADIUS = 28;
const REVIEW_FORM_CARD_MAX_WIDTH = Math.min(SCREEN_WIDTH - 48, 400);

const formatReviewDate = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  if (diffMs < 0) {
    return parsed.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) {
    return "Aujourd'hui";
  }
  if (diffDays === 1) {
    return 'Il y a 1 jour';
  }
  if (diffDays < 7) {
    return `Il y a ${diffDays} jours`;
  }
  if (diffDays === 7) {
    return 'Il y a une semaine';
  }

  return parsed.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatMemberTenure = (joinedAt: string | null): string | null => {
  if (!joinedAt) {
    return null;
  }

  const joinedDate = new Date(joinedAt);
  if (Number.isNaN(joinedDate.getTime())) {
    return null;
  }

  const formatTenureUnit = (count: number, singular: string, plural: string) => {
    return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
  };

  const now = new Date();
  const diffMs = now.getTime() - joinedDate.getTime();
  if (diffMs <= 0) {
    return 'Activité très récente sur PUOL';
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 60) {
    return `${formatTenureUnit(diffMinutes, 'minute', 'minutes')} d’activité sur PUOL`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${formatTenureUnit(diffHours, 'heure', 'heures')} d’activité sur PUOL`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${formatTenureUnit(diffDays, 'jour', 'jours')} d’activité sur PUOL`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return `${formatTenureUnit(diffWeeks, 'semaine', 'semaines')} d’activité sur PUOL`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return `${formatTenureUnit(diffMonths, 'mois', 'mois')} d’activité sur PUOL`;
  }

  const diffYears = Math.floor(diffDays / 365);
  if (diffYears < 10) {
    return `${formatTenureUnit(diffYears, 'an', 'ans')} d’activité sur PUOL`;
  }

  return 'Plus de 10 ans d’activité sur PUOL';
};

type SortOption = 'pertinents' | 'recents' | 'haute' | 'basse';

const SORT_OPTION_LABELS: Record<SortOption, string> = {
  pertinents: 'Les plus pertinents',
  recents: 'Les plus récents',
  haute: 'Note la plus élevée',
  basse: 'Note la plus basse',
};

type RatingBreakdown = {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
};

type ListingReviewContext = {
  id: string;
  title: string;
  isFurnished: boolean;
  isShop: boolean;
  hostId: string | null;
};

const buildReviewContext = (full: FullListing): ListingReviewContext => {
  const listing = full.listing;
  const propertyType = (listing.property_type ?? '').toLowerCase();

  return {
    id: listing.id,
    title: listing.title,
    isFurnished: Boolean(listing.is_furnished),
    isShop: propertyType === 'boutique',
    hostId: full.hostProfile?.id ?? null,
  };
};

const parseParam = (param?: string | string[] | null): string | null => {
  if (!param) {
    return null;
  }
  return Array.isArray(param) ? param[0] ?? null : param;
};

const ListingReviewsRoute = () => {
  const params = useLocalSearchParams<{ id?: string | string[]; intent?: string | string[] }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const propertyIdParam = useMemo(() => parseParam(params?.id ?? null), [params?.id]);
  const intentParam = useMemo(() => parseParam(params?.intent ?? null), [params?.intent]);
  const { supabaseProfile } = useAuth();

  const {
    data: listingData,
    isLoading: isListingLoading,
    error: listingError,
  } = useListingDetails(propertyIdParam ?? null);

  const reviewContext = useMemo(
    () => (listingData ? buildReviewContext(listingData) : null),
    [listingData],
  );

  const effectiveListingId = reviewContext?.id ?? propertyIdParam;
  const reviewsFeatureEnabled = reviewContext ? reviewContext.isFurnished && !reviewContext.isShop : false;

  const {
    reviews,
    userReview,
    submitReview,
    eligibility,
    averageRating,
    totalCount: reviewsCount,
    isLoading: isReviewsLoading,
    isRefreshing: isRefreshingReviews,
    isSubmitting: isSubmittingReview,
    error: reviewsError,
    refresh: refreshReviews,
  } = useListingReviews(reviewsFeatureEnabled && effectiveListingId ? effectiveListingId : null, supabaseProfile?.id ?? null);

  const [sortOption, setSortOption] = useState<SortOption>('pertinents');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isReviewFormVisible, setReviewFormVisible] = useState(false);
  const [reviewDraft, setReviewDraft] = useState({ rating: userReview?.rating ?? 0, comment: userReview?.comment ?? '' });
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [ownerReplyState, setOwnerReplyState] = useState<{ visible: boolean; review: ListingReview | null }>({
    visible: false,
    review: null,
  });
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [ownerReplyDraft, setOwnerReplyDraft] = useState('');
  const [ownerReplyError, setOwnerReplyError] = useState<string | null>(null);
  const [isSubmittingOwnerReply, setIsSubmittingOwnerReply] = useState(false);

  const canShowReviewCTA = eligibility?.status !== 'no_booking' && eligibility?.status !== 'not_authenticated';
  const shouldDisplayFormPortal = isReviewFormVisible || ownerReplyState.visible;
  const formIdleLayout = useMemo<ViewStyle>(
    () => ({
      justifyContent: 'center',
      paddingTop: Math.max(insets.top + 36, 96),
      paddingBottom: Math.max(insets.bottom + 24, 56),
    }),
    [insets.bottom, insets.top],
  );
  const formKeyboardLayout = useMemo<ViewStyle>(
    () => ({
      justifyContent: 'flex-end',
      paddingBottom: Math.max(insets.bottom, 24),
      paddingTop: Math.max(insets.top, 12),
    }),
    [insets.bottom, insets.top],
  );
  const isHostUser = useMemo(
    () => Boolean(reviewContext?.hostId && supabaseProfile?.id && reviewContext.hostId === supabaseProfile.id),
    [reviewContext?.hostId, supabaseProfile?.id],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    setReviewDraft({ rating: userReview?.rating ?? 0, comment: userReview?.comment ?? '' });
  }, [userReview]);

  useEffect(() => {
    if (intentParam === 'write' && canShowReviewCTA) {
      setReviewError(null);
      setReviewDraft({ rating: userReview?.rating ?? 0, comment: userReview?.comment ?? '' });
      setReviewFormVisible(true);
    }
  }, [intentParam, canShowReviewCTA, userReview]);

  const ratingBreakdown = useMemo<RatingBreakdown>(() => {
    const buckets: RatingBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      const rounded = Math.round(Number(review.rating) || 0);
      if (rounded >= 1 && rounded <= 5) {
        buckets[rounded as keyof RatingBreakdown] += 1;
      }
    });
    return buckets;
  }, [reviews]);

  const ratingBarData = useMemo(() => {
    const total = Object.values(ratingBreakdown).reduce((acc, value) => acc + value, 0);
    return [5, 4, 3, 2, 1].map((score) => {
      const count = ratingBreakdown[score as keyof RatingBreakdown];
      const percentage = total > 0 ? (count / total) * 100 : 0;
      return { score, count, percentage };
    });
  }, [ratingBreakdown]);

  const averageRatingDisplay = useMemo(() => {
    const normalized = Number.isFinite(averageRating) ? averageRating : 0;
    return normalized.toFixed(1);
  }, [averageRating]);

  const orderedReviews = useMemo(() => {
    if (!reviews.length) return [] as typeof reviews;
    const mine = reviews.filter((review) => review.isMine);
    const others = reviews.filter((review) => !review.isMine);
    return [...mine, ...others];
  }, [reviews]);

  const sortedReviews = useMemo(() => {
    const base = [...orderedReviews];
    switch (sortOption) {
      case 'recents': {
        base.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
        break;
      }
      case 'haute': {
        base.sort((a, b) => b.rating - a.rating);
        break;
      }
      case 'basse': {
        base.sort((a, b) => a.rating - b.rating);
        break;
      }
      case 'pertinents':
      default:
        break;
    }
    return base;
  }, [orderedReviews, sortOption]);

  const openReviewForm = useCallback(() => {
    if (!canShowReviewCTA) {
      return;
    }
    setReviewDraft({ rating: userReview?.rating ?? 0, comment: userReview?.comment ?? '' });
    setReviewError(null);
    setReviewFormVisible(true);
  }, [canShowReviewCTA, userReview]);

  const closeReviewForm = useCallback(() => {
    setReviewFormVisible(false);
    setReviewError(null);
  }, []);

  const handleSubmitReview = useCallback(async () => {
    if (!effectiveListingId) {
      setReviewError('Annonce introuvable.');
      return;
    }
    if (reviewDraft.rating < 1) {
      setReviewError('Merci d’attribuer une note.');
      return;
    }
    const success = await submitReview({ rating: reviewDraft.rating, comment: reviewDraft.comment.trim() || null });
    if (!success) {
      setReviewError('Impossible d’enregistrer votre avis pour le moment.');
      return;
    }
    setReviewFormVisible(false);
    setReviewError(null);
    setReviewDraft({ rating: reviewDraft.rating, comment: reviewDraft.comment.trim() });
    await refreshReviews();
  }, [effectiveListingId, reviewDraft, submitReview, refreshReviews]);

  const handleOpenOwnerReply = useCallback(
    (review: ListingReview) => {
      if (!isHostUser) {
        return;
      }
      setOwnerReplyState({ visible: true, review });
      setOwnerReplyDraft(review.ownerReply?.content ?? '');
      setOwnerReplyError(null);
    },
    [isHostUser],
  );

  const closeOwnerReplyModal = useCallback(() => {
    setOwnerReplyState({ visible: false, review: null });
    setOwnerReplyDraft('');
    setOwnerReplyError(null);
    setIsSubmittingOwnerReply(false);
  }, []);

  const handleSubmitOwnerReply = useCallback(async () => {
    if (!effectiveListingId || !ownerReplyState.review) {
      setOwnerReplyError('Avis introuvable.');
      return;
    }
    const trimmed = ownerReplyDraft.trim();
    if (!trimmed.length) {
      setOwnerReplyError('Votre réponse ne peut pas être vide.');
      return;
    }
    try {
      setIsSubmittingOwnerReply(true);
      const { error } = await supabase
        .from('reviews')
        .update({ owner_reply: trimmed, owner_reply_at: new Date().toISOString() })
        .eq('id', ownerReplyState.review.id);
      if (error) {
        throw error;
      }
      closeOwnerReplyModal();
      await refreshReviews();
    } catch (error) {
      console.error('[ListingReviewsRoute] owner reply error', error);
      setOwnerReplyError('Impossible d’enregistrer la réponse pour le moment.');
      setIsSubmittingOwnerReply(false);
    }
  }, [effectiveListingId, ownerReplyState.review, ownerReplyDraft, refreshReviews, closeOwnerReplyModal]);

  const reviewsListHeader = useMemo(() => {
    const totalReviews = reviewsCount;
    const commentsTitle = `${totalReviews} commentaire${totalReviews > 1 ? 's' : ''}`;

    return (
      <View style={styles.reviewsListHeader}>
        <View style={[styles.reviewsInfoBubble, { marginTop: 8 }]}>
          <Ionicons name="information-circle" size={18} color="#2563EB" />
          <Text style={styles.reviewsInfoBubbleText}>Tous les avis sont vérifiés et validés avant publication</Text>
        </View>

        <View style={[styles.reviewsStatsGrid, { paddingTop: 10 }]}>
          <View style={styles.reviewsStatCard}>
            <View style={styles.reviewsStatHeader}>
              <Ionicons name="star" size={20} color="#1A1A1A" />
              <View style={styles.reviewsStatHeaderText}>
                <Text style={styles.reviewsStatValue}>{averageRatingDisplay}</Text>
                <Text style={styles.reviewsStatSubtext}>{totalReviews} avis</Text>
              </View>
            </View>
            <View style={styles.reviewsRatingBars}>
              {ratingBarData.map(({ score, percentage }) => (
                <View key={`rating-bar-${score}`} style={styles.reviewsRatingBarRow}>
                  <Text style={styles.reviewsRatingBarLabel}>{score}</Text>
                  <View style={styles.reviewsRatingBarTrack}>
                    <View style={[styles.reviewsRatingBarFill, { width: `${percentage}%` }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={[styles.reviewsCommentsHeader, { marginTop: 20 }]}>
          <Text style={styles.reviewsCommentsTitle}>{commentsTitle}</Text>
          <TouchableOpacity
            style={styles.reviewsSortButton}
            onPress={() => setShowSortMenu((prev) => !prev)}
            activeOpacity={0.7}
          >
            <Text style={styles.reviewsSortButtonText}>{SORT_OPTION_LABELS[sortOption]}</Text>
            <Ionicons name={showSortMenu ? 'chevron-up' : 'chevron-down'} size={16} color="#1A1A1A" />
          </TouchableOpacity>
        </View>

        {showSortMenu ? (
          <View style={styles.reviewsSortMenu}>
            {(Object.keys(SORT_OPTION_LABELS) as SortOption[]).map((option) => (
              <TouchableOpacity
                key={option}
                style={[styles.reviewsSortMenuItem, sortOption === option && styles.reviewsSortMenuItemActive]}
                onPress={() => {
                  setSortOption(option);
                  setShowSortMenu(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.reviewsSortMenuItemText}>{SORT_OPTION_LABELS[option]}</Text>
                {sortOption === option && (
                  <View style={styles.reviewsSortMenuCheck}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </View>
    );
  }, [averageRatingDisplay, ratingBarData, reviewsCount, showSortMenu, sortOption]);

  const reviewsListFooter = useMemo(
    () => (
      <View style={styles.reviewsFooter}>
        <View style={styles.reviewsConditionsBox}>
          <Text style={styles.reviewsConditionsText}>
            {'Seuls les utilisateurs connectés ayant réellement séjourné dans le logement peuvent laisser un avis.'}
          </Text>
        </View>
        <View style={styles.reviewsGuidelinesBox}>
          <View style={styles.reviewsGuidelineHeader}>
            <Ionicons name="information-circle-outline" size={20} color="#2ECC71" />
            <Text style={styles.reviewsGuidelineTitle}>Conseils pour un bon avis</Text>
          </View>
          <Text style={styles.reviewsGuidelineText}>
            {'• Soyez honnête et précis\n• Mentionnez les points positifs et négatifs\n• Évitez le langage offensant\n• Vos avis aident la communauté PUOL'}
          </Text>
        </View>
        <View style={{ height: 40 }} />
      </View>
    ),
    [],
  );

  const renderReviewItem = useCallback(
    ({ item }: { item: ListingReview }) => {
      const createdAtLabel = formatReviewDate(item.createdAt) ?? item.createdAt ?? '';
      const joinedAtLabel = formatMemberTenure(item.authorJoinedAt);
      const ownerReplyDate = formatReviewDate(item.ownerReply?.createdAt) ?? item.ownerReply?.createdAt ?? '';

      return (
        <View style={styles.reviewCard}>
          <View style={styles.reviewHeaderRow}>
            <View style={styles.reviewAuthorBlock}>
              <View style={styles.reviewAvatar}>
                {item.authorAvatarUrl ? (
                  <Image
                    source={{ uri: item.authorAvatarUrl }}
                    style={styles.reviewAvatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Feather name="user" size={20} color="#6B7280" />
                )}
              </View>
              <View>
                <View style={styles.reviewNameRow}>
                  <Text style={styles.reviewAuthor}>{item.authorName ?? 'Voyageur PUOL'}</Text>
                  {item.isMine && (
                    <View style={styles.reviewMineBadge}>
                      <Text style={styles.reviewMineBadgeText}>Votre avis</Text>
                    </View>
                  )}
                </View>
                {joinedAtLabel ? <Text style={styles.reviewTenure}>{joinedAtLabel}</Text> : null}
                {createdAtLabel ? <Text style={styles.reviewDate}>{`Publié · ${createdAtLabel}`}</Text> : null}
              </View>
            </View>
            <View style={styles.reviewRatingStars}>
              {[1, 2, 3, 4, 5].map((value) => {
                const delta = item.rating - value + 1;
                let icon: 'star' | 'star-half-full' | 'star-outline' = 'star-outline';
                if (delta >= 1) {
                  icon = 'star';
                } else if (delta >= 0.5) {
                  icon = 'star-half-full';
                }
                return (
                  <MaterialCommunityIcons
                    key={`review-star-${item.id}-${value}`}
                    name={icon}
                    size={16}
                    color="#F59E0B"
                  />
                );
              })}
            </View>
          </View>
          {item.comment ? <Text style={styles.reviewContent}>{item.comment}</Text> : null}
          {item.ownerReply && (
            <View style={styles.reviewOwnerReply}>
              <Text style={styles.reviewOwnerReplyTitle}>Réponse de l’hôte</Text>
              {ownerReplyDate ? <Text style={styles.reviewOwnerReplyDate}>{ownerReplyDate}</Text> : null}
              <Text style={styles.reviewOwnerReplyText}>{item.ownerReply.content}</Text>
            </View>
          )}
          <View style={styles.reviewActionsRow}>
            {item.isMine && canShowReviewCTA ? (
              <TouchableOpacity style={styles.reviewActionButton} onPress={openReviewForm} activeOpacity={0.75}>
                <Feather name="edit-3" size={16} color="#1A1A1A" />
                <Text style={styles.reviewActionText}>{userReview ? 'Modifier mon avis' : 'Laisser un avis'}</Text>
              </TouchableOpacity>
            ) : null}
            {isHostUser && !item.isMine ? (
              <TouchableOpacity
                style={styles.reviewActionButton}
                onPress={() => handleOpenOwnerReply(item)}
                activeOpacity={0.75}
              >
                <Feather name="message-square" size={16} color="#1A1A1A" />
                <Text style={styles.reviewActionText}>{item.ownerReply ? 'Modifier la réponse' : 'Répondre à cet avis'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      );
    },
    [canShowReviewCTA, handleOpenOwnerReply, isHostUser, openReviewForm, userReview],
  );

  const renderEmptyState = useMemo(
    () => (
      <View style={styles.reviewsEmptyState}>
        <MaterialCommunityIcons name="star-off" size={42} color="#9CA3AF" />
        {reviewsError ? (
          <Text style={styles.reviewsEmptyText}>{reviewsError}</Text>
        ) : isReviewsLoading ? (
          <Text style={styles.reviewsEmptyText}>Chargement des avis…</Text>
        ) : (
          <Text style={styles.reviewsEmptyText}>Aucun avis pour le moment.</Text>
        )}
        {canShowReviewCTA ? (
          <TouchableOpacity style={styles.reviewsEmptyCta} onPress={openReviewForm} activeOpacity={0.85}>
            <Feather name="edit-3" size={16} color="#FFFFFF" />
            <Text style={styles.reviewsEmptyCtaText}>{userReview ? 'Modifier mon avis' : 'Écrire un avis'}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    ),
    [canShowReviewCTA, isReviewsLoading, openReviewForm, reviewsError, userReview],
  );

  if (!propertyIdParam) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.emptyWrapper}>
          <Text style={styles.emptyTitle}>Annonce introuvable</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="chevron-left" size={18} color="#1A1A1A" />
            <Text style={styles.emptyButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (listingError) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.emptyWrapper}>
          <Text style={styles.emptyTitle}>Impossible de charger les avis</Text>
          <Text style={styles.emptySubtitle}>{listingError}</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="chevron-left" size={18} color="#1A1A1A" />
            <Text style={styles.emptyButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (reviewContext && !reviewsFeatureEnabled) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.emptyWrapper}>
          <Text style={styles.emptyTitle}>Les avis ne sont pas disponibles</Text>
          <Text style={styles.emptySubtitle}>
            Les avis sont réservés aux logements meublés hors boutiques.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.back()} activeOpacity={0.8}>
            <Feather name="chevron-left" size={18} color="#1A1A1A" />
            <Text style={styles.emptyButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <StatusBar style="dark" />

      <View style={[styles.reviewsHeader, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity style={styles.reviewsCloseButton} onPress={() => router.back()}>
          <Feather name="x" size={22} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.reviewsCommentsTitle}>Avis du logement</Text>
          {reviewContext?.title ? (
            <Text style={styles.reviewsSubtitle} numberOfLines={1}>
              {reviewContext.title}
            </Text>
          ) : null}
        </View>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        data={sortedReviews}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={styles.reviewsList}
        ListHeaderComponent={reviewsListHeader}
        ListFooterComponent={reviewsListFooter}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshingReviews}
            onRefresh={refreshReviews}
            tintColor="#2ECC71"
            colors={["#2ECC71"]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        renderItem={renderReviewItem}
      />

      {shouldDisplayFormPortal ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
          style={[styles.reviewFormPortal, isKeyboardVisible ? formKeyboardLayout : formIdleLayout]}
        >
          <TouchableWithoutFeedback onPress={ownerReplyState.visible ? closeOwnerReplyModal : closeReviewForm}>
            <View style={styles.reviewFormBackdrop} />
          </TouchableWithoutFeedback>

          <ScrollView
            bounces={false}
            contentContainerStyle={[
              styles.reviewFormScrollContainer,
              isKeyboardVisible ? { paddingTop: 12, paddingBottom: 0 } : { paddingVertical: 32 },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {isReviewFormVisible ? (
              <View style={styles.reviewFormCard}>
                <Text style={styles.reviewFormTitle}>{userReview ? 'Modifier mon avis' : 'Laisser un avis'}</Text>
                <View style={styles.reviewFormStarsRow}>
                  {[1, 2, 3, 4, 5].map((value) => {
                    const active = value <= reviewDraft.rating;
                    return (
                      <TouchableOpacity
                        key={`edit-star-${value}`}
                        style={styles.reviewFormStarButton}
                        onPress={() => setReviewDraft((prev) => ({ ...prev, rating: value }))}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons
                          name={active ? 'star' : 'star-outline'}
                          size={24}
                          color={active ? '#F59E0B' : '#CBD5F5'}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  placeholder="Partage ton expérience"
                  placeholderTextColor="#94A3B8"
                  multiline
                  style={styles.reviewFormTextarea}
                  value={reviewDraft.comment}
                  onChangeText={(text) => setReviewDraft((prev) => ({ ...prev, comment: text }))}
                />
                {reviewError ? <Text style={styles.reviewFormError}>{reviewError}</Text> : null}
                <View style={styles.reviewFormActions}>
                  <TouchableOpacity style={styles.reviewFormCancelButton} onPress={closeReviewForm} activeOpacity={0.7}>
                    <Text style={styles.reviewFormCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reviewFormSubmitButton, isSubmittingReview && styles.reviewFormSubmitButtonDisabled]}
                    onPress={handleSubmitReview}
                    disabled={isSubmittingReview}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reviewFormSubmitText}>
                      {isSubmittingReview ? 'Enregistrement…' : userReview ? 'Mettre à jour' : 'Envoyer'}
                    </Text>
                  </TouchableOpacity>
                </View>
                {eligibility?.status === 'no_booking' ? (
                  <Text style={styles.reviewFormHelperText}>
                    Seuls les voyageurs ayant séjourné dans ce logement peuvent publier un avis.
                  </Text>
                ) : null}
              </View>
            ) : null}

            {ownerReplyState.visible ? (
              <View style={styles.reviewFormCard}>
                <Text style={styles.reviewFormTitle}>Répondre à l’avis</Text>
                <TextInput
                  placeholder="Votre réponse en tant qu’hôte"
                  placeholderTextColor="#94A3B8"
                  multiline
                  style={styles.reviewFormTextarea}
                  value={ownerReplyDraft}
                  onChangeText={(text) => setOwnerReplyDraft(text)}
                />
                {ownerReplyError ? <Text style={styles.reviewFormError}>{ownerReplyError}</Text> : null}
                <View style={styles.reviewFormActions}>
                  <TouchableOpacity style={styles.reviewFormCancelButton} onPress={closeOwnerReplyModal} activeOpacity={0.7}>
                    <Text style={styles.reviewFormCancelText}>Annuler</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.reviewFormSubmitButton, isSubmittingOwnerReply && styles.reviewFormSubmitButtonDisabled]}
                    onPress={handleSubmitOwnerReply}
                    disabled={isSubmittingOwnerReply}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.reviewFormSubmitText}>
                      {isSubmittingOwnerReply ? 'Envoi…' : ownerReplyState.review?.ownerReply ? 'Mettre à jour' : 'Publier'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  reviewsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  reviewsSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  reviewsCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.05)',
  },
  reviewsCommentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  reviewsList: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 18,
  },
  reviewsListHeader: {
    gap: 18,
    paddingVertical: 12,
  },
  reviewsInfoBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  reviewsInfoBubbleText: {
    flex: 1,
    fontSize: 12,
    color: '#1D4ED8',
  },
  reviewsStatsGrid: {
    flexDirection: 'row',
  },
  reviewsStatCard: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.06)',
    backgroundColor: '#FFFFFF',
    padding: 18,
    gap: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  reviewsStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewsStatHeaderText: {
    gap: 2,
  },
  reviewsStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  reviewsStatSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },
  reviewsRatingBars: {
    gap: 8,
  },
  reviewsRatingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewsRatingBarLabel: {
    width: 14,
    textAlign: 'center',
    fontSize: 12,
    color: '#6B7280',
  },
  reviewsRatingBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  reviewsRatingBarFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#2ECC71',
  },
  reviewsCommentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewsSortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  reviewsSortButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  reviewsSortMenu: {
    marginTop: -4,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  reviewsSortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  reviewsSortMenuItemActive: {
    backgroundColor: '#F9FAFB',
  },
  reviewsSortMenuItemText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  reviewsSortMenuCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.06)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 18,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewAuthorBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reviewAvatarImage: {
    width: '100%',
    height: '100%',
  },
  reviewAuthor: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  reviewNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewMineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(46, 204, 113, 0.16)',
  },
  reviewMineBadgeText: {
    fontSize: 10,
    color: '#166534',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  reviewTenure: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  reviewDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
  },
  reviewRatingStars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  reviewContent: {
    fontSize: 14,
    lineHeight: 20,
    color: '#374151',
  },
  reviewOwnerReply: {
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(46, 204, 113, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46, 204, 113, 0.18)',
    gap: 6,
  },
  reviewOwnerReplyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
  },
  reviewOwnerReplyDate: {
    fontSize: 12,
    color: '#0F766E',
  },
  reviewOwnerReplyText: {
    fontSize: 13,
    color: '#064E3B',
    lineHeight: 18,
  },
  reviewActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  reviewActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  reviewActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  reviewsEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  reviewsEmptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  reviewsEmptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#2ECC71',
  },
  reviewsEmptyCtaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  reviewsFooter: {
    gap: 16,
    paddingVertical: 24,
  },
  reviewsConditionsBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  reviewsConditionsText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    textAlign: 'center',
  },
  reviewsGuidelinesBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    padding: 16,
    gap: 10,
  },
  reviewsGuidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewsGuidelineTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  reviewsGuidelineText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
  },
  reviewFormPortal: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  reviewFormBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  reviewFormScrollContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  reviewFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: REVIEW_FORM_RADIUS,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.08)',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 12,
    alignSelf: 'center',
    width: '100%',
    maxWidth: REVIEW_FORM_CARD_MAX_WIDTH,
  },
  reviewFormTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  reviewFormStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reviewFormStarButton: {
    padding: 3,
  },
  reviewFormTextarea: {
    minHeight: 110,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.45)',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
  },
  reviewFormError: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  reviewFormActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  reviewFormCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: REVIEW_FORM_RADIUS,
    backgroundColor: '#E2E8F0',
  },
  reviewFormCancelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
  },
  reviewFormSubmitButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: REVIEW_FORM_RADIUS,
    backgroundColor: '#2ECC71',
  },
  reviewFormSubmitButtonDisabled: {
    backgroundColor: '#86EFAC',
  },
  reviewFormSubmitText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewFormHelperText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  emptyWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  emptyButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
});

export default ListingReviewsRoute;
