import React, { useMemo, useState } from 'react';
import {
  FlatList,
  ImageBackground,
  SafeAreaView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { getUserReviews, type UserReview } from '@/src/services/userReviews';

const PRIMARY = '#2ECC71';
const DARK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

export default function UserReviewsScreen() {
  const router = useRouter();
  const [reviews] = useState<UserReview[]>(() => getUserReviews());
  const averageRating = useMemo(() => {
    if (!reviews.length) {
      return 0;
    }
    const sum = reviews.reduce((acc, review) => acc + review.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }, [reviews]);

  const renderReviewCard = ({ item }: { item: UserReview }) => (
    <TouchableOpacity
      style={styles.reviewCard}
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: '/property/[id]', params: { id: item.propertyId } } as never)}
    >
      <ImageBackground source={{ uri: item.listingCover }} style={styles.reviewCover} imageStyle={styles.reviewCoverImage}>
        <View style={styles.reviewCoverOverlay}>
          <Text style={styles.reviewCoverTitle}>{item.listingTitle}</Text>
          <Text style={styles.reviewCoverLocation}>{item.listingLocation}</Text>
        </View>
      </ImageBackground>

      <View style={styles.reviewBody}>
        <View style={styles.reviewMetaRow}>
          <View style={styles.ratingPill}>
            <Feather name="star" size={14} color="#FACC15" />
            <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.reviewDate}>{item.createdAt}</Text>
        </View>
        <Text style={styles.reviewContent}>{item.content}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={DARK} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Mes avis</Text>
          <Text style={styles.headerSubtitle}>Tous les avis que vous avez laissés</Text>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Note moyenne</Text>
        <View style={styles.summaryRatingRow}>
          <Text style={styles.summaryRating}>{averageRating.toFixed(1)}</Text>
          <View style={styles.summaryStars}>
            {Array.from({ length: 5 }).map((_, index) => {
              const remaining = averageRating - index;
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
        <Text style={styles.summaryCount}>{reviews.length} avis publiés</Text>
      </View>

      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={renderReviewCard}
        showsVerticalScrollIndicator={false}
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
    backgroundColor: '#FFFFFF',
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
});
