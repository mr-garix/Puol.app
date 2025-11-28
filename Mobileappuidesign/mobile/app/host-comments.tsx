import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  dark: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#2ECC71',
};

export default function HostCommentsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top - 40, 2);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={[styles.headerWrapper, { paddingTop: topPadding }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Feather name="chevron-left" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Commentaires reçus</Text>
            <Text style={styles.headerSubtitle}>Les retours voyageurs apparaîtront ici</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={styles.summaryValue}>0 commentaire</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.summaryHint}>Vous recevrez les commentaires détaillés pour chaque annonce dans cette page.</Text>
        </View>

        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Feather name="message-circle" size={30} color={COLORS.accent} />
          </View>
          <Text style={styles.emptyTitle}>Aucun commentaire reçu</Text>
          <Text style={styles.emptySubtitle}>
            Dès que les voyageurs laisseront un commentaire, vous verrez leur profil, le logement concerné et un accès rapide
            pour leur répondre.
          </Text>
          <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
            <Text style={styles.ctaText}>Consulter mes annonces</Text>
            <Feather name="arrow-right" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.placeholderList}>
          <Text style={styles.placeholderTitle}>Flux des commentaires</Text>
          <Text style={styles.placeholderSubtitle}>Les nouveaux messages s’empileront automatiquement ici.</Text>
          {[1, 2].map((item) => (
            <View key={item} style={styles.placeholderRow}>
              <View style={styles.placeholderAvatar} />
              <View style={{ flex: 1, gap: 8 }}>
                <View style={styles.placeholderLineFull} />
                <View style={[styles.placeholderLineFull, { width: '50%' }]} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  summaryLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  summaryValue: {
    fontFamily: 'Manrope',
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.dark,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  summaryHint: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 20,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(46,204,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    marginTop: 8,
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  placeholderList: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 10,
  },
  placeholderTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  placeholderSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
  placeholderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  placeholderAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
  },
  placeholderLineFull: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
  },
});
