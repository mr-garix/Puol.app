import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/src/constants/storageKeys';
import { useAuth } from '@/src/contexts/AuthContext';
import { useProfile } from '@/src/contexts/ProfileContext';
import {
  HostDashboardHeader,
  HostQuickStats,
  HostDashboardSections,
  HostPendingOverlay,
} from '@/src/features/host/components';
import { useHostCommentThreads } from '@/src/features/comments/hooks';
import { useHostBookings, useHostViewStats } from '@/src/features/host/hooks';
import { useHostReviews } from '@/src/features/reviews/hooks/useHostReviews';
import { useHostLikeActivities } from '@/src/features/likes/hooks';
import { supabase } from '@/src/supabaseClient';

interface HostProfileSnapshot {
  fullName?: string;
  city?: string;
  businessName?: string;
  furnishedTypes?: string[];
  inventory?: string;
  inventoryCount?: number;
  stats?: {
    views: number;
    likes: number;
    comments: number;
  };
}

type VerificationStatus = 'pending' | 'verified';

type DashboardSectionKey = 'reservations' | 'listings' | 'visits' | 'messages' | 'reviews';

interface DashboardSection {
  key: DashboardSectionKey;
  title: string;
  subtitle: string;
  icon: keyof typeof import('@expo/vector-icons/Feather').default.glyphMap;
  tint: string;
  iconColor: string;
  countLabel: string;
  route: string;
}

