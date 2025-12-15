import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  StatusBar as RNStatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/contexts/AuthContext';
import { useConversations } from '@/src/features/messaging/hooks/useConversations';
import { sendListingMessage } from '@/src/features/messaging/services';
import type { ConversationParticipant } from '@/src/features/messaging/types';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  dark: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  accent: '#2ECC71',
  warning: '#F97316',
};

const formatTimestamp = (isoDate?: string | null) => {
  if (!isoDate) {
    return '';
  }
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const buildDisplayName = (participant: ConversationParticipant | null): string | null => {
  if (!participant) return null;
  const { firstName, lastName, username } = participant;
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return username ?? firstName ?? lastName ?? null;
};

export default function HostMessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const topPadding = isAndroid ? Math.max(insets.top, 16) : Math.max(insets.top - 40, 2);

  const { supabaseProfile } = useAuth();
  const profileId = supabaseProfile?.id ?? null;
  const { conversations, isLoading, isRefreshing, refresh } = useConversations(profileId);

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Record<string, boolean>>({});

  const inboxConversations = useMemo(() => {
    if (!conversations.length) return [];
    return conversations.filter((conversation) => {
      if (conversation.viewerRole !== 'host') {
        return false;
      }
      const latest = conversation.latestMessage;
      const requiresAction = conversation.requiresHostActionPending;
      const guestLast = latest?.senderRole === 'guest';
      const escalated = Boolean(latest?.escalatedToHost);
      return requiresAction || guestLast || escalated;
    });
  }, [conversations]);

  const handleChangeDraft = (conversationId: string, text: string) => {
    setReplyDrafts((prev) => ({ ...prev, [conversationId]: text }));
  };

  const handleSendReply = async (conversationId: string) => {
    const draft = replyDrafts[conversationId]?.trim();
    if (!draft || !profileId) {
      return;
    }

    const targetConversation = conversations.find((item) => item.id === conversationId);
    if (!targetConversation) {
      Alert.alert('Conversation introuvable', "Impossible d'envoyer la réponse pour cette conversation.");
      return;
    }

    if (!targetConversation.listingId) {
      Alert.alert('Annonce manquante', "Impossible d'identifier l'annonce liée à cette conversation.");
      return;
    }

    try {
      setSending((prev) => ({ ...prev, [conversationId]: true }));
      await sendListingMessage({
        conversationId: targetConversation.id,
        listingId: targetConversation.listingId,
        senderProfileId: profileId,
        senderRole: 'host',
        content: draft,
      });
      setReplyDrafts((prev) => ({ ...prev, [conversationId]: '' }));
      await refresh();
    } catch (error) {
      console.error('[HostMessages] send reply error', error);
      Alert.alert('Erreur', "Impossible d'envoyer votre réponse. Réessayez dans un instant.");
    } finally {
      setSending((prev) => ({ ...prev, [conversationId]: false }));
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <RNStatusBar barStyle="dark-content" />
      <View
        style={[
          styles.headerWrapper,
          { paddingTop: topPadding },
          isAndroid && styles.headerWrapperAndroid,
        ]}
      >
        <View style={[styles.headerRow, isAndroid && styles.headerRowAndroid]}>
          <TouchableOpacity
            style={[styles.navButton, isAndroid && styles.navButtonAndroid]}
            activeOpacity={0.85}
            onPress={() => router.back()}
          >
            <Feather name="chevron-left" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={[styles.headerTextGroup, isAndroid && styles.headerTextGroupAndroid]}>
            <Text style={styles.headerTitle}>Messages reçus</Text>
            <Text style={styles.headerSubtitle}>Répondez rapidement aux clients nécessitant votre aide</Text>
          </View>
          {isAndroid ? <View style={styles.headerSpacerAndroid} /> : <View style={{ width: 44 }} />}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={COLORS.accent} />}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingLabel}>Chargement des messages nécessitant une action…</Text>
          </View>
        ) : null}

        {!isLoading && inboxConversations.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="check-circle" size={36} color={COLORS.accent} />
            <Text style={styles.emptyTitle}>Aucune intervention requise</Text>
            <Text style={styles.emptySubtitle}>
              Lorsque l’IA escalade une demande ou qu’un locataire vous écrit, le fil apparaîtra ici.
            </Text>
          </View>
        ) : null}

        {inboxConversations.map((conversation) => {
          const latest = conversation.latestMessage;
          const guestName = buildDisplayName(conversation.guest) ?? 'Locataire potentiel';
          const propertyTitle = conversation.listing?.title ?? 'Annonce PUOL';
          const messageContent = latest?.content?.trim() || 'Nouveau message reçu.';
          const timestamp = formatTimestamp(latest?.createdAt ?? conversation.updatedAt);
          const requiresAction = conversation.requiresHostActionPending;
          const status: 'Nouveau' | 'En cours' = requiresAction ? 'Nouveau' : 'En cours';
          const draftValue = replyDrafts[conversation.id] ?? '';
          const isSending = Boolean(sending[conversation.id]);

          return (
            <View key={conversation.id} style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <View>
                  <Text style={styles.clientName}>{guestName}</Text>
                  <Text style={styles.propertyName}>{propertyTitle}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.timestamp}>{timestamp}</Text>
                  <View style={[styles.statusBadge, status === 'Nouveau' && styles.statusBadgeNew]}>
                    <Text style={[styles.statusBadgeText, status === 'Nouveau' && styles.statusBadgeTextNew]}>
                      {status}
                    </Text>
                  </View>
                </View>
              </View>

              <Text style={styles.excerpt}>{messageContent}</Text>

              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={[styles.replyButton, (!draftValue.trim() || isSending) && styles.replyButtonDisabled]}
                  activeOpacity={0.9}
                  onPress={() => handleSendReply(conversation.id)}
                  disabled={!draftValue.trim() || isSending}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : (
                    <Feather name="send" size={14} color={COLORS.accent} />
                  )}
                  <Text style={styles.replyText}>Répondre</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.openThreadButton}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/messages/${conversation.id}` as never)}
                >
                  <Feather name="message-circle" size={14} color={COLORS.dark} />
                  <Text style={styles.openThreadText}>Ouvrir le fil complet</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.replyInputContainer}>
                <TextInput
                  style={styles.replyInput}
                  placeholder={"Tapez votre réponse…"}
                  placeholderTextColor={COLORS.muted}
                  multiline
                  value={draftValue}
                  onChangeText={(text) => handleChangeDraft(conversation.id, text)}
                />
                {requiresAction ? (
                  <Text style={styles.sentHint}>Cette conversation attend votre réponse.</Text>
                ) : latest?.senderRole === 'guest' ? (
                  <Text style={styles.sentHint}>Le locataire attend votre retour.</Text>
                ) : null}
              </View>
            </View>
          );
        })}
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
  headerWrapperAndroid: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerRowAndroid: {
    justifyContent: 'space-between',
    gap: 0,
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
  navButtonAndroid: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: '#F3F4F6',
    marginRight: 12,
  },
  headerTextGroup: {
    flex: 1,
  },
  headerTextGroupAndroid: {
    marginLeft: 4,
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
  headerSpacerAndroid: {
    width: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    gap: 16,
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: 60,
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  messageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderColor: COLORS.border,
    padding: 20,
    gap: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  clientName: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  propertyName: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
  timestamp: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statusBadgeNew: {
    borderColor: 'rgba(46,204,113,0.4)',
    backgroundColor: 'rgba(46,204,113,0.08)',
  },
  statusBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
  },
  statusBadgeTextNew: {
    color: COLORS.accent,
  },
  excerpt: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    lineHeight: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.12)',
  },
  replyButtonDisabled: {
    opacity: 0.5,
  },
  replyText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  openThreadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#F3F4F6',
  },
  openThreadText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.dark,
  },
  replyInputContainer: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  replyInput: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sentHint: {
    marginTop: 8,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.warning,
  },
});
