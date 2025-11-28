import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';

import { LIKE_ACTIVITIES } from './mockData';

const DARK = '#0F172A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const GREEN = '#2ECC71';

export default function LikeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const activity = LIKE_ACTIVITIES.find((item) => item.id === id);

  if (!activity) {
    return (
      <SafeAreaView style={styles.safeArea}> 
        <StatusBar style="dark" />
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Vidéo introuvable</Text>
          <TouchableOpacity style={styles.emptyCta} onPress={() => router.replace('/likes' as never)}>
            <Feather name="arrow-left" size={16} color="#FFFFFF" />
            <Text style={styles.emptyCtaText}>Retour aux likes</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <Image source={{ uri: activity.contentThumbnail }} style={styles.heroImage} />
        <View style={styles.heroOverlay} />
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.8}>
          <Feather name="chevron-left" size={20} color={DARK} />
        </TouchableOpacity>

        <View style={styles.heroMetaRow}>
          <View style={styles.durationChip}>
            <Feather name="clock" size={12} color={GREEN} />
            <Text style={styles.durationText}>{activity.contentDuration}</Text>
          </View>
          <View style={styles.likesChip}>
            <Feather name="heart" size={12} color="#FFFFFF" />
            <Text style={styles.likesText}>+{activity.burstCount}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.playButton} activeOpacity={0.9}>
          <Feather name="play" size={22} color={DARK} />
          <Text style={styles.playButtonText}>Lire la vidéo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentWrapper}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>{activity.contentTitle}</Text>
        <Text style={styles.subtitle}>{activity.contentDescription}</Text>

        <View style={styles.sectionCard}>
          <View style={styles.personRow}>
            <Image source={{ uri: activity.avatar }} style={styles.personAvatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.personName}>{activity.userName}</Text>
              <Text style={styles.personHandle}>{activity.userHandle}</Text>
            </View>
            <Text style={styles.timeAgo}>{activity.timeAgo}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.metricsRow}>
            <View style={styles.metricColumn}>
              <Text style={styles.metricValue}>{activity.burstCount}</Text>
              <Text style={styles.metricLabel}>Likes</Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={styles.metricValue}>1.4K</Text>
              <Text style={styles.metricLabel}>Vues</Text>
            </View>
            <View style={styles.metricColumn}>
              <Text style={styles.metricValue}>42</Text>
              <Text style={styles.metricLabel}>Commentaires</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryCta} activeOpacity={0.9}>
          <Feather name="external-link" size={18} color="#FFFFFF" />
          <Text style={styles.primaryCtaText}>Partager la vidéo</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  hero: {
    height: 320,
    position: 'relative',
    backgroundColor: '#0F172A',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  backButton: {
    position: 'absolute',
    top: 44,
    left: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroMetaRow: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    top: 44,
    right: 16,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  durationText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: DARK,
  },
  likesChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F43F5E',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  likesText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  playButton: {
    position: 'absolute',
    bottom: 24,
    left: '50%',
    transform: [{ translateX: -80 }],
    width: 160,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  playButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: DARK,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    color: DARK,
  },
  subtitle: {
    marginTop: 8,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
    lineHeight: 20,
  },
  sectionCard: {
    marginTop: 24,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: BORDER,
    padding: 20,
    gap: 16,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  personAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  personName: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: DARK,
  },
  personHandle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
  },
  timeAgo: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
  },
  divider: {
    height: 1,
    backgroundColor: BORDER,
    opacity: 0.7,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricColumn: {
    alignItems: 'center',
  },
  metricValue: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
  },
  metricLabel: {
    marginTop: 2,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
  },
  primaryCta: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 28,
    backgroundColor: GREEN,
  },
  primaryCtaText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: DARK,
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: GREEN,
  },
  emptyCtaText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
