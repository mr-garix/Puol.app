import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';

import { STORAGE_KEYS } from '@/src/constants/storageKeys';
import { useReservations } from '@/src/contexts/ReservationContext';
import { useProfile } from '@/src/contexts/ProfileContext';

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
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  iconColor: string;
  countLabel: string;
  route: string;
}

export default function HostDashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reservations } = useReservations();
  const { profile } = useProfile();

  const [hostProfile, setHostProfile] = useState<HostProfileSnapshot | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending');

  useEffect(() => {
    const loadHostProfile = async () => {
      try {
        const [profileEntry, statusEntry] = await AsyncStorage.multiGet([
          STORAGE_KEYS.HOST_PROFILE,
          STORAGE_KEYS.HOST_VERIFICATION_STATUS,
        ]);

        if (profileEntry[1]) {
          try {
            setHostProfile(JSON.parse(profileEntry[1]));
          } catch (parseError) {
            console.warn('[HostDashboard] unable to parse host profile', parseError);
          }
        }

        if (statusEntry[1] === 'verified') {
          setVerificationStatus('verified');
        } else {
          setVerificationStatus('pending');
        }
      } catch (error) {
        console.warn('[HostDashboard] unable to load host data', error);
      }
    };

    loadHostProfile();
  }, []);

  useEffect(() => {
    if (!profile) {
      return;
    }
    if (profile.hostStatus === 'approved') {
      setVerificationStatus('verified');
    } else {
      setVerificationStatus('pending');
    }
  }, [profile]);

  const extractInventoryCount = (raw?: string) => {
    if (!raw) return 0;
    const matches = raw.match(/\d+/g);
    if (!matches || matches.length === 0) return 0;
    return Number(matches[matches.length - 1]);
  };

  const contextFullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : undefined;
  const contextBusinessName = profile?.enterpriseName?.trim();
  const hostName = contextFullName || hostProfile?.fullName || 'Votre profil hôte';
  const hostBusinessName = contextBusinessName || hostProfile?.businessName || hostName;
  const managedUnits = profile?.stats.listings ?? hostProfile?.inventoryCount ?? extractInventoryCount(hostProfile?.inventory) ?? 0;
  const typesCount = Math.max(profile?.stats.listings ?? 0, hostProfile?.furnishedTypes?.length ?? 0);
  const engagementStats = profile?.stats ?? hostProfile?.stats ?? { views: 0, likes: 0, comments: 0 };

  const quickStats = useMemo(
    () => [
      { label: 'Réservations reçues (total)', value: reservations.length.toString() },
      { label: 'Biens gérés', value: managedUnits.toString() },
    ],
    [reservations.length, managedUnits],
  );

  const dashboardSections: DashboardSection[] = useMemo(
    () => [
      {
        key: 'reservations',
        title: 'Réservations reçues',
        subtitle: 'Consultez vos réservations reçues',
        icon: 'calendar',
        tint: '#DCFCE7',
        iconColor: '#15803D',
        countLabel: `${reservations.length} réservation${reservations.length > 1 ? 's' : ''}`,
        route: '/host-reservations',
      },
      {
        key: 'listings',
        title: 'Mes annonces',
        subtitle: 'Suivez vos annonces publiées',
        icon: 'home',
        tint: '#E0F2FE',
        iconColor: '#0284C7',
        countLabel: `${typesCount} type${typesCount > 1 ? 's' : ''} de biens`,
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
        countLabel: '0 avis',
        route: '/host-reviews',
      },
    ],
    [reservations.length, typesCount],
  );

  const handleBack = () => {
    router.back();
  };

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

  const headerTopPadding = Math.max(insets.top - 40, 2);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={[styles.headerWrapper, { paddingTop: headerTopPadding }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.85}>
            <Feather name="chevron-left" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Tableau de bord</Text>
          <View style={{ width: 44 }} />
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>{profile?.hostStatus === 'approved' ? 'Hôte vérifié' : 'Hôte en attente de vérification'}</Text>
            <View
              style={[
                styles.statusBadge,
                verificationStatus === 'verified' ? styles.statusBadgeVerified : styles.statusBadgePending,
              ]}
            >
              <Feather
                name={verificationStatus === 'verified' ? 'check-circle' : 'clock'}
                size={14}
                color={verificationStatus === 'verified' ? '#15803D' : '#B45309'}
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  verificationStatus === 'verified' ? styles.statusBadgeTextVerified : styles.statusBadgeTextPending,
                ]}
              >
                {verificationStatus === 'verified' ? 'Hôte vérifié' : 'Hôte en attente de vérification'}
              </Text>
            </View>
          </View>

          <Text style={styles.summaryName}>{hostBusinessName}</Text>
          <Text style={styles.summaryCompany}>{hostName}</Text>
          <TouchableOpacity style={styles.financialButton} activeOpacity={0.85} onPress={handleOpenFinancials}>
            <View style={styles.financialButtonLeft}>
              <View style={styles.financialIconCircle}>
                <Feather name="credit-card" size={16} color="#047857" />
              </View>
              <View>
                <Text style={styles.financialButtonTitle}>Recettes & versements</Text>
                <Text style={styles.financialButtonSubtitle}>Suivre vos encaissements</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        <View style={styles.quickStatsContainer}>
          {quickStats.map((stat) => (
            <View key={stat.label} style={styles.quickStatCard}>
              <Text style={styles.quickStatValue}>{stat.value}</Text>
              <Text style={styles.quickStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.engagementStats}>
          <View style={styles.engagementStatCard}>
            <View style={[styles.engagementIconContainer, { backgroundColor: 'rgba(46, 204, 113, 0.12)' }]}>
              <Feather name="eye" size={22} color="#059669" />
            </View>
            <Text style={styles.engagementStatLabel}>Vues</Text>
            <Text style={styles.engagementStatValue}>
              {engagementStats.views >= 1000 ? `${(engagementStats.views / 1000).toFixed(1)}K` : engagementStats.views}
            </Text>
          </View>
          <TouchableOpacity style={styles.engagementStatCard} activeOpacity={0.85} onPress={handleOpenLikes}>
            <View style={[styles.engagementIconContainer, { backgroundColor: 'rgba(251, 191, 36, 0.18)' }]}>
              <Feather name="heart" size={22} color="#D97706" />
            </View>
            <Text style={styles.engagementStatLabel}>Likes</Text>
            <Text style={styles.engagementStatValue}>{engagementStats.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.engagementStatCard} activeOpacity={0.85} onPress={handleOpenComments}>
            <View style={[styles.engagementIconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.18)' }]}>
              <Feather name="message-square" size={22} color="#2563EB" />
            </View>
            <Text style={styles.engagementStatLabel}>Commentaires</Text>
            <Text style={styles.engagementStatValue}>{engagementStats.comments}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionList}>
          {dashboardSections.map((section) => (
            <TouchableOpacity
              key={section.key}
              style={styles.sectionCard}
              activeOpacity={0.85}
              onPress={() => handleSectionPress(section.route)}
            >
              <View style={[styles.sectionIconContainer, { backgroundColor: section.tint }]}> 
                <Feather name={section.icon} size={20} color={section.iconColor} />
              </View>
              <View style={styles.sectionContent}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionCount}>{section.countLabel}</Text>
                </View>
                <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
              </View>
              <Feather name="chevron-right" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
    gap: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FACC15',
  },
  statusBadgeVerified: {
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderColor: '#34D399',
  },
  statusBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadgeTextPending: {
    color: '#92400E',
  },
  statusBadgeTextVerified: {
    color: '#15803D',
  },
  summaryName: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryMeta: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: '#475467',
  },
  summaryCompany: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  summaryMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  inventoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  financialButton: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  financialButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  financialIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  financialButtonTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  financialButtonSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#047857',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  quickStatCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  quickStatValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickStatLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  engagementStats: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    marginHorizontal: 0,
    marginTop: 4,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 16,
  },
  engagementStatCard: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  engagementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engagementStatLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  engagementStatValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionList: {
    gap: 12,
  },
  sectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionContent: {
    flex: 1,
    gap: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  sectionCount: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#6B7280',
  },
  sectionSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
  },
});
