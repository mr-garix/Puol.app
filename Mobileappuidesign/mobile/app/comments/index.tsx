import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/features/auth/hooks';
import { getUserCommentConversations, createListingComment } from '@/src/features/comments/services';
import type { CommentConversation } from '@/src/features/comments/services';
import type { CommentWithAuthor } from '@/src/features/comments/types';
import { supabase } from '@/src/supabaseClient';

const DARK = '#0F172A';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const GREEN = '#2ECC71';

type ReplyActivity = {
  key: string;
  conversation: CommentConversation;
  reply: CommentWithAuthor;
};

export default function CommentsActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { supabaseProfile } = useAuth();
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [conversations, setConversations] = useState<CommentConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadConversations = useCallback(async () => {
    if (!supabaseProfile?.id) return;
    try {
      setIsLoading(true);
      const data = await getUserCommentConversations(supabaseProfile.id);
      setConversations(data);
    } catch (error) {
      console.error('Erreur lors du chargement des conversations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseProfile?.id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const activities = useMemo<ReplyActivity[]>(() => {
    const entries = conversations.flatMap<ReplyActivity>((conversation) => {
      const replies = (conversation.recentReplies ?? []) as CommentWithAuthor[];
      return replies.map((reply) => ({
        key: `${conversation.id}:${reply.id}`,
        conversation,
        reply,
      }));
    });

    return entries.sort(
      (a, b) => new Date(b.reply.createdAt).getTime() - new Date(a.reply.createdAt).getTime(),
    );
  }, [conversations]);

  const conversationIds = useMemo(() => new Set(conversations.map((conversation) => conversation.id)), [conversations]);
  const listingIds = useMemo(
    () => new Set(conversations.map((conversation) => conversation.listingId).filter(Boolean) as string[]),
    [conversations],
  );

  const groupedActivities = useMemo(() => {
    return activities.reduce<Record<string, ReplyActivity[]>>((acc, activity) => {
      const date = new Date(activity.reply.createdAt);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let groupLabel = 'Plus tôt';
      if (diffDays === 0) {
        groupLabel = "Aujourd'hui";
      } else if (diffDays === 1) {
        groupLabel = 'Hier';
      } else if (diffDays <= 7) {
        groupLabel = 'Cette semaine';
      }
      
      if (!acc[groupLabel]) {
        acc[groupLabel] = [];
      }
      acc[groupLabel].push(activity);
      return acc;
    }, {});
  }, [activities]);

  const formatEventTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const datePart = date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    const timePart = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    return `${datePart} · ${timePart}`;
  };

  const topInset = Math.max(insets.top, 10);
  const statusOffset = topInset + 8;

  const handleDraftChange = (id: string, value: string) => {
    setReplyDrafts((prev) => ({ ...prev, [id]: value }));
  };

  const handleReplySubmit = async (conversationId: string, listingId: string) => {
    const reply = replyDrafts[conversationId]?.trim();
    if (!reply || !supabaseProfile?.id) return;
    
    try {
      setIsSubmitting(true);
      await createListingComment(listingId, reply, supabaseProfile.id, conversationId);
      setReplyDrafts((prev) => ({ ...prev, [conversationId]: '' }));
      await loadConversations();
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la réponse:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePressConversation = (conversation: CommentConversation, reply: CommentWithAuthor) => {
    router.push({ 
      pathname: '/property/[id]', 
      params: { 
        id: conversation.listingId,
        initialCommentId: conversation.id,
        highlightReplyId: reply.id
      } as never
    });
  };

  useEffect(() => {
    if (!supabaseProfile?.id) {
      return;
    }

    type ListingCommentPayload = {
      new: Partial<Record<string, unknown>>;
      old: Partial<Record<string, unknown>>;
    };

    type ListingPayload = {
      new: Partial<Record<string, unknown>>;
      old: Partial<Record<string, unknown>>;
    };

    const channel = supabase
      .channel(`comment-activity:${supabaseProfile.id}`)
      .on('postgres_changes', { schema: 'public', table: 'listing_comments', event: '*' }, (payload: ListingCommentPayload) => {
        const newProfileId = payload.new?.profile_id as string | undefined;
        const oldProfileId = payload.old?.profile_id as string | undefined;
        const parentId = (payload.new?.parent_comment_id ?? payload.old?.parent_comment_id) as string | number | null | undefined;
        const recordId = (payload.new?.id ?? payload.old?.id) as string | number | undefined;
        const eventType = (payload as { eventType?: string }).eventType ?? 'UNKNOWN';

        if (eventType === 'DELETE') {
          const deletedId = recordId ? recordId.toString() : null;
          const parentKey = parentId != null ? parentId.toString() : null;

          setConversations((prev) => {
            if (!deletedId) {
              return prev;
            }

            if (!parentKey) {
              // Delete root conversation
              return prev.filter((conversation) => conversation.id !== deletedId);
            }

            return prev
              .map((conversation) => {
                if (conversation.id !== parentKey) {
                  return conversation;
                }

                const remainingReplies = (conversation.recentReplies ?? []).filter((reply) => reply.id !== deletedId);
                if (!remainingReplies.length) {
                  return null;
                }

                const latestReply = remainingReplies[remainingReplies.length - 1] ?? null;
                const firstReply = remainingReplies[0] ?? null;

                return {
                  ...conversation,
                  recentReplies: remainingReplies,
                  replyCount: remainingReplies.length,
                  latestReply,
                  latestReplyAt: latestReply?.createdAt ?? conversation.createdAt,
                  firstReply,
                } satisfies CommentConversation;
              })
              .filter((conversation): conversation is CommentConversation => Boolean(conversation));
          });

          return;
        }

        const isOwnRootComment = newProfileId === supabaseProfile.id || oldProfileId === supabaseProfile.id;
        const touchesConversation =
          (typeof parentId === 'number' || typeof parentId === 'string') &&
          conversationIds.has(parentId.toString());
        const touchesRoot =
          (typeof recordId === 'number' || typeof recordId === 'string') && conversationIds.has(recordId.toString());

        if (isOwnRootComment || touchesConversation || touchesRoot) {
          loadConversations();
        }
      })
      .on('postgres_changes', { schema: 'public', table: 'listings', event: '*' }, (payload: ListingPayload) => {
        const listingId = (payload.new?.id ?? payload.old?.id) as string | undefined;
        const eventType = (payload as { eventType?: string }).eventType ?? 'UNKNOWN';

        if (eventType === 'DELETE' && listingId) {
          setConversations((prev) => prev.filter((conversation) => conversation.listingId !== listingId));
          return;
        }

        if (listingId && listingIds.has(listingId)) {
          loadConversations();
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationIds, listingIds, loadConversations, supabaseProfile?.id]);

  const getDisplayName = (author: any) => {
    if (!author) return 'Utilisateur';
    const first = author.firstName?.trim();
    const last = author.lastName?.trim();
    if (first && last) return `${first} ${last}`;
    return author.username || author.enterpriseName || 'Utilisateur';
  };

  if (isLoading) {
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
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>{activities.length}</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GREEN} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>{activities.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="message-circle" size={48} color={MUTED} />
            <Text style={styles.emptyTitle}>Aucun commentaire</Text>
            <Text style={styles.emptySubtitle}>
              Vous n'avez reçu aucune réponse à vos commentaires pour le moment.
            </Text>
          </View>
        ) : (
          Object.entries(groupedActivities).map(([_groupLabel, activitiesForLabel]) => (
            <View key={_groupLabel} style={styles.groupSection}>
              {activitiesForLabel.map(({ key, conversation, reply }) => {
                const draft = replyDrafts[conversation.id] ?? '';
                const canSend = Boolean(draft.trim()) && !isSubmitting;

                return (
                  <View key={key} style={styles.activityCard}>
                    <TouchableOpacity
                      style={styles.cardTapArea}
                      activeOpacity={0.9}
                      onPress={() => handlePressConversation(conversation, reply)}
                    >
                      <View style={styles.activityLeft}>
                        <Image 
                          source={{ 
                            uri: reply.author.avatarUrl || reply.author.enterpriseLogoUrl || undefined 
                          }} 
                          style={styles.avatar} 
                        />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.activityPrimary} numberOfLines={2}>
                            <Text style={styles.activityActor}>
                              {getDisplayName(reply.author)}
                            </Text> a répondu à votre commentaire
                          </Text>
                          <Text style={styles.activityMeta}>
                            {formatEventTimestamp(reply.createdAt)}
                          </Text>
                          <View style={styles.commentBubble}>
                            <Text style={styles.commentText}>
                              {reply.content}
                            </Text>
                          </View>
                          {conversation.listingTitle && (
                            <View style={styles.contentTag}>
                              <Feather name="message-square" size={10} color={GREEN} />
                              <Text style={styles.contentTagText}>{conversation.listingTitle}</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {conversation.listingCoverPhotoUrl && (
                        <Image source={{ uri: conversation.listingCoverPhotoUrl }} style={styles.thumbnail} />
                      )}
                    </TouchableOpacity>

                    <View style={styles.replyComposer}>
                      <TextInput
                        style={styles.replyInput}
                        placeholder="Répondre directement..."
                        placeholderTextColor="#9CA3AF"
                        value={draft}
                        onChangeText={(text) => handleDraftChange(conversation.id, text)}
                        multiline
                        editable={!isSubmitting}
                      />
                      <TouchableOpacity
                        style={[styles.replyButton, !canSend && styles.replyButtonDisabled]}
                        activeOpacity={0.85}
                        onPress={() => handleReplySubmit(conversation.id, conversation.listingId)}
                        disabled={!canSend}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator size={14} color="#FFFFFF" />
                        ) : (
                          <Feather name="send" size={14} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
        )}
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
  counterPill: {
    minWidth: 36,
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 16,
    backgroundColor: 'rgba(46,204,113,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: '#1B5E20',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 16,
    color: MUTED,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '600',
    color: DARK,
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
});
