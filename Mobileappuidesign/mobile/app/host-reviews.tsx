import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/contexts/AuthContext';
import { useHostReviews } from '@/src/features/reviews/hooks/useHostReviews';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  dark: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#2ECC71',
  warning: '#F59E0B',
  danger: '#EF4444',
};

const formatRelativeDate = (iso?: string | null) => {
  if (!iso) {
    return '';
  }
  const value = new Date(iso);
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  const now = new Date();
  const diffMs = now.getTime() - value.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) {
    return value.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (diffDays === 0) {
    return "Aujourd'hui";
  }
  if (diffDays === 1) {
    return 'Hier';
  }
  if (diffDays < 7) {
    const weekday = value.toLocaleDateString('fr-FR', { weekday: 'long' });
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }
  return value.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const renderStars = (rating: number) => (
  <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((value) => {
      const delta = rating - value + 1;
      let icon: 'star' | 'star-outline' | 'star-half-full' = 'star-outline';
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
          color={icon === 'star-outline' ? COLORS.border : COLORS.warning}
        />
      );
    })}
  </View>
);

export default function HostReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { supabaseProfile } = useAuth();
  const hostId = supabaseProfile?.id ?? null;

  const {
    reviews,
    averageRating,
    totalCount,
    pendingCount,
    isLoading,
    isRefreshing,
    error,
    refresh,
    submitReply,
  } = useHostReviews(hostId);

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sentStatus, setSentStatus] = useState<Record<string, boolean>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const isAndroid = Platform.OS === 'android';
  const topPadding = isAndroid ? Math.max(insets.top, 16) : Math.max(insets.top - 40, 2);

  useEffect(() => {
    if (!reviews.length) {
      setReplyDrafts({});
      setSentStatus({});
      return;
    }
    setReplyDrafts((prev) => {
      const next: Record<string, string> = {};
      reviews.forEach((review) => {
        next[review.id] = prev[review.id] ?? '';
      });
      return next;
    });
    setSentStatus((prev) => {
      const next: Record<string, boolean> = {};
      reviews.forEach((review) => {
        next[review.id] = review.ownerReply != null || prev[review.id] || false;
      });
      return next;
    });
  }, [reviews]);

  const averageDisplay = useMemo(() => {
    const safe = Number.isFinite(averageRating) ? averageRating : 0;
    return safe.toFixed(1);
  }, [averageRating]);

  const reviewCards = useMemo(() => {
    if (!reviews.length) {
      return [];
    }
    return reviews.map((review) => {
      const status: 'Nouveau' | 'Répondu' = review.ownerReply ? 'Répondu' : 'Nouveau';
      const timestamp = formatRelativeDate(review.createdAt);
      return {
        ...review,
        status,
        timestamp,
      };
    });
  }, [reviews]);

  const handleChangeDraft = useCallback((id: string, text: string) => {
    setReplyDrafts((prev) => ({ ...prev, [id]: text }));
  }, []);

  const handleSendReply = useCallback(async (id: string) => {
    const draft = replyDrafts[id]?.trim();
    if (!draft || submittingId) {
      return;
    }
    setSubmittingId(id);
    const success = await submitReply({ reviewId: id, content: draft });
    if (success) {
      setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
      setSentStatus((prev) => ({ ...prev, [id]: true }));
    }
    setSubmittingId(null);
  }, [replyDrafts, submitReply, submittingId]);

  const handleOpenListing = useCallback(
    (listingId: string | null) => {
      if (!listingId) {
        return;
      }
      router.push(`/property/${listingId}` as const);
    },
    [router],
  );

  const content = useMemo(() => {
    if (isLoading && !reviews.length) {
      return (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      );
    }

    if (!isLoading && !reviews.length) {
      return (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="star-outline" size={40} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>Aucun avis reçu pour le moment</Text>
          <Text style={styles.emptySubtitle}>
            Dès que vos voyageurs laisseront un avis, il apparaîtra automatiquement ici.
          </Text>
        </View>
      );
    }

    return reviewCards.map((review) => {
      const draft = replyDrafts[review.id] ?? '';
      const draftsTruncated = draft.trim();
      const isPendingReply = submittingId === review.id;
      const isActionEnabled = Boolean(draftsTruncated) && !isPendingReply;
      return (
        <TouchableOpacity
          key={review.id}
          style={styles.reviewCard}
          activeOpacity={0.85}
          onPress={() => handleOpenListing(review.listingId)}
        >
          <View style={styles.reviewHeader}>
            <View>
              <Text style={styles.clientName}>{review.authorName ?? 'Voyageur PUOL'}</Text>
              <Text style={styles.propertyName}>{review.listingTitle ?? 'Annonce PUOL'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.timestamp}>{review.timestamp}</Text>
              <View style={[styles.statusBadge, review.status === 'Nouveau' && styles.statusBadgeNew]}>
                <Text style={[styles.statusBadgeText, review.status === 'Nouveau' && styles.statusBadgeTextNew]}>
                  {review.status === 'Nouveau' && draft.trim().length
                    ? 'Brouillon'
                    : review.status}
                </Text>
              </View>
            </View>
          </View>
          {renderStars(review.rating)}
          {review.comment ? <Text style={styles.comment}>{review.comment}</Text> : null}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[
                styles.replyButton,
                isActionEnabled && styles.replyButtonActive,
                !isActionEnabled && styles.replyButtonDisabled,
              ]}
              activeOpacity={0.9}
              onPress={() => handleSendReply(review.id)}
              disabled={!isActionEnabled}
            >
              <Feather
                name="message-square"
                size={14}
                color={isActionEnabled ? '#FFFFFF' : COLORS.accent}
              />
              <Text style={[styles.replyText, isActionEnabled && styles.replyTextActive]}>
                {review.ownerReply ? 'Mettre à jour la réponse' : 'Répondre'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.replyInputContainer}>
            <TextInput
              style={styles.replyInput}
              placeholder="Répondez au client..."
              placeholderTextColor={COLORS.muted}
              multiline
              value={draft}
              onChangeText={(text) => handleChangeDraft(review.id, text)}
            />
            {isPendingReply ? (
              <Text style={styles.sendingHint}>Envoi en cours…</Text>
            ) : sentStatus[review.id] || review.ownerReply ? (
              <Text style={styles.sentHint}>Réponse envoyée • avis mis à jour</Text>
            ) : null}
            {review.ownerReply ? (
              <Text style={styles.ownerReplyPreview} numberOfLines={2}>
                Votre réponse actuelle : {review.ownerReply.content}
              </Text>
            ) : null}
          </View>
        </TouchableOpacity>
      );
    });
  }, [isLoading, reviews.length, reviewCards, replyDrafts, submittingId, handleSendReply, sentStatus]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />
      <View
        style={[
          styles.headerWrapper,
          { paddingTop: topPadding },
          isAndroid && styles.headerWrapperAndroid,
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
          <View style={[styles.headerTextGroup, isAndroid && styles.headerTextGroupAndroid]}>
            <Text style={styles.headerTitle}>Avis reçus</Text>
            <Text style={styles.headerSubtitle}>Analysez vos retours voyageurs et répondez au bon moment</Text>
          </View>
          {isAndroid ? <View style={styles.headerSpacerAndroid} /> : <View style={{ width: 44 }} />}
        </View>
      </View>

      {error ? (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle" size={18} color={COLORS.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={COLORS.accent} />}
      >
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Note moyenne</Text>
            <View style={styles.summaryRatingRow}>
              <Text style={styles.summaryValue}>{averageDisplay}</Text>
              {renderStars(Number(averageDisplay))}
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryLabel}>Total d’avis</Text>
            <Text style={styles.summaryValue}>{totalCount}</Text>
            {pendingCount > 0 ? (
              <Text style={styles.summaryPending}>{pendingCount} avis sans réponse</Text>
            ) : null}
          </View>
        </View>

        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  headerWrapperAndroid: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
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
    marginRight: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTextGroupAndroid: {
    marginLeft: 4,
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
  headerSpacerAndroid: {
    width: 40,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  summaryValue: {
    fontFamily: 'Manrope',
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark,
  },
  summaryPending: {
    marginTop: 6,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
  },
  summaryDivider: {
    width: 1,
    height: 48,
    backgroundColor: COLORS.border,
  },
  reviewCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 20,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  clientName: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  propertyName: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
  timestamp: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusBadgeNew: {
    borderColor: 'rgba(46,204,113,0.4)',
    backgroundColor: 'rgba(46,204,113,0.08)',
  },
  statusBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  statusBadgeTextNew: {
    color: COLORS.accent,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  comment: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.12)',
  },
  replyButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: 'rgba(46,204,113,0.25)',
  },
  replyButtonDisabled: {
    opacity: 0.5,
  },
  replyText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  replyTextActive: {
    color: '#FFFFFF',
  },
  replyInputContainer: {
    marginTop: 12,
    gap: 8,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    minHeight: 60,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  sendingHint: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  sentHint: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  ownerReplyPreview: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  errorText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.danger,
    flex: 1,
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyState: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.dark,
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
