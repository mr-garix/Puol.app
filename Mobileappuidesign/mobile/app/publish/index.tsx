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

const COLORS = {
  primary: '#2ECC71',
  primaryLight: 'rgba(46, 204, 113, 0.18)',
  dark: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  surface: '#FFFFFF',
  background: '#F9FAFB',
};

const PublishCard: React.FC<{
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  description: string;
  buttonLabel: string;
  onPress: () => void;
}> = ({ icon, title, description, buttonLabel, onPress }) => (
  <View style={styles.actionCard}>
    <View style={styles.cardIconWrapper}>
      <Feather name={icon} size={22} color={COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
    <TouchableOpacity style={styles.cardButton} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.cardButtonText}>{buttonLabel}</Text>
      <Feather name="arrow-right" size={16} color="#FFFFFF" />
    </TouchableOpacity>
  </View>
);

export default function PublishEntryScreen() {
  const router = useRouter();
  const { supabaseProfile, isLoading: authLoading, isLoggedIn } = useAuth();
  const { profile, isProfileLoading } = useProfile();

  const loading = authLoading || isProfileLoading;

  const { isHostApproved, isHostPending, isLandlordApproved, isLandlordPending } = useMemo(() => {
    const hostStatus = supabaseProfile?.host_status ?? profile?.hostStatus ?? null;
    const landlordStatus = supabaseProfile?.landlord_status ?? profile?.landlordStatus ?? null;
    const role = supabaseProfile?.role ?? profile?.role ?? 'user';

    return {
      isHostApproved: role === 'host' || hostStatus === 'approved',
      isHostPending: hostStatus === 'pending',
      isLandlordApproved: role === 'landlord' || landlordStatus === 'approved',
      isLandlordPending: landlordStatus === 'pending',
    };
  }, [profile?.hostStatus, profile?.landlordStatus, profile?.role, supabaseProfile?.host_status, supabaseProfile?.landlord_status, supabaseProfile?.role]);

  const handleOpenHostPublish = () => {
    router.push('/host-listings/new' as never);
  };

  const handleOpenLandlordPublish = () => {
    router.push('/landlord-listings/new' as never);
  };

  const handleApplyHost = () => {
    router.push('/host' as never);
  };

  const handleApplyLandlord = () => {
    router.push('/landlord' as never);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroIconCircle}>
            <Feather name="upload" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Publier sur PUOL</Text>
          <Text style={styles.heroSubtitle}>
            Partage tes biens en quelques minutes. Choisis ton type de compte et publie pour toucher plus de clients.
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
            {isHostApproved ? (
              <PublishCard
                icon="zap"
                title="Publier une annonce courte durée"
                description="Propose ton logement meublé et reçois des réservations instantanément."
                buttonLabel="Publier une annonce"
                onPress={handleOpenHostPublish}
              />
            ) : null}

            {isLandlordApproved ? (
              <PublishCard
                icon="briefcase"
                title="Publier une annonce bailleur"
                description="Diffuse ton bien longue durée, gère les locataires et le suivi des loyers."
                buttonLabel="Publier une annonce"
                onPress={handleOpenLandlordPublish}
              />
            ) : null}

            {!isHostApproved && !isLandlordApproved ? (
              <View style={styles.applyCard}>
                <Text style={styles.applyTitle}>Tu veux publier une annonce ?</Text>
                <Text style={styles.applySubtitle}>
                  Deviens hôte ou bailleur et accède à la publication simple, accompagnée par l’équipe PUOL.
                </Text>
                <View style={styles.applyActions}>
                  <TouchableOpacity style={styles.outlineButton} onPress={handleApplyHost} activeOpacity={0.85}>
                    <Feather name="star" size={16} color={COLORS.primary} />
                    <Text style={styles.outlineButtonText}>Demander à devenir hôte</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.primaryButton} onPress={handleApplyLandlord} activeOpacity={0.9}>
                    <Feather name="briefcase" size={16} color="#FFFFFF" />
                    <Text style={styles.primaryButtonText}>Demander à devenir bailleur</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {isHostPending || isLandlordPending ? (
              <View style={styles.pendingCard}>
                <Feather name="clock" size={18} color="#B45309" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingTitle}>Demande en cours</Text>
                  <Text style={styles.pendingSubtitle}>
                    Notre équipe vérifie ton dossier. Nous te notifierons dès que la publication sera ouverte.
                  </Text>
                </View>
              </View>
            ) : null}
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
    marginBottom: 12,
  },
  heroSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.muted,
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
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    shadowColor: '#00000020',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
    gap: 16,
  },
  cardIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  cardButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  applyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 22,
    padding: 20,
    shadowColor: '#00000015',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 1,
    gap: 16,
  },
  applyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  applySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.muted,
  },
  applyActions: {
    gap: 12,
  },
  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 14,
  },
  outlineButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
  },
  primaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pendingCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: 'rgba(234, 179, 8, 0.12)',
    borderRadius: 18,
    padding: 16,
    alignItems: 'flex-start',
  },
  pendingTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#B45309',
  },
  pendingSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#B45309',
    lineHeight: 20,
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
