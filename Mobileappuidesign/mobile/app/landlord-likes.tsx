import React, { useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useProfile } from '@/src/contexts/ProfileContext';

const LandlordLikesScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Likes reçus</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>Engagement locataires</Text>
            <View style={styles.summaryBadge}>
              <Feather name="heart" size={14} color="#DC2626" />
              <Text style={styles.summaryBadgeText}>0 like</Text>
            </View>
          </View>
          <Text style={styles.summaryBody}>
            Dès que tes annonces bailleur seront publiées, chaque nouveau like s’affichera ici pour que tu suives l’intérêt
            des locataires en temps réel.
          </Text>
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="heart" size={26} color="#EF4444" />
          </View>
          <Text style={styles.emptyTitle}>Aucun like reçu</Text>
          <Text style={styles.emptySubtitle}>
            Publie au moins une annonce bailleur pour commencer à recevoir des likes et mesurer l’intérêt des visiteurs.
          </Text>
          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={() => router.push('/landlord-listings' as never)}>
            <Text style={styles.ctaText}>Publier une annonce</Text>
            <Feather name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Informations</Text>
          <Text style={styles.infoText}>• Les likes proviennent uniquement des visiteurs qui consultent tes annonces bailleur.</Text>
          <Text style={styles.infoText}>• Les statistiques sont mises à jour automatiquement dès qu’un locataire aime un bien.</Text>
          <Text style={styles.infoText}>• Pas d’annonce publiée = aucun like enregistré pour l’instant.</Text>
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
  summaryCard: {
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
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summaryBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
  },
  summaryBody: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(248, 113, 113, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    lineHeight: 20,
    color: '#6B7280',
    textAlign: 'center',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: '#059669',
  },
  ctaText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  infoCard: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  infoTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    lineHeight: 18,
    color: '#475569',
  },
});

export default LandlordLikesScreen;
