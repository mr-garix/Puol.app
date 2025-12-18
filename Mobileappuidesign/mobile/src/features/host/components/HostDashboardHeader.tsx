import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface HostDashboardHeaderProps {
  hostBusinessName?: string | null;
  hostName?: string | null;
  verificationStatus: 'pending' | 'verified';
  onOpenFinancials: () => void;
}

export const HostDashboardHeader: React.FC<HostDashboardHeaderProps> = ({
  hostBusinessName,
  hostName,
  verificationStatus,
  onOpenFinancials,
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const headerTopPadding = isAndroid ? Math.max(insets.top, 16) : Math.max(insets.top - 40, 2);
  const displayBusinessName = hostBusinessName && hostBusinessName.trim().length > 0 ? hostBusinessName : 'Entreprise PUOL';
  const displayHostName = hostName && hostName.trim().length > 0 ? hostName : 'Hôte PUOL';

  const handleBack = () => {
    router.back();
  };

  const summaryStatusLabel = 'Bienvenue';

  return (
    <>
      <View
        style={[
          styles.headerWrapper,
          {
            paddingTop: headerTopPadding,
          },
          isAndroid && styles.headerWrapperAndroid,
        ]}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={[styles.backButton, isAndroid && styles.backButtonAndroid]}
            onPress={handleBack}
            activeOpacity={0.85}
          >
            <Feather name="chevron-left" size={22} color="#111827" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, isAndroid && styles.headerTitleAndroid]}>Tableau de bord</Text>
          {isAndroid ? <View style={styles.headerSpacerAndroid} /> : <View style={{ width: 44 }} />}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryLabel}>{summaryStatusLabel}</Text>
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

        <Text style={styles.summaryBusiness}>{displayBusinessName}</Text>
        <Text style={styles.summaryHost}>{displayHostName}</Text>

        <TouchableOpacity
          style={[styles.financialButton, verificationStatus === 'pending' && styles.disabledCard]}
          activeOpacity={verificationStatus === 'pending' ? 1 : 0.85}
          onPress={verificationStatus === 'pending' ? undefined : onOpenFinancials}
          disabled={verificationStatus === 'pending'}
        >
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
    </>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  headerWrapperAndroid: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
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
  backButtonAndroid: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    shadowOpacity: 0,
    elevation: 0,
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerTitleAndroid: {
    flex: 1,
    fontSize: 18,
    marginLeft: 4,
  },
  headerSpacerAndroid: {
    width: 40,
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
  summaryBusiness: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryHost: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
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
  disabledCard: {
    opacity: 0.5,
  },
});
