import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar as RNStatusBar,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useAuth } from '@/src/contexts/AuthContext';
import { useHostLikeActivities } from '@/src/features/likes/hooks';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatDistrictCity } from '@/src/utils/location';
import { Avatar } from '@/src/components/ui/Avatar';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  dark: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#2ECC71',
  successSoft: 'rgba(46, 204, 113, 0.12)',
  orangeSoft: 'rgba(251, 191, 36, 0.18)',
};

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200&auto=format&fit=crop&q=60';
const FALLBACK_LISTING = 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=800&auto=format&fit=crop&q=80';

const pluralizeLikes = (count: number) => `${count} like${count > 1 ? 's' : ''}`;

const formatGroupLabel = (input: Date) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(input.getFullYear(), input.getMonth(), input.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (diffDays === 0) {
    return "Aujourd'hui";
  }
  if (diffDays === 1) {
    return 'Hier';
  }

  return target.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
};

const formatRelativeTime = (input: Date) => {
  const now = Date.now();
  const value = input.getTime();
  if (Number.isNaN(value)) {
    return '';
  }

  let diffMs = now - value;
  if (diffMs <= 0) {
    return "À l'instant";
  }

  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) {
    return "À l'instant";
  }
  if (diffMinutes < 60) {
    return `Il y a ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `Il y a ${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    return 'Il y a 1 jour';
  }
  if (diffDays < 7) {
    return `Il y a ${diffDays} j`;
  }

  return input.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: input.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
};

const buildLikerName = (liker: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  enterpriseName: string | null;
}) => {
  const tokens = [liker.firstName, liker.lastName].filter((token) => token && token.trim());
  if (tokens.length) {
    return tokens.join(' ');
  }
  if (liker.username?.trim()) {
    return liker.username;
  }
  if (liker.enterpriseName?.trim()) {
    return liker.enterpriseName;
  }
  return 'Utilisateur PUOL';
};

const STORAGE_KEY_SEEN = '@host_like_seen_ids';

const buildListingLabel = (title?: string | null, city?: string | null, district?: string | null) => {
  const location = formatDistrictCity(district, city);
  return location ? `${title ?? 'Annonce PUOL'} • ${location}` : title ?? 'Annonce PUOL';
};

