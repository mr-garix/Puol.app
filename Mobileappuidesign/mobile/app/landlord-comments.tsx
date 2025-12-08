import React, { useEffect } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useNavigation, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { useProfile } from '@/src/contexts/ProfileContext';

const LandlordCommentsScreen: React.FC = () => {
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
        <Text style={styles.headerTitle}>Commentaires reçus</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryLabel}>Total des retours locataires</Text>
            <View style={styles.summaryBadge}>
              <Feather name="message-circle" size={14} color="#15803D" />
              <Text style={styles.summaryBadgeText}>0 commentaire</Text>
            </View>
          </View>
          <Text style={styles.summaryBody}>
            Dès que tu publier as une annonce, chaque nouveau commentaire laissé par un locataire apparaîtra ici pour te
            permettre de répondre rapidement.
          </Text>
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="inbox" size={26} color="#059669" />
          </View>
          <Text style={styles.emptyTitle}>Aucun commentaire reçu</Text>
          <Text style={styles.emptySubtitle}>
            Tu n’as pas encore publié d’annonce bailleur ou aucun locataire n’a laissé de commentaire. Publie ton premier
            bien pour commencer à recevoir des retours.
          </Text>
          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85} onPress={() => router.push('/landlord-listings' as never)}>
            <Text style={styles.ctaText}>Voir mes annonces</Text>
            <Feather name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Comment ça marche ?</Text>
          <Text style={styles.infoText}>
            • Les commentaires proviennent uniquement des locataires qui interagissent avec tes annonces publiées.
          </Text>
          <Text style={styles.infoText}>• Tu pourras répondre directement depuis cette page pour garder le contact.</Text>
          <Text style={styles.infoText}>• Pas d’annonce publiée = pas de commentaire affiché pour l’instant.</Text>
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
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  summaryBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#15803D',
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
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
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

export default LandlordCommentsScreen;
