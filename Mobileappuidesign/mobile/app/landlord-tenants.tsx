import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

import { useLandlordTenants } from '@/src/features/landlord-tenants/hooks';
import { PUOL_COLORS } from '@/src/constants/theme';

const COLORS = {
  background: PUOL_COLORS.background,
  surface: PUOL_COLORS.surface,
  dark: PUOL_COLORS.dark,
  muted: PUOL_COLORS.muted,
  accent: PUOL_COLORS.primary,
  border: PUOL_COLORS.border,
};

const formatDate = (iso: string | null) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number | null) =>
  `${Number(amount ?? 0).toLocaleString('fr-FR')} FCFA`;

const FALLBACK_PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80';

export default function LandlordTenantsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { tenants, isLoading, error, refresh } = useLandlordTenants();
  const [activeTab, setActiveTab] = useState<'current' | 'past'>('current');

  const topPadding = insets.top + 6;

  const summary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tenants.reduce(
      (acc, tenant) => {
        const leaseEnd = tenant.leaseEnd ? new Date(tenant.leaseEnd) : null;
        if (!leaseEnd || leaseEnd.getTime() >= today.getTime()) {
          acc.current += 1;
        } else {
          acc.past += 1;
        }
        return acc;
      },
      { total: tenants.length, current: 0, past: 0 },
    );
  }, [tenants]);

  const filteredTenants = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return tenants.filter((tenant) => {
      const leaseEnd = tenant.leaseEnd ? new Date(tenant.leaseEnd) : null;
      if (activeTab === 'current') {
        if (!leaseEnd) return true;
        return leaseEnd.getTime() >= today.getTime();
      }
      if (!leaseEnd) return false;
      return leaseEnd.getTime() < today.getTime();
    });
  }, [tenants, activeTab]);

  const contentState = useMemo(() => {
    if (isLoading && tenants.length === 0) return 'loading';
    if (error && tenants.length === 0) return 'error';
    if (tenants.length === 0) return 'empty';
    if (filteredTenants.length === 0) return 'no-filter';
    return 'list';
  }, [isLoading, tenants.length, filteredTenants.length, error]);

  const renderContent = () => {
    switch (contentState) {
      case 'loading':
        return (
          <View style={styles.feedbackCard}>
            <ActivityIndicator color={COLORS.accent} />
            <Text style={styles.feedbackTitle}>Chargement des locataires…</Text>
          </View>
        );
      case 'error':
        return (
          <View style={styles.feedbackCard}>
            <Feather name="alert-triangle" size={28} color={COLORS.accent} />
            <Text style={styles.feedbackTitle}>Impossible de charger vos locataires</Text>
            <Text style={styles.feedbackSubtitle}>Vérifiez votre connexion et réessayez.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refresh} activeOpacity={0.85}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
              <Feather name="refresh-cw" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        );
      case 'empty':
        return (
          <View style={styles.feedbackCard}>
            <Feather name="users" size={28} color={COLORS.accent} />
            <Text style={styles.feedbackTitle}>Aucun locataire enregistré</Text>
            <Text style={styles.feedbackSubtitle}>
              Dès qu’un bail est signé, vous retrouverez ici un résumé des informations clés ainsi que la durée du contrat.
            </Text>
          </View>
        );
      case 'no-filter':
        return (
          <View style={styles.feedbackCard}>
            <Feather name="search" size={28} color={COLORS.muted} />
            <Text style={styles.feedbackTitle}>Aucun locataire pour ce type de bail</Text>
            <Text style={styles.feedbackSubtitle}>Les contrats apparaîtront ici dès qu’ils seront disponibles.</Text>
          </View>
        );
      default:
        return (
          <View style={styles.listContainer}>
            {filteredTenants.map((tenant) => {
              return (
                <TouchableOpacity
                  key={tenant.id}
                  style={styles.card}
                  activeOpacity={0.9}
                  onPress={() => router.push(`/landlord-tenant/${tenant.id}` as never)}
                >
                  <Image
                    source={{ uri: tenant.propertyImage ?? FALLBACK_PROPERTY_IMAGE }}
                    style={styles.listingImage}
                    resizeMode="cover"
                  />
                  <View style={styles.cardHeader}>
                    <View style={styles.tenantInfo}>
                      <View style={styles.avatar}>
                        {tenant.tenantAvatar ? (
                          <Image style={styles.avatarImage} source={{ uri: tenant.tenantAvatar }} />
                        ) : (
                          <Feather name="user" size={18} color={COLORS.muted} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.tenantName}>{tenant.tenantName}</Text>
                        {tenant.tenantUsername ? (
                          <Text style={styles.tenantHandle}>{tenant.tenantUsername}</Text>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Feather name="home" size={14} color={COLORS.accent} />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {tenant.propertyTitle}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Feather name="calendar" size={14} color={COLORS.accent} />
                    <Text style={styles.detailText}>
                      {formatDate(tenant.leaseStart)} → {formatDate(tenant.leaseEnd)} ({tenant.leaseMonths}{' '}
                      mois)
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <MaterialCommunityIcons name="cash-multiple" size={16} color={COLORS.accent} />
                    <Text style={styles.detailText}>Loyer mensuel : {formatCurrency(tenant.monthlyRent)}</Text>
                  </View>
                  {tenant.tenantPhone ? (
                    <View style={styles.detailRow}>
                      <Feather name="phone" size={14} color={COLORS.accent} />
                      <Text style={styles.detailText}>{tenant.tenantPhone}</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }]}>
      <RNStatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Locataires</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isLoading && tenants.length > 0} onRefresh={refresh} tintColor={COLORS.accent} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Baux en cours</Text>
            <Text style={styles.summaryValue}>{summary.current}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View>
            <Text style={styles.summaryLabel}>Baux terminés</Text>
            <Text style={styles.summaryValue}>{summary.past}</Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          {(['current', 'past'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.85}
              >
                <Text style={[styles.tabButtonLabel, isActive && styles.tabButtonLabelActive]}>
                  {tab === 'current' ? 'Baux en cours' : 'Baux terminés'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 3,
  },
  headerTitle: {
    flex: 1,
    marginHorizontal: 12,
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 18,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.dark,
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.border,
    opacity: 0.5,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  tabButtonActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(4,120,87,0.12)',
  },
  tabButtonLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  tabButtonLabelActive: {
    color: COLORS.accent,
  },
  feedbackCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 14,
  },
  feedbackTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
  },
  feedbackSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  retryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  listContainer: {
    gap: 16,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  listingImage: {
    width: '100%',
    height: 140,
    borderRadius: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tenantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  tenantName: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  tenantHandle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
});