export default function HostLikesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const { supabaseProfile } = useAuth();
  const hostId = supabaseProfile?.id ?? null;
  const { activities, summary, isLoading } = useHostLikeActivities(hostId);
  const [seenLikeIds, setSeenLikeIds] = useState<Set<string>>(new Set());
  const [seenLoaded, setSeenLoaded] = useState(false);
  const sessionSeenRef = useRef<Set<string>>(new Set());

  const topPadding = isAndroid ? Math.max(insets.top, 16) : Math.max(insets.top - 40, 2);
  const likedListingCount = useMemo(() => Object.keys(summary.byListing ?? {}).length, [summary.byListing]);
  const latestActivity = activities[0] ?? null;
  const latestRelative = latestActivity ? formatRelativeTime(new Date(latestActivity.createdAt)) : 'En attente de likes…';

  const groupedActivities = useMemo(() => {
    const buckets: { label: string; items: typeof activities }[] = [];
    const lookup: Record<string, typeof activities> = {};

    activities.forEach((activity) => {
      const label = formatGroupLabel(new Date(activity.createdAt));
      if (!lookup[label]) {
        lookup[label] = [];
        buckets.push({ label, items: lookup[label] });
      }
      lookup[label].push(activity);
    });

    return buckets;
  }, [activities]);

  useEffect(() => {
    const loadSeenLikes = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_SEEN);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          setSeenLikeIds(new Set(parsed));
        }
      } catch (error) {
        console.warn('[HostLikesScreen] Unable to load seen likes', error);
      } finally {
        setSeenLoaded(true);
      }
    };

    loadSeenLikes();
  }, []);

  const newLikeIds = useMemo(() => {
    if (!seenLoaded) {
      return new Set<string>();
    }

    const fresh = new Set<string>();
    activities.forEach((activity) => {
      if (!seenLikeIds.has(activity.id)) {
        fresh.add(activity.id);
      }
    });
    return fresh;
  }, [activities, seenLikeIds, seenLoaded]);

  useEffect(() => {
    if (!seenLoaded || newLikeIds.size === 0) {
      return;
    }
    sessionSeenRef.current = new Set([...sessionSeenRef.current, ...Array.from(newLikeIds)]);
  }, [newLikeIds, seenLoaded]);

  useEffect(() => {
    return () => {
      if (!seenLoaded) {
        return;
      }

      const stored = new Set(seenLikeIds);
      activities.forEach((activity) => {
        stored.add(activity.id);
      });
      sessionSeenRef.current.forEach((id) => stored.add(id));

      AsyncStorage.setItem(STORAGE_KEY_SEEN, JSON.stringify(Array.from(stored))).catch((error) => {
        console.warn('[HostLikesScreen] Unable to persist seen likes', error);
      });
    };
  }, [activities, seenLikeIds, seenLoaded]);

  const handleNavigateBack = () => {
    router.back();
  };

  const handleOpenListing = (listingId?: string | null) => {
    if (!listingId) {
      return;
    }
    router.push({ pathname: '/property/[id]', params: { id: listingId } } as never);
  };

  const renderActivityCard = (activity: (typeof activities)[number]) => {
    const likerName = buildLikerName(activity.liker);
    const relativeTime = formatRelativeTime(new Date(activity.createdAt));
    const listingLabel = buildListingLabel(activity.listingTitle, activity.listingCity, activity.listingDistrict);
    const shouldShowBadge = newLikeIds.has(activity.id);

    return (
      <TouchableOpacity
        key={activity.id}
        style={styles.activityCard}
        activeOpacity={0.9}
        onPress={() => handleOpenListing(activity.listingId)}
      >
        <View style={styles.activityLeft}>
          <Avatar
            source={activity.liker.avatarUrl ? { uri: activity.liker.avatarUrl } : undefined}
            name={buildLikerName(activity.liker)}
            size="large"
          />
          <View style={styles.activityContent}>
            <Text style={styles.activityTitle} numberOfLines={2}>
              <Text style={styles.activityActor}>{buildLikerName(activity.liker)}</Text> aime{' '}
              {activity.listingTitle ?? 'votre annonce'}
            </Text>
            <Text style={styles.activityMeta} numberOfLines={1}>
              {relativeTime} · {listingLabel}
            </Text>
          </View>
        </View>
        <View style={styles.activityRight}>
          <Image
            source={{ uri: activity.listingCoverPhotoUrl ?? FALLBACK_LISTING }}
            style={styles.thumbnail}
          />
          {shouldShowBadge ? (
            <View style={styles.badge}>
              <Feather name="heart" size={12} color="#FFFFFF" />
              <Text style={styles.badgeText} numberOfLines={1}>
                Nouveau like
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const showEmptyState = !isLoading && activities.length === 0;

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
            onPress={handleNavigateBack}
          >
            <Feather name="chevron-left" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={[styles.headerTextGroup, isAndroid && styles.headerTextGroupAndroid]}>
            <Text style={styles.headerTitle}>Likes reçus</Text>
            <Text style={styles.headerSubtitle}>Suivez l’engagement sur toutes vos annonces</Text>
          </View>
          {isAndroid ? <View style={styles.headerSpacerAndroid} /> : <View style={{ width: 44 }} />}
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Total cumulé</Text>
            <Text style={styles.summaryValue}>{pluralizeLikes(summary.total)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryDetails}>
            <View style={styles.summaryRow}>
              <Feather name="home" size={16} color="#059669" />
              <Text style={styles.summaryDetailText}>
                {likedListingCount > 0
                  ? `${likedListingCount} annonce${likedListingCount > 1 ? 's' : ''} ayant reçu des likes`
                  : 'Aucune annonce likée pour le moment'}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Feather name="activity" size={16} color="#D97706" />
              <Text style={styles.summaryDetailText}>{latestRelative}</Text>
            </View>
          </View>
        </View>

        {isLoading && activities.length === 0 ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.loadingLabel}>Chargement des likes…</Text>
          </View>
        ) : null}

        {showEmptyState ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="heart" size={30} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Aucun like pour l’instant</Text>
            <Text style={styles.emptySubtitle}>
              Dès qu’un voyageur aimera l’une de vos annonces, son profil et le logement concerné apparaîtront ici.
            </Text>
            <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={() => router.push('/host-listings' as never)}>
              <Text style={styles.ctaText}>Publier une nouvelle annonce</Text>
              <Feather name="arrow-up-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : null}

        {!showEmptyState && groupedActivities.length > 0 && (
          <View style={styles.activityList}>
            {groupedActivities.map((group) => (
              <View key={group.label} style={styles.groupSection}>
                <Text style={styles.groupLabel}>{group.label}</Text>
                <View style={{ gap: 12 }}>
                  {group.items.map((activity) => renderActivityCard(activity))}
                </View>
              </View>
            ))}
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 24,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
  summaryValue: {
    fontFamily: 'Manrope',
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.dark,
  },
  summaryDivider: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.border,
  },
  summaryDetails: {
    flex: 1,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryDetailText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.dark,
  },
  loadingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loadingLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
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
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.successSoft,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  ctaText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activityList: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 28,
  },
  groupSection: {
    gap: 14,
  },
  groupLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.muted,
    textTransform: 'capitalize',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  activityLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  activityContent: {
    flex: 1,
    gap: 4,
  },
  activityTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
  },
  activityActor: {
    fontWeight: '700',
  },
  activityMeta: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  activityRight: {
    width: 80,
    alignItems: 'flex-end',
    gap: 8,
  },
  thumbnail: {
    width: 80,
    height: 64,
    borderRadius: 14,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    minWidth: 108,
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  badgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
