import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { COMMENT_ACTIVITIES } from './mockData';

const DARK = '#0F172A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const GREEN = '#2ECC71';

export default function CommentsActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const groupedActivities = useMemo(() => {
    return COMMENT_ACTIVITIES.reduce<Record<string, typeof COMMENT_ACTIVITIES[number][]>>((acc, activity) => {
      const group = activity.groupLabel ?? 'Plus tôt';
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(activity);
      return acc;
    }, {});
  }, []);

  const topInset = Math.max(insets.top, 10);
  const statusOffset = topInset + 8;

  const handleDraftChange = (id: string, value: string) => {
    setReplyDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleReplySubmit = (id: string) => {
    const reply = replyDrafts[id]?.trim();
    if (!reply) return;
    // In a real app, send reply to backend.
    setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['left', 'right', 'bottom']}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={[styles.statusPad, { height: statusOffset }]} />
      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <TouchableOpacity style={styles.navButton} onPress={() => router.back()} activeOpacity={0.75}>
            <Feather name="chevron-left" size={20} color={DARK} />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Commentaires</Text>
            <Text style={styles.pageSubtitle}>Retrouvez tous vos commentaires ici</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {Object.entries(groupedActivities).map(([groupLabel, activities]) => (
          <View key={groupLabel} style={styles.groupSection}>
            <Text style={styles.groupLabel}>{groupLabel}</Text>
            {activities.map((activity) => {
              const draft = replyDrafts[activity.id] ?? '';
              const canSend = Boolean(draft.trim());

              return (
                <View key={activity.id} style={styles.activityCard}>
                  <TouchableOpacity
                    style={styles.cardTapArea}
                    activeOpacity={0.9}
                    onPress={() =>
                      router.push({ pathname: '/property/[id]', params: { id: activity.propertyId } } as never)
                    }
                  >
                    <View style={styles.activityLeft}>
                      <Image source={{ uri: activity.avatar }} style={styles.avatar} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.activityPrimary} numberOfLines={2}>
                          <Text style={styles.activityActor}>{activity.userName}</Text> a commenté votre vidéo
                        </Text>
                        <Text style={styles.activityMeta}>{activity.timeAgo} · {activity.userHandle}</Text>
                        <View style={styles.commentBubble}>
                          <Text style={styles.commentText}>{activity.commentText}</Text>
                        </View>
                        <View style={styles.contentTag}>
                          <Feather name="message-square" size={10} color={GREEN} />
                          <Text style={styles.contentTagText}>{activity.contentTitle}</Text>
                        </View>
                      </View>
                    </View>

                    <Image source={{ uri: activity.contentThumbnail }} style={styles.thumbnail} />
                  </TouchableOpacity>

                  <View style={styles.replyComposer}>
                    <TextInput
                      style={styles.replyInput}
                      placeholder="Répondre directement..."
                      placeholderTextColor="#9CA3AF"
                      value={draft}
                      onChangeText={(text) => handleDraftChange(activity.id, text)}
                      multiline
                    />
                    <TouchableOpacity
                      style={[styles.replyButton, !canSend && styles.replyButtonDisabled]}
                      activeOpacity={0.85}
                      onPress={() => handleReplySubmit(activity.id)}
                      disabled={!canSend}
                    >
                      <Feather name="send" size={14} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
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
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.04)',
  },
  cardTapArea: {
    flexDirection: 'row',
    gap: 12,
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
  commentBubble: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  commentText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: DARK,
  },
  contentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
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
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  replyComposer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-end',
  },
  replyInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 90,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: DARK,
    backgroundColor: '#FFFFFF',
  },
  replyButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
});
