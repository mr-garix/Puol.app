import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    month: 'long',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number | null) => `${Number(amount ?? 0).toLocaleString('fr-FR')} FCFA`;

const FALLBACK_PROPERTY_IMAGE =
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&auto=format&fit=crop&q=80';

export default function LandlordTenantDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { getTenantById, fetchTenant, isLoading } = useLandlordTenants();
  const [isFetching, setIsFetching] = useState(false);

  const tenant = id ? getTenantById(id) : undefined;

  useEffect(() => {
    if (!id) {
      router.replace('/landlord-tenants' as never);
      return;
    }
    if (tenant) {
      return;
    }
    setIsFetching(true);
    fetchTenant(id)
      .catch((error) => {
        console.error('[LandlordTenantDetails] unable to fetch tenant', error);
      })
      .finally(() => setIsFetching(false));
  }, [id, tenant, fetchTenant, router]);

  const leaseStatus = useMemo(() => {
    if (!tenant) {
      return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const leaseEnd = tenant.leaseEnd ? new Date(tenant.leaseEnd) : null;
    if (!leaseEnd || leaseEnd.getTime() >= today.getTime()) {
      return 'Bail en cours';
    }
    return 'Bail terminé';
  }, [tenant]);

  const isBusy = (isLoading || isFetching) && !tenant;

  const handleCall = () => {
    if (!tenant?.tenantPhone) return;
    Linking.openURL(`tel:${tenant.tenantPhone.replace(/\s+/g, '')}`);
  };

  const topInset = insets.top + 6;

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topInset }]}>
      <RNStatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={COLORS.dark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détails locataire</Text>
        <View style={{ width: 44 }} />
      </View>

      {isBusy ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.loadingText}>Chargement du locataire…</Text>
        </View>
      ) : tenant ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.topCard}>
            <View style={styles.avatarWrapper}>
              {tenant.tenantAvatar ? (
                <Image source={{ uri: tenant.tenantAvatar }} style={styles.avatarImage} />
              ) : (
                <Feather name="user" size={28} color={COLORS.muted} />
              )}
            </View>
            <Text style={styles.tenantName}>{tenant.tenantName}</Text>
            {tenant.tenantPhone ? (
              <TouchableOpacity style={styles.phoneBadge} onPress={handleCall} activeOpacity={0.85}>
                <Feather name="phone" size={14} color={COLORS.accent} />
                <Text style={styles.phoneBadgeText}>{tenant.tenantPhone}</Text>
              </TouchableOpacity>
            ) : null}
            {leaseStatus ? <Text style={styles.leaseStatus}>{leaseStatus}</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Bail signé</Text>
            <View style={styles.row}>
              <Feather name="calendar" size={16} color={COLORS.accent} />
              <Text style={styles.rowText}>
                {formatDate(tenant.leaseStart)} → {formatDate(tenant.leaseEnd)} ({tenant.leaseMonths}{' '}
                mois)
              </Text>
            </View>
            <View style={styles.row}>
              <MaterialCommunityIcons name="cash-multiple" size={18} color={COLORS.accent} />
              <Text style={styles.rowText}>Loyer mensuel : {formatCurrency(tenant.monthlyRent)}</Text>
            </View>
            <View style={styles.row}>
              <MaterialCommunityIcons name="bank" size={18} color={COLORS.accent} />
              <Text style={styles.rowText}>
                Caution : {tenant.depositAmount ? formatCurrency(tenant.depositAmount) : 'Non renseignée'}
              </Text>
            </View>
            <View style={styles.row}>
              <MaterialCommunityIcons name="calculator-variant" size={18} color={COLORS.accent} />
              <Text style={styles.rowText}>
                Loyer total :{' '}
                {formatCurrency((tenant.monthlyRent ?? 0) * (tenant.leaseMonths ?? 0))}
              </Text>
            </View>
            {tenant.notes ? (
              <View style={[styles.noteBox, { backgroundColor: 'rgba(4,120,87,0.08)' }]}>
                <Feather name="info" size={14} color={COLORS.accent} />
                <Text style={styles.noteText}>{tenant.notes}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Coordonnées</Text>
            {tenant.tenantPhone ? (
              <TouchableOpacity style={styles.actionRow} onPress={handleCall} activeOpacity={0.85}>
                <View style={[styles.actionIcon, { backgroundColor: 'rgba(4,120,87,0.12)' }]}>
                  <Feather name="phone" size={16} color={COLORS.accent} />
                </View>
                <Text style={styles.actionLabel}>{tenant.tenantPhone}</Text>
                <Feather name="external-link" size={16} color={COLORS.accent} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.rowText}>Téléphone non communiqué</Text>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Logement concerné</Text>
            <Image
              source={{ uri: tenant.propertyImage ?? FALLBACK_PROPERTY_IMAGE }}
              style={styles.propertyImage}
              resizeMode="cover"
            />
            <View style={styles.row}>
              <Feather name="home" size={16} color={COLORS.accent} />
              <Text style={styles.rowText}>{tenant.propertyTitle}</Text>
            </View>
            <View style={styles.row}>
              <Feather name="map-pin" size={16} color={COLORS.accent} />
              <Text style={styles.rowText}>{tenant.propertyAddress}</Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.loadingContainer}>
          <Feather name="alert-triangle" size={28} color={COLORS.accent} />
          <Text style={styles.loadingText}>Ce locataire n’existe plus ou n’est plus associé à vos baux.</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => router.replace('/landlord-tenants' as never)} activeOpacity={0.85}>
            <Text style={styles.retryText}>Retour à la liste</Text>
            <Feather name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },
  topCard: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surface,
    marginHorizontal: 20,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  leaseStatus: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(4,120,87,0.1)',
  },
  phoneBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 2,
  },
  sectionLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
  },
  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 14,
    padding: 12,
  },
  noteText: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.accent,
    lineHeight: 18,
  },
  propertyImage: {
    width: '100%',
    height: 160,
    borderRadius: 18,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
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
  retryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
