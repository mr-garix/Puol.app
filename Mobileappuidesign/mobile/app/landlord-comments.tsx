import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StatusBar as NativeStatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import { useProfile } from '@/src/contexts/ProfileContext';
import { useLandlordCommentThreads } from '@/src/features/comments/hooks';
import { createListingComment } from '@/src/features/comments/services';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  dark: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#2ECC71',
  danger: '#EF4444',
};

const formatTimestamp = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildDisplayName = (actor: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  enterpriseName: string | null;
}) => {
  const first = actor.firstName?.trim();
  const last = actor.lastName?.trim();
  if (first && last) {
    return `${first} ${last}`;
  }
  if (actor.username?.trim()) {
    return actor.username;
  }
  if (actor.enterpriseName?.trim()) {
    return actor.enterpriseName;
  }
  return 'Utilisateur';
};

const LandlordCommentsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Place le header juste sous la status bar/Dynamic Island : on s'aligne sur la safe area sans marge supplémentaire.
  const topPadding = insets.top;
  const { profile, isProfileLoading } = useProfile();
  const landlordId = profile?.id ?? null;
  const isLandlordApproved = profile?.role === 'landlord' && profile.landlordStatus === 'approved';
  const { threads, isLoading, refresh, totalCount } = useLandlordCommentThreads(landlordId);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [submittingEntryKey, setSubmittingEntryKey] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      NativeStatusBar.setHidden(false, 'fade');
      return () => {
        NativeStatusBar.setHidden(false, 'fade');
      };
    }, []),
  );

  useEffect(() => {
    if (isProfileLoading) {
      return;
    }
    if (!isLandlordApproved) {
      router.replace('/(tabs)/profile' as never);
    }
  }, [isLandlordApproved, isProfileLoading, router]);

  const commentEntries = useMemo(() => {
    if (!threads.length) {
      return [] as Array<{
        key: string;
        parentCommentId: string;
        listingId: string;
        listingTitle: string | null;
        comment: (typeof threads)[number]['rootComment'];
      }>;
    }

    return threads
      .flatMap((thread) => {
        const parentCommentId = thread.rootComment.id;
        const items: Array<{
          key: string;
          parentCommentId: string;
          listingId: string;
          listingTitle: string | null;
          comment: typeof thread.rootComment;
        }> = [
          {
            key: `${thread.id}:root`,
            parentCommentId,
            listingId: thread.listingId,
            listingTitle: thread.listingTitle ?? null,
            comment: thread.rootComment,
          },
        ];

        thread.replies.forEach((reply) => {
          if (reply.author.id === landlordId) {
            return;
          }
          items.push({
            key: `${thread.id}:reply:${reply.id}`,
            parentCommentId,
            listingId: thread.listingId,
            listingTitle: thread.listingTitle ?? null,
            comment: reply,
          });
        });

        return items;
      })
      .sort((a, b) => new Date(b.comment.createdAt).getTime() - new Date(a.comment.createdAt).getTime());
  }, [threads, landlordId]);

  const entryCount = commentEntries.length;

  const handleDraftChange = (entryKey: string, value: string) => {
    setReplyDrafts((prev) => ({ ...prev, [entryKey]: value }));
  };

  const handleReplySubmit = async (entryKey: string, listingId: string, parentCommentId: string) => {
    const draft = replyDrafts[entryKey]?.trim();
    if (!draft || !landlordId) {
      return;
    }

    try {
      setSubmittingEntryKey(entryKey);
      await createListingComment(listingId, draft, landlordId, parentCommentId);
      setReplyDrafts((prev) => ({ ...prev, [entryKey]: '' }));
      await refresh();
    } catch (error) {
      console.error('[LandlordCommentsScreen] Unable to submit reply', error);
    } finally {
      setSubmittingEntryKey((prev) => (prev === entryKey ? null : prev));
    }
  };

  const navigateToListing = (listingId: string) => {
    router.push({ pathname: '/property/[id]', params: { id: listingId } } as never);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.safeArea}>
      <View style={[styles.headerWrapper, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Feather name="chevron-left" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Commentaires reçus</Text>
            <Text style={styles.headerSubtitle}>Toutes les discussions sur vos annonces bailleur</Text>
          </View>
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>{entryCount}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTagline}>
            Consultez les commentaires des locataires pour entretenir une relation de confiance.
          </Text>
          <View style={styles.summaryStatsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Total</Text>
              <Text style={styles.statValue}>{totalCount}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.statBlock}>
              <Text style={styles.statLabel}>Dernier commentaire</Text>
              <Text style={styles.statValueSmall}>
                {commentEntries[0] ? formatTimestamp(commentEntries[0].comment.createdAt) : 'En attente…'}
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Chargement des commentaires…</Text>
          </View>
        ) : commentEntries.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Feather name="message-circle" size={30} color={COLORS.accent} />
            </View>
            <Text style={styles.emptyTitle}>Aucun commentaire reçu</Text>
            <Text style={styles.emptySubtitle}>
              Dès qu’un locataire laisse un commentaire sur l’une de vos annonces, vous le verrez apparaître ici.
            </Text>
            <TouchableOpacity
              style={styles.ctaButton}
              activeOpacity={0.85}
              onPress={() => router.push('/landlord-listings' as never)}
            >
              <Text style={styles.ctaText}>Consulter mes annonces</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        ) : (
          commentEntries.map((entry) => {
            const draft = replyDrafts[entry.key] ?? '';
            const isSubmitting = submittingEntryKey === entry.key;
            const canSend = !!draft.trim() && !isSubmitting;

            return (
              <View key={entry.key} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Image
                    source={{
                      uri: entry.comment.author.avatarUrl || entry.comment.author.enterpriseLogoUrl || undefined,
                    }}
                    style={styles.entryAvatar}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.entryTitle} numberOfLines={2}>
                      <Text style={styles.entryAuthor}>{buildDisplayName(entry.comment.author)}</Text> a laissé un commentaire
                    </Text>
                    <Text style={styles.entryMeta}>{formatTimestamp(entry.comment.createdAt)}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.entryListingTag}
                    activeOpacity={0.85}
                    onPress={() => navigateToListing(entry.listingId)}
                  >
                    <Feather name="map-pin" size={12} color={COLORS.accent} />
                    <Text style={styles.entryListingText} numberOfLines={1}>
                      {entry.listingTitle ?? 'Voir l’annonce'}
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.entryCommentBubble}>
                  <Text style={styles.entryCommentText}>{entry.comment.content}</Text>
                </View>

                <View style={styles.replyComposer}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Répondre au locataire…"
                    placeholderTextColor="#9CA3AF"
                    value={draft}
                    onChangeText={(value) => handleDraftChange(entry.key, value)}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
                    activeOpacity={0.85}
                    onPress={() => handleReplySubmit(entry.key, entry.listingId, entry.parentCommentId)}
                    disabled={!canSend}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size={16} color="#FFFFFF" />
                    ) : (
                      <Feather name="send" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  headerWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
  },
  counterPill: {
    minWidth: 44,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  scrollArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 20,
    gap: 20,
    paddingBottom: 48,
  },
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  summaryTagline: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.muted,
  },
  summaryStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statBlock: {
    flex: 1,
    gap: 6,
  },
  statLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.dark,
  },
  statValueSmall: {
    fontSize: 14,
    color: COLORS.dark,
  },
  summaryDivider: {
    width: 1,
    height: '100%',
    backgroundColor: COLORS.border,
  },
  loadingState: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    paddingVertical: 48,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 16,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  entryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  entryAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5E7EB',
  },
  entryTitle: {
    fontSize: 14,
    color: COLORS.dark,
  },
  entryAuthor: {
    fontWeight: '700',
  },
  entryMeta: {
    fontSize: 12,
    color: COLORS.muted,
  },
  entryListingTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
  },
  entryListingText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
    maxWidth: 140,
  },
  entryCommentBubble: {
    backgroundColor: 'rgba(249, 250, 251, 0.85)',
    borderRadius: 16,
    padding: 16,
  },
  entryCommentText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.dark,
  },
  replyComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  replyInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.dark,
    backgroundColor: COLORS.surface,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#94D3B7',
  },
});

export default LandlordCommentsScreen;
