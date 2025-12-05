import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  RefreshControl,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/contexts/AuthContext';
import { useUserReviews, type UserReview } from '@/src/features/reviews/hooks/useUserReviews';

const PRIMARY = '#2ECC71';
const DARK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const SURFACE = '#FFFFFF';
const FALLBACK_COVER = 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1200&h=800&fit=crop&q=70&auto=format';

const formatReviewDate = (value?: string | null) => {
  if (!value) {
    return '';
  }

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

export default function UserReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const { supabaseProfile } = useAuth();
  const userId = supabaseProfile?.id ?? null;

  const { reviews, averageRating, totalCount, isLoading, isRefreshing, error, refresh } = useUserReviews(userId);

  const averageRatingDisplay = useMemo(() => {
    const safe = Number.isFinite(averageRating) ? averageRating : 0;
    return safe.toFixed(1);
  }, [averageRating]);

  const reviewCountLabel = useMemo(() => {
    if (!totalCount) {
      return '0 avis publiés';
    }
    return `${totalCount} avis publié${totalCount > 1 ? 's' : ''}`;
  }, [totalCount]);

  const handleOpenListing = useCallback(
    (listingId: string) => {
      if (!listingId) {
        return;
      }
      router.push({ pathname: '/property/[id]', params: { id: listingId } } as never);
    },
    [router],
  );

  const renderReviewCard = useCallback(
    ({ item }: { item: UserReview }) => {
      const coverUri = item.listingCoverPhotoUrl ?? FALLBACK_COVER;
      const dateLabel = formatReviewDate(item.createdAt);

      return (
        <TouchableOpacity
          style={styles.reviewCard}
          activeOpacity={0.9}
          onPress={() => handleOpenListing(item.listingId)}
          disabled={!item.listingId}
        >
          <ImageBackground
            source={{ uri: coverUri }}
            style={styles.reviewCover}
            imageStyle={styles.reviewCoverImage}
          >
            <View style={styles.reviewCoverOverlay}>
              <Text style={styles.reviewCoverTitle} numberOfLines={2}>
                {item.listingTitle ?? 'Annonce PUOL'}
              </Text>
              {item.listingLocation ? (
                <Text style={styles.reviewCoverLocation} numberOfLines={1}>
                  {item.listingLocation}
                </Text>
              ) : null}
            </View>
          </ImageBackground>

          <View style={styles.reviewBody}>
            <View style={styles.reviewMetaRow}>
              <View style={styles.ratingPill}>
                <Feather name="star" size={14} color="#FACC15" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
              </View>
              <Text style={styles.reviewDate}>{dateLabel}</Text>
            </View>
            <Text style={styles.reviewContent}>
              {item.comment ?? 'Aucun commentaire ajouté pour cet avis.'}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [handleOpenListing],
  );

  const renderEmptyState = useCallback(() => {
    if (isLoading) {
      return null;
    }

    return (
      <View style={styles.emptyState}>
        <MaterialCommunityIcons name="star-outline" size={48} color={MUTED} />
        <Text style={styles.emptyStateTitle}>Aucun avis publié pour le moment</Text>
        <Text style={styles.emptyStateSubtitle}>
          Dès que tu laisseras un avis sur un logement, il s’affichera automatiquement ici.
        </Text>
      </View>
    );
  }, [isLoading]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />

      <View
        style={[
          styles.header,
          isAndroid && {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: 16,
            borderBottomWidth: 1,
            borderBottomColor: BORDER,
            backgroundColor: '#FFFFFF',
            justifyContent: 'space-between',
            gap: 0,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.navButton, isAndroid && styles.navButtonAndroid]}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Feather name="chevron-left" size={20} color={DARK} />
        </TouchableOpacity>
        <View style={[styles.headerTitleContainer, isAndroid && styles.headerTitleContainerAndroid]}>
          <Text style={styles.headerTitle}>Mes avis</Text>
          <Text style={styles.headerSubtitle}>Tous les avis que vous avez laissés</Text>
        </View>
        {isAndroid ? <View style={styles.headerSpacerAndroid} /> : null}
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Note moyenne</Text>
        <View style={styles.summaryRatingRow}>
          <Text style={styles.summaryRating}>{averageRatingDisplay}</Text>
          <View style={styles.summaryStars}>
            {Array.from({ length: 5 }).map((_, index) => {
              const remaining = Number(averageRatingDisplay) - index;
              let name: 'star' | 'star-half-full' | 'star-outline' = 'star-outline';
              let color = '#D1D5DB';
              if (remaining >= 1) {
                name = 'star';
                color = '#FACC15';
              } else if (remaining >= 0.5) {
                name = 'star-half-full';
                color = '#FACC15';
              }
              return (
                <MaterialCommunityIcons key={`summary-star-${index}`} name={name} size={20} color={color} />
              );
            })}
          </View>
        </View>
        <Text style={styles.summaryCount}>{reviewCountLabel}</Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderReviewCard}
        ListEmptyComponent={renderEmptyState}
        ListHeaderComponent={
          error ? (
            <View style={styles.errorBanner}>
              <MaterialCommunityIcons name="alert-circle" size={18} color="#DC2626" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={PRIMARY}
            colors={[PRIMARY]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          isLoading && reviews.length === 0 ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color={PRIMARY} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 14,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonAndroid: {
    borderWidth: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 12,
  },
  headerSpacerAndroid: {
    width: 40,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitleContainerAndroid: {
    marginLeft: 4,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: DARK,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  summaryCard: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.06)',
    gap: 8,
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
  },
  summaryRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  summaryRating: {
    fontFamily: 'Manrope',
    fontSize: 42,
    fontWeight: '700',
    color: DARK,
  },
  summaryStars: {
    flexDirection: 'row',
    gap: 6,
  },
  summaryCount: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 18,
  },
  reviewCard: {
    backgroundColor: SURFACE,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.05)',
  },
  reviewCover: {
    height: 150,
    width: '100%',
  },
  reviewCoverImage: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  reviewCoverOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  reviewCoverTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reviewCoverLocation: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#F9FAFB',
    marginTop: 2,
  },
  reviewBody: {
    padding: 16,
    gap: 10,
  },
  reviewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(250,204,21,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  ratingText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  reviewDate: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
  },
  reviewContent: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
    color: DARK,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyStateTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: DARK,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 24,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.25)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#991B1B',
  },
  loaderContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
