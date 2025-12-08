import React, { useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useProfile } from '@/src/contexts/ProfileContext';

const LandlordListingsScreen: React.FC = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { profile, isProfileLoading } = useProfile();

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

  const listingsCount = profile?.stats.listings ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes annonces</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <Text style={styles.heroSummaryLabel}>Gestion de tes biens</Text>
            <View style={styles.heroSummaryBadge}>
              <Feather name="home" size={14} color="#15803D" />
              <Text style={styles.heroSummaryBadgeText}>{listingsCount} annonce{listingsCount > 1 ? 's' : ''}</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Publie tes logements non meublés</Text>
          <Text style={styles.heroSubtitle}>
            Toutes les annonces créées ici seront proposées en non meublé par défaut. Centralise tes lots, ajoute les
            détails clés et prépare la diffusion auprès des locataires PUOL.
          </Text>

          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.85}
            onPress={() => router.push('/landlord-listings/new' as never)}
          >
            <Text style={styles.ctaButtonText}>Créer une annonce</Text>
            <Feather name="plus" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}> 
            <Feather name="folder" size={26} color="#059669" />
          </View>
          <Text style={styles.emptyTitle}>Aucune annonce publiée</Text>
          <Text style={styles.emptySubtitle}>
            Lorsque tu ajouteras un bien, il apparaîtra ici avec son statut, son nombre de visites et les locataires en
            cours de qualification.
          </Text>
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
    padding: 24,
    gap: 16,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
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
  heroSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  heroSummaryBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
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
  ctaButton: {
    marginTop: 4,
    backgroundColor: '#2ECC71',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default LandlordListingsScreen;
