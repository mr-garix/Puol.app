import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LIKE_ACTIVITIES } from './mockData';

const DARK = '#0F172A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const GREEN = '#2ECC71';

export default function LikesActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const groupedActivities = useMemo(() => {
    return LIKE_ACTIVITIES.reduce<Record<string, typeof LIKE_ACTIVITIES[number][]>>((acc, activity) => {
      const group = activity.groupLabel ?? 'Plus tôt';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(activity);
      return acc;
    }, {});
  }, []);

  const totalLikes = LIKE_ACTIVITIES.reduce((sum, item) => sum + item.burstCount, 0);
  const todayLikes = LIKE_ACTIVITIES.filter((item) => item.groupLabel === "Aujourd'hui").reduce(
    (sum, item) => sum + item.burstCount,
    0,
  );

  const topInset = Math.max(insets.top, 10);

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={[styles.statusPad, { height: topInset }]} />
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <TouchableOpacity style={styles.navButton} onPress={() => router.back()} activeOpacity={0.75}>
            <Feather name="chevron-left" size={20} color={DARK} />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Notifications</Text>
            <Text style={styles.pageSubtitle}>Vos likes les plus récents</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {Object.entries(groupedActivities).map(([groupLabel, activities]) => (
          <View key={groupLabel} style={styles.groupSection}>
            <Text style={styles.groupLabel}>{groupLabel}</Text>
            {activities.map((activity) => {
              const likeText = activity.burstCount > 1 ? `et ${activity.burstCount - 1} personnes ont aimé` : 'a aimé';
              const burstBadge = activity.burstCount > 1 ? `+${activity.burstCount - 1}` : null;

              return (
                <TouchableOpacity
                  key={activity.id}
                  style={styles.activityCard}
                  activeOpacity={0.9}
                  onPress={() =>
                    router.push({ pathname: '/property/[id]', params: { id: activity.propertyId } } as never)
                  }
                >
                  <View style={styles.activityLeft}>
                    <Image source={{ uri: activity.avatar }} style={styles.avatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.activityPrimary} numberOfLines={2}>
                        <Text style={styles.activityActor}>{activity.userName}</Text> {likeText} votre vidéo
                      </Text>
                      <Text style={styles.activityMeta}>{activity.timeAgo} · {activity.userHandle}</Text>
                      <View style={styles.contentTag}>
                        <Feather name="play" size={10} color={GREEN} />
                        <Text style={styles.contentTagText}>{activity.contentTitle}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.activityRight}>
                    {burstBadge && <Text style={styles.burstBadge}>{burstBadge}</Text>}
                    <Image source={{ uri: activity.contentThumbnail }} style={styles.thumbnail} />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  statusPad: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    gap: 12,
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  pageTitle: {
    fontFamily: 'Manrope',
    fontSize: 22,
    fontWeight: '700',
    color: DARK,
  },
  pageSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 32,
    gap: 24,
    backgroundColor: '#F9FAFB',
  },
  groupSection: {
    gap: 14,
  },
  groupLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  activityCard: {
    flexDirection: 'row',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.04)',
  },
  activityLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
  },
  activityPrimary: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: DARK,
  },
  activityActor: {
    fontWeight: '700',
  },
  activityMeta: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
    marginTop: 4,
  },
  contentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.1)',
  },
  contentTagText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '600',
    color: DARK,
  },
  activityRight: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  burstBadge: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    backgroundColor: '#F43F5E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
});