export default function HostDashboardScreen() {
  const router = useRouter();
  const { supabaseProfile } = useAuth();
  const { bookings } = useHostBookings('dashboard');
  const { profile } = useProfile();
  const { totalCount: hostCommentsCount } = useHostCommentThreads(supabaseProfile?.id ?? null);
  const { summary: hostLikeSummary } = useHostLikeActivities(supabaseProfile?.id ?? null);
  const { total: hostViewsTotal, isLoading: areHostViewsLoading, hasLoaded: hasHostViewsLoaded } = useHostViewStats(
    supabaseProfile?.id ?? null,
  );
  const { totalCount: hostReviewsCount } = useHostReviews(supabaseProfile?.id ?? null);

  const [fallbackHostProfile, setFallbackHostProfile] = useState<HostProfileSnapshot | null>(null);
  const [fallbackVerificationStatus, setFallbackVerificationStatus] = useState<VerificationStatus>('pending');
  const [listingCount, setListingCount] = useState(0);
  const [listingCountLoaded, setListingCountLoaded] = useState(false);

  const contextBusinessName = profile?.enterpriseName?.trim().length ? profile?.enterpriseName : undefined;
  const hostName =
    buildFullName(profile?.firstName, profile?.lastName) ??
    profile?.username ??
    fallbackHostProfile?.fullName ??
    'Hôte PUOL';
  const hostBusinessName = contextBusinessName || fallbackHostProfile?.businessName || null;
  const fallbackListingCount = useMemo(() => {
    const inventoryFromSnapshot = fallbackHostProfile?.inventoryCount ?? extractInventoryCount(fallbackHostProfile?.inventory) ?? 0;
    return Math.max(profile?.stats.listings ?? 0, inventoryFromSnapshot, 0);
  }, [fallbackHostProfile?.inventory, fallbackHostProfile?.inventoryCount, profile?.stats.listings]);
  const managedUnits = listingCountLoaded ? listingCount : fallbackListingCount;

  const baseEngagementStats = profile?.stats ?? fallbackHostProfile?.stats ?? { views: 0, likes: 0, comments: 0 };
  const viewsFromHook = hasHostViewsLoaded ? hostViewsTotal : baseEngagementStats.views ?? 0;
  const viewsDisplay = areHostViewsLoading && !hasHostViewsLoaded ? baseEngagementStats.views ?? 0 : viewsFromHook;
  const engagementStats = {
    views: viewsDisplay,
    likes: hostLikeSummary.total ?? baseEngagementStats.likes ?? 0,
    comments: hostCommentsCount,
  };

  const verificationStatus: VerificationStatus = useMemo(() => {
    if (profile?.role === 'host') {
      if (profile.hostStatus === 'approved') {
        return 'verified';
      }
      if (profile.hostStatus === 'pending') {
        return 'pending';
      }
    }
    return fallbackVerificationStatus;
  }, [profile?.role, profile?.hostStatus, fallbackVerificationStatus]);

  const isPendingVerification = verificationStatus === 'pending';
  const totalReservationsCount = bookings.length;
  const listingsCountDisplay = managedUnits;

  const refreshListingCount = useCallback(async () => {
    const hostId = supabaseProfile?.id;
    if (!hostId) {
      setListingCount(0);
      setListingCountLoaded(true);
      return;
    }

    try {
      const { count, error } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('host_id', hostId);

      if (error) {
        throw error;
      }

      setListingCount(count ?? 0);
    } catch (error) {
      console.error('[HostDashboard] Unable to fetch listings count', error);
      setListingCount(0);
    } finally {
      setListingCountLoaded(true);
    }
  }, [supabaseProfile?.id]);

  useEffect(() => {
    setListingCountLoaded(false);
    refreshListingCount();
  }, [refreshListingCount]);

  useEffect(() => {
    const hostId = supabaseProfile?.id;
    if (!hostId) {
      return;
    }

    const channel = supabase
      .channel(`host-dashboard-listings-${hostId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings',
          filter: `host_id=eq.${hostId}`,
        },
        () => {
          refreshListingCount();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refreshListingCount, supabaseProfile?.id]);

  const dashboardSections: DashboardSection[] = useMemo(
    () => [
      {
        key: 'reservations',
        title: 'Réservations reçues',
        subtitle: 'Consultez vos réservations reçues',
        icon: 'calendar',
        tint: '#DCFCE7',
        iconColor: '#15803D',
        countLabel: `${totalReservationsCount} réservation${totalReservationsCount > 1 ? 's' : ''}`,
        route: '/host-reservations',
      },
      {
        key: 'listings',
        title: 'Mes annonces',
        subtitle: 'Suivez vos annonces publiées',
        icon: 'home',
        tint: '#E0F2FE',
        iconColor: '#0284C7',
        countLabel: `${listingsCountDisplay} annonce${listingsCountDisplay > 1 ? 's' : ''}`,
        route: '/host-listings',
      },
      {
        key: 'visits',
        title: 'Visites reçues',
        subtitle: 'Consultez vos visites reçues',
        icon: 'map-pin',
        tint: '#FEF3C7',
        iconColor: '#B45309',
        countLabel: '0 visite planifiée',
        route: '/host-visits',
      },
      {
        key: 'messages',
        title: 'Messages reçus',
        subtitle: 'Répondez aux clients',
        icon: 'message-circle',
        tint: '#F3E8FF',
        iconColor: '#7C3AED',
        countLabel: '0 message non lu',
        route: '/host-messages',
      },
      {
        key: 'reviews',
        title: 'Avis reçus',
        subtitle: 'Consultez et répondez aux avis',
        icon: 'star',
        tint: '#FFF7ED',
        iconColor: '#EA580C',
        countLabel: `${hostReviewsCount} avis`,
        route: '/host-reviews',
      },
    ],
    [hostReviewsCount, listingsCountDisplay, totalReservationsCount],
  );

  const handleSectionPress = (route: string) => {
    router.push(route as never);
  };

  const handleOpenFinancials = () => {
    router.push('/host-finances' as never);
  };

  const handleOpenLikes = () => {
    router.push('/host-likes' as never);
  };

  const handleOpenComments = () => {
    router.push('/host-comments' as never);
  };

  useEffect(() => {
    const loadHostProfile = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.HOST_PROFILE);
        if (raw) {
          const parsed = JSON.parse(raw) as HostProfileSnapshot;
          setFallbackHostProfile(parsed);
        }

        const statusEntry = await AsyncStorage.getItem(STORAGE_KEYS.HOST_VERIFICATION_STATUS);
        if (statusEntry) {
          const [status] = statusEntry.split('|');
          setFallbackVerificationStatus(status === 'verified' ? 'verified' : 'pending');
        }
      } catch (error) {
        console.warn('[HostDashboard] unable to load host data', error);
      }
    };

    loadHostProfile();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <HostDashboardHeader
          hostBusinessName={hostBusinessName}
          hostName={hostName}
          verificationStatus={verificationStatus}
          onOpenFinancials={handleOpenFinancials}
        />
        <HostQuickStats
          reservationsCount={totalReservationsCount}
          managedUnits={managedUnits}
          engagementStats={engagementStats}
          onOpenLikes={handleOpenLikes}
          onOpenComments={handleOpenComments}
          isPendingVerification={isPendingVerification}
        />
        <HostDashboardSections
          sections={dashboardSections}
          isPendingVerification={isPendingVerification}
          onSectionPress={handleSectionPress}
        />
        {isPendingVerification && <HostPendingOverlay />}
      </ScrollView>
    </SafeAreaView>
  );
}

const extractInventoryCount = (raw?: string) => {
  if (!raw) return 0;
  const matches = raw.match(/\d+/g);
  if (!matches || matches.length === 0) return 0;
  return parseInt(matches[0], 10);
};

const buildFullName = (firstName?: string, lastName?: string) => {
  const parts = [firstName, lastName].filter((token) => token && token.trim().length > 0) as string[];
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join(' ');
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    gap: 20,
  },
});
