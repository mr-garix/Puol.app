import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  dark: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#2ECC71',
  warning: '#F59E0B',
};

type ReviewItem = {
  id: string;
  client: string;
  property: string;
  rating: number;
  comment: string;
  timestamp: string;
  status: 'Nouveau' | 'Répondu';
};

const MOCK_REVIEWS: ReviewItem[] = [
  {
    id: 'review-1',
    client: 'Mélissa D.',
    property: 'Loft premium Bonapriso',
    rating: 5,
    comment: 'Appartement impeccable, merci pour la disponibilité.',
    timestamp: 'Hier',
    status: 'Nouveau',
  },
  {
    id: 'review-2',
    client: 'Samuel K.',
    property: 'Studio cosy Akwa',
    rating: 4,
    comment: 'Très propre, juste un petit souci de Wi-Fi.',
    timestamp: 'Dimanche',
    status: 'Répondu',
  },
];

export default function HostReviewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top - 40, 2);
  const [replyDrafts, setReplyDrafts] = React.useState<Record<string, string>>({});
  const [sentStatus, setSentStatus] = React.useState<Record<string, boolean>>({});
  const totalReviews = MOCK_REVIEWS.length;
  const averageRating = totalReviews
    ? MOCK_REVIEWS.reduce((sum, review) => sum + review.rating, 0) / totalReviews
    : 0;

  const handleChangeDraft = (id: string, text: string) => {
    setReplyDrafts((prev) => ({ ...prev, [id]: text }));
  };

  const handleSendReply = (id: string) => {
    const draft = replyDrafts[id]?.trim();
    if (!draft) {
      return;
    }
    setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
    setSentStatus((prev) => ({ ...prev, [id]: true }));
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={[styles.headerWrapper, { paddingTop: topPadding }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Feather name="chevron-left" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Avis reçus</Text>
            <Text style={styles.headerSubtitle}>Consultez et répondez aux retours clients</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Note moyenne</Text>
            <View style={styles.summaryRatingRow}>
              <Text style={styles.summaryValue}>{averageRating.toFixed(1)}</Text>
              {renderStars(averageRating)}
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryLabel}>Total d’avis</Text>
            <Text style={styles.summaryValue}>{totalReviews}</Text>
          </View>
        </View>

        {MOCK_REVIEWS.map((review) => (
          <TouchableOpacity key={review.id} style={styles.reviewCard} activeOpacity={0.85}>
            <View style={styles.reviewHeader}>
              <View>
                <Text style={styles.clientName}>{review.client}</Text>
                <Text style={styles.propertyName}>{review.property}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.timestamp}>{review.timestamp}</Text>
                <View style={[styles.statusBadge, review.status === 'Nouveau' && styles.statusBadgeNew]}>
                  <Text
                    style={[styles.statusBadgeText, review.status === 'Nouveau' && styles.statusBadgeTextNew]}
                  >
                    {review.status}
                  </Text>
                </View>
              </View>
            </View>
            {renderStars(review.rating)}
            <Text style={styles.comment}>{review.comment}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.replyButton, !replyDrafts[review.id]?.trim() && styles.replyButtonDisabled]}
                activeOpacity={0.9}
                onPress={() => handleSendReply(review.id)}
                disabled={!replyDrafts[review.id]?.trim()}
              >
                <Feather name="message-square" size={14} color={COLORS.accent} />
                <Text style={styles.replyText}>Répondre</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.replyInputContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Répondez au client..."
                placeholderTextColor={COLORS.muted}
                multiline
                value={replyDrafts[review.id] ?? ''}
                onChangeText={(text) => handleChangeDraft(review.id, text)}
              />
              {sentStatus[review.id] && <Text style={styles.sentHint}>Réponse envoyée • avis mis à jour</Text>}
            </View>
          </TouchableOpacity>
        ))}
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  replyButtonDisabled: {
    opacity: 0.5,
  },
  replyText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
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
  sentHint: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
});
