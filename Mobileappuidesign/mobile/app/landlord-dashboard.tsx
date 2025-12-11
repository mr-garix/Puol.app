import React, { useCallback, useEffect, useMemo } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useProfile } from '@/src/contexts/ProfileContext';
import { useLandlordVisits } from '@/src/features/rental-visits/hooks';
import { useLandlordDashboardListings } from '@/src/features/landlord-listings/dashboard-hooks';

const landlordSections = [
  {
    key: 'properties',
    title: 'Mes annonces',
    subtitle: 'Publie des biens (automatiquement non meublés)',
    icon: 'home' as const,
    tint: '#DCFCE7',
    iconColor: '#15803D',
  },
  {
    key: 'visits',
    title: 'Visites reçues',
    subtitle: 'Consulte les demandes de visite et planifie',
    icon: 'calendar' as const,
    tint: '#ECFDF5',
    iconColor: '#047857',
  },
  {
    key: 'tenants',
    title: 'Locataires',
    subtitle: 'Suis les dossiers et contrats signés',
    icon: 'users' as const,
    tint: '#F0FDF4',
    iconColor: '#16A34A',
  },
];

const LandlordDashboardScreen: React.FC = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { profile, isProfileLoading } = useProfile();
  const { visitsCount, isLoading: visitsLoading } = useLandlordVisits();
  const {
    data: landlordListings,
    isLoading: listingsLoading,
  } = useLandlordDashboardListings();

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (isProfileLoading) {
      return;
    }

    if (!profile || profile.role !== 'landlord' || profile.landlordStatus !== 'approved') {
      router.replace('/(tabs)/profile' as never);
    }
  }, [isProfileLoading, profile, router]);

  const displayName = useMemo(() => {
    if (!profile) {
      return 'Bailleur PUOL';
    }

    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    if (fullName.length > 1) {
      return fullName;
    }

    return profile.username || 'Bailleur PUOL';
  }, [profile]);

  const listingsCount = landlordListings?.length ?? profile?.stats.listings ?? 0;
  const isVerified = profile?.landlordStatus === 'approved';
  const summaryLabel = isVerified ? 'Bailleur vérifié' : 'Bailleur en attente de vérification';
  const visitsCountLabel = visitsLoading ? '· · ·' : `${visitsCount} visite${visitsCount > 1 ? 's' : ''}`;

  const aggregatedMetrics = useMemo(() => {
    const base = (landlordListings ?? []).reduce(
      (acc, item) => {
        acc.views += item.viewCount ?? 0;
        acc.likes += item.likeCount ?? 0;
        acc.comments += item.commentCount ?? 0;
        return acc;
      },
      { views: 0, likes: 0, comments: 0 },
    );

    if (base.views === 0 && base.likes === 0 && base.comments === 0 && (!landlordListings || landlordListings.length === 0)) {
      return {
        views: profile?.stats.views ?? 0,
        likes: profile?.stats.likes ?? 0,
        comments: profile?.stats.comments ?? 0,
      };
    }

    return base;
  }, [landlordListings, profile?.stats.comments, profile?.stats.likes, profile?.stats.views]);

  const totalViews = aggregatedMetrics.views;
  const totalLikes = aggregatedMetrics.likes;
  const commentsCount = aggregatedMetrics.comments;

  const formatMetricValue = useCallback((value: number) => value.toLocaleString('fr-FR'), []);

  const viewsDisplay = listingsLoading ? '· · ·' : formatMetricValue(totalViews);
  const likesDisplay = listingsLoading ? '· · ·' : formatMetricValue(totalLikes);
  const commentsDisplay = listingsLoading ? '· · ·' : formatMetricValue(commentsCount);

  const handleOpenLikes = () => {
    if (!isVerified) {
      return;
    }
    router.push('/landlord-likes' as never);
  };

  const handleOpenComments = () => {
    if (!isVerified) {
      return;
    }
    router.push('/landlord-comments' as never);
  };

  const handleSectionPress = (key: (typeof landlordSections)[number]['key']) => {
    if (key === 'properties') {
      router.push('/landlord-listings' as never);
      return;
    }
    if (key === 'visits') {
      router.push('/landlord-visits' as never);
      return;
    }
    if (key === 'tenants') {
      router.push('/landlord-tenants' as never);
    }
  };

  const sections = useMemo(
    () =>
      landlordSections.map((section) => {
        if (section.key === 'visits') {
          return {
            ...section,
            hint: visitsLoading ? 'Chargement…' : visitsCount === 0 ? 'Aucune visite planifiée' : visitsCountLabel,
          };
        }
        if (section.key === 'tenants') {
          return {
            ...section,
            hint: 'Suivi des baux signés',
          };
        }
        if (section.key === 'properties') {
          const label = listingsLoading
            ? 'Chargement…'
            : listingsCount === 0
              ? 'Aucune annonce publiée'
              : `${listingsCount} annonce${listingsCount > 1 ? 's' : ''}`;
          return {
            ...section,
            hint: label,
          };
        }
        return {
          ...section,
          hint: 'Disponible bientôt',
        };
      }),
    [listingsCount, listingsLoading, visitsCount, visitsCountLabel, visitsLoading],
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tableau de bord</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroSummaryLabel}>Bienvenue</Text>
            <View
              style={[
                styles.heroStatusBadge,
                isVerified ? styles.heroStatusBadgeVerified : styles.heroStatusBadgePending,
              ]}
            >
              <Feather
                name={isVerified ? 'check-circle' : 'clock'}
                size={14}
                color={isVerified ? '#15803D' : '#B45309'}
              />
              <Text
                style={[
                  styles.heroStatusBadgeText,
                  isVerified ? styles.heroStatusBadgeTextVerified : styles.heroStatusBadgeTextPending,
                ]}
              >
                {summaryLabel}
              </Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>{displayName}</Text>
          <Text style={styles.heroSubtitle}>Accès rapide pour piloter tes activités de bailleur.</Text>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{listingsCount}</Text>
              <Text style={styles.summaryLabel}>Biens</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>0</Text>
              <Text style={styles.summaryLabel}>Locataires</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{visitsLoading ? '· · ·' : visitsCount}</Text>
              <Text style={styles.summaryLabel}>Visites reçues</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <View style={styles.metricIconCircle}>
              <Feather name="eye" size={20} color="#047857" />
            </View>
            <Text style={styles.metricLabel}>Vues</Text>
            <Text style={styles.metricValue}>{viewsDisplay}</Text>
          </View>
          <TouchableOpacity
            style={[styles.metricCard, !isVerified && styles.metricCardDisabled]}
            activeOpacity={isVerified ? 0.85 : 1}
            onPress={isVerified ? handleOpenLikes : undefined}
          >
            <View style={styles.metricIconCircle}>
              <Feather name="heart" size={20} color="#EF4444" />
            </View>
            <Text style={styles.metricLabel}>Likes</Text>
            <Text style={styles.metricValue}>{likesDisplay}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.metricCard, !isVerified && styles.metricCardDisabled]}
            activeOpacity={isVerified ? 0.85 : 1}
            onPress={isVerified ? handleOpenComments : undefined}
          >
            <View style={styles.metricIconCircle}>
              <Feather name="message-circle" size={20} color="#0EA5E9" />
            </View>
            <Text style={styles.metricLabel}>Commentaires</Text>
            <Text style={styles.metricValue}>{commentsDisplay}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionList}>
          {sections.map((section) => (
            <TouchableOpacity
              key={section.key}
              style={styles.sectionCard}
              activeOpacity={0.85}
              onPress={() => handleSectionPress(section.key)}
            >
              <View style={[styles.sectionIconContainer, { backgroundColor: section.tint }]}>
                <Feather name={section.icon} size={20} color={section.iconColor} />
              </View>
              <View style={styles.sectionContent}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
                <View style={styles.sectionFooter}>
                  <Text style={styles.sectionHint}>{section.hint}</Text>
                  <Feather name="arrow-right" size={18} color="#1F2937" />
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 16,
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 44,
    height: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroSummaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  heroStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  heroStatusBadgeVerified: {
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderColor: '#34D399',
  },
  heroStatusBadgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FACC15',
  },
  heroStatusBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
  },
  heroStatusBadgeTextVerified: {
    color: '#15803D',
  },
  heroStatusBadgeTextPending: {
    color: '#92400E',
  },
  heroTitle: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  heroSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  summaryValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricCardDisabled: {
    opacity: 0.55,
  },
  metricIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  metricValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 12,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sectionCard: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
  },
  sectionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContent: {
    flex: 1,
    gap: 6,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#475569',
  },
  sectionFooter: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHint: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
  },
});

export default LandlordDashboardScreen;
