import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth } from '@/src/contexts/AuthContext';
import { useProfile } from '@/src/contexts/ProfileContext';
import { PUOL_COLORS } from '@/src/constants/theme';

const COLORS = {
  primary: PUOL_COLORS.primary,
  primaryLight: PUOL_COLORS.primaryLight,
  primaryDark: PUOL_COLORS.primaryDark,
  dark: PUOL_COLORS.dark,
  muted: PUOL_COLORS.muted,
  border: PUOL_COLORS.border,
  surface: PUOL_COLORS.surface,
  background: PUOL_COLORS.background,
  success: PUOL_COLORS.success,
  successBg: PUOL_COLORS.successBg,
  warning: PUOL_COLORS.warning,
  warningBg: PUOL_COLORS.warningBg,
};

type RoleCardState = 'approved' | 'pending' | 'none';

type RoleCardConfig = {
  key: 'host' | 'landlord';
  title: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  accentColor: string;
  accentSoftColor: string;
  state: RoleCardState;
  statusLabel?: string;
  description: string;
  actionLabel?: string;
  actionKind?: 'filled' | 'outline';
  onActionPress?: () => void;
  pendingLabel?: string;
  features: string[];
};

const RoleCard: React.FC<RoleCardConfig> = ({
  title,
  icon,
  accentColor,
  accentSoftColor,
  state,
  statusLabel,
  description,
  actionLabel,
  actionKind = 'filled',
  onActionPress,
  pendingLabel,
  features,
}) => (
  <View style={[styles.roleCard, { borderColor: accentSoftColor, shadowColor: `${accentColor}1A` }]}> 
    <View style={styles.roleCardHeader}>
      <View style={[styles.roleBadge, { backgroundColor: accentSoftColor }]}> 
        <Feather name={icon} size={20} color={accentColor} />
      </View>
      <View style={styles.roleHeaderText}>
        <Text style={styles.roleTitle}>{title}</Text>
        {statusLabel ? (
          <View style={[styles.roleStatusPill, { backgroundColor: accentSoftColor }]}> 
            <Text style={[styles.roleStatusText, { color: accentColor }]}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>
    </View>

    <Text style={styles.roleDescription}>{description}</Text>

    {features.length ? (
      <View style={styles.roleFeatureList}>
        {features.map((feature) => (
          <View key={feature} style={styles.roleFeatureItem}>
            <View style={[styles.roleFeatureIcon, { backgroundColor: accentSoftColor }]}> 
              <Feather name="check" size={14} color={accentColor} />
            </View>
            <Text style={styles.roleFeatureText}>{feature}</Text>
          </View>
        ))}
      </View>
    ) : null}

    {state === 'pending' && pendingLabel ? (
      <View style={[styles.pendingNotice, { backgroundColor: accentSoftColor }]}> 
        <Feather name="clock" size={16} color={accentColor} />
        <Text style={[styles.pendingNoticeText, { color: accentColor }]}>{pendingLabel}</Text>
      </View>
    ) : null}

    {state !== 'pending' && actionLabel && onActionPress ? (
      <TouchableOpacity
        style={[
          styles.roleActionButton,
          actionKind === 'filled'
            ? { backgroundColor: accentColor }
            : { borderColor: accentColor, borderWidth: 1 },
        ]}
        onPress={onActionPress}
        activeOpacity={0.88}
      >
        <Text
          style={[
            styles.roleActionButtonText,
            actionKind === 'filled' ? { color: '#FFFFFF' } : { color: accentColor },
          ]}
        >
          {actionLabel}
        </Text>
        <Feather
          name={actionKind === 'filled' ? 'arrow-up-right' : 'arrow-right'}
          size={16}
          color={actionKind === 'filled' ? '#FFFFFF' : accentColor}
        />
      </TouchableOpacity>
    ) : null}
  </View>
);

export default function PublishEntryScreen() {
  const router = useRouter();
  const { supabaseProfile, isLoading: authLoading, isLoggedIn } = useAuth();
  const { profile, isProfileLoading } = useProfile();

  const loading = authLoading || isProfileLoading;

  const { hostState, landlordState } = useMemo(() => {
    const hostStatus = supabaseProfile?.host_status ?? profile?.hostStatus ?? 'none';
    const landlordStatus = supabaseProfile?.landlord_status ?? profile?.landlordStatus ?? 'none';
    const role = supabaseProfile?.role ?? profile?.role ?? 'user';

    const resolveState = (status: string, roleMatch: boolean): RoleCardState => {
      if (status === 'approved') {
        return 'approved';
      }
      if (status === 'pending') {
        return 'pending';
      }
      return roleMatch ? 'approved' : 'none';
    };

    return {
      hostState: resolveState(hostStatus, role === 'host'),
      landlordState: resolveState(landlordStatus, role === 'landlord'),
    };
  }, [profile?.hostStatus, profile?.landlordStatus, profile?.role, supabaseProfile?.host_status, supabaseProfile?.landlord_status, supabaseProfile?.role]);

  const keepUserOnApplication = (path: `/${string}`) => {
    router.push(path as never);
  };

  const handleOpenHostPublish = () => {
    if (hostState === 'approved') {
      router.push('/host-listings/new' as never);
    } else {
      keepUserOnApplication('/host');
    }
  };

  const handleOpenLandlordPublish = () => {
    if (landlordState === 'approved') {
      router.push('/landlord-listings/new' as never);
    } else {
      keepUserOnApplication('/landlord');
    }
  };

  const handleApplyHost = () => {
    keepUserOnApplication('/host');
  };

  const handleApplyLandlord = () => {
    keepUserOnApplication('/landlord');
  };

  const roleCards = useMemo<RoleCardConfig[]>(() => {
    const unifiedAccent = {
      accentColor: COLORS.primary,
      accentSoftColor: COLORS.primaryLight,
    };

    const hostContextOnly = hostState !== 'none' && landlordState === 'none';
    const landlordContextOnly = landlordState !== 'none' && hostState === 'none';

    const cards: RoleCardConfig[] = [
      {
        key: 'host',
        title: 'Espace Hôte',
        icon: 'zap',
        accentColor: unifiedAccent.accentColor,
        accentSoftColor: unifiedAccent.accentSoftColor,
        state: hostState,
        statusLabel:
          hostState === 'approved'
            ? 'Accès activé'
            : hostState === 'pending'
            ? 'En vérification'
            : undefined,
        description: 'Publis tes meublés, synchronise ton calendrier et reçois des réservations instantanément.',
        actionLabel:
          hostState === 'approved'
            ? 'Créer une annonce courte durée'
            : hostState === 'none'
            ? 'Demander à devenir hôte'
            : undefined,
        actionKind: hostState === 'approved' ? 'filled' : 'outline',
        onActionPress:
          hostState === 'approved'
            ? handleOpenHostPublish
            : hostState === 'none'
            ? handleApplyHost
            : undefined,
        pendingLabel:
          hostState === 'pending'
            ? 'Vérification manuelle en cours. Notification dès activation.'
            : undefined,
        features: [],
      },
      {
        key: 'landlord',
        title: 'Espace Bailleur',
        icon: 'briefcase',
        accentColor: unifiedAccent.accentColor,
        accentSoftColor: unifiedAccent.accentSoftColor,
        state: landlordState,
        statusLabel:
          landlordState === 'approved'
            ? 'Accès activé'
            : landlordState === 'pending'
            ? 'En vérification'
            : undefined,
        description: 'Diffuse tes biens longue durée, sélectionne tes locataires et suis les loyers en temps réel.',
        actionLabel:
          landlordState === 'approved'
            ? 'Publier une annonce bailleur'
            : landlordState === 'none'
            ? 'Demander à devenir bailleur'
            : undefined,
        actionKind: landlordState === 'approved' ? 'filled' : 'outline',
        onActionPress:
          landlordState === 'approved'
            ? handleOpenLandlordPublish
            : landlordState === 'none'
            ? handleApplyLandlord
            : undefined,
        pendingLabel:
          landlordState === 'pending'
            ? 'Analyse documentaire en cours. Activation prioritaire.'
            : undefined,
        features: [],
      },
    ];

    if (hostContextOnly) {
      return cards.filter((card) => card.key === 'host');
    }

    if (landlordContextOnly) {
      return cards.filter((card) => card.key === 'landlord');
    }

    return cards;
  }, [
    handleApplyHost,
    handleApplyLandlord,
    handleOpenHostPublish,
    handleOpenLandlordPublish,
    hostState,
    landlordState,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <Feather name="home" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Publier sur PUOL</Text>
          <Text style={styles.heroSubtitle}>
            Partage tes biens en quelques minutes pour toucher plus de clients.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loaderWrapper}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.loaderLabel}>Chargement de ton profil…</Text>
          </View>
        ) : null}

        {isLoggedIn ? (
          <View style={styles.section}>
            {roleCards.map(({ key, ...cardProps }) => (
              <RoleCard key={key} {...cardProps} />
            ))}
          </View>
        ) : (
          <View style={styles.loginCard}>
            <Feather name="lock" size={28} color={COLORS.primary} />
            <Text style={styles.loginTitle}>Connecte-toi pour publier</Text>
            <Text style={styles.loginSubtitle}>
              Crée un compte ou connecte-toi depuis l’onglet Profil pour accéder à la publication d’annonces.
            </Text>
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
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
    gap: 20,
  },
  heroCard: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: COLORS.surface,
    shadowColor: '#00000033',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 2,
    alignItems: 'center',
    gap: 12,
  },
  heroIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFFFFFDD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: 'Manrope',
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.muted,
    textAlign: 'center',
  },
  loaderWrapper: {
    padding: 20,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  loaderLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
  },
  section: {
    gap: 16,
  },
  roleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 26,
    padding: 22,
    borderWidth: 1,
    gap: 18,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  roleCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  roleBadge: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleHeaderText: {
    flex: 1,
  },
  roleTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 6,
  },
  roleStatusPill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  roleStatusText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  roleDescription: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.muted,
  },
  roleFeatureList: {
    gap: 10,
  },
  roleFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roleFeatureIcon: {
    width: 28,
    height: 28,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleFeatureText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.dark,
  },
  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  pendingNoticeText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
  },
  roleActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  roleActionButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
  },
  loginCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#00000010',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  loginTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  loginSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
});
