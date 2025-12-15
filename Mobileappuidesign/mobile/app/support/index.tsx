import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@/src/contexts/NotificationContext';
import {
  type SupportThread,
  createSupportThread,
  getSupportThreads,
  getSupportUnreadFlag,
  markSupportRepliesRead,
  subscribeToNewSupportReplies,
  subscribeToSupportThreads,
  subscribeToSupportUnreadFlag,
} from '@/src/services/supportReplies';

const PRIMARY = '#2ECC71';
const DARK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';
const SURFACE = '#F9FAFB';
const ALERT = '#EF4444';
const SUPPORT_TOPICS = ['Devenir hôte', 'Paiement', 'Devenir bailleur', 'Problème technique', 'Autre'];
const RESPONSE_TAGS = ['Moins de 24h', 'Support humain', 'Multicanal'];

export default function ContactSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const { showNotification } = useNotifications();
  const [selectedTopic, setSelectedTopic] = useState(SUPPORT_TOPICS[0]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [threads, setThreads] = useState<SupportThread[]>(() => getSupportThreads());
  const [hasNewSupportReply, setHasNewSupportReply] = useState(() => getSupportUnreadFlag());
  const [latestReplyId, setLatestReplyId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);

  const canSend = subject.trim().length > 0 && message.trim().length > 0 && !isSending;

  const responseSummary = useMemo(
    () =>
      RESPONSE_TAGS.map((tag) => (
        <View key={tag} style={styles.responseTag}>
          <Feather name="check" size={12} color={PRIMARY} />
          <Text style={styles.responseTagLabel}>{tag}</Text>
        </View>
      )),
    [],
  );

  useEffect(() => {
    const unsubscribeThreads = subscribeToSupportThreads((nextThreads) => {
      setThreads(nextThreads);
      const newest = nextThreads[nextThreads.length - 1];
      if (newest?.isNew) {
        setLatestReplyId(newest.id);
      }
    });

    const unsubscribeUnread = subscribeToSupportUnreadFlag(setHasNewSupportReply);
    const unsubscribeReplies = subscribeToNewSupportReplies((thread) => {
      setLatestReplyId(thread.id);
      showNotification({
        id: `support-reply-${thread.id}`,
        title: 'Nouvelle réponse support',
        message: thread.title,
        action: { type: 'link', href: '/support' },
      });
    });

    return () => {
      unsubscribeThreads();
      unsubscribeUnread();
      unsubscribeReplies();
    };
  }, []);

  useEffect(() => {
    if (!latestReplyId) {
      return;
    }

    const timeout = setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
      markSupportRepliesRead();
      setHasNewSupportReply(false);
      setLatestReplyId(null);
    }, 350);

    return () => clearTimeout(timeout);
  }, [latestReplyId]);

  useEffect(() => {
    markSupportRepliesRead();
  }, []);

  const handleSend = () => {
    if (!canSend) {
      Alert.alert('Message incomplet', 'Merci de renseigner l’objet et votre message.');
      return;
    }

    setIsSending(true);
    try {
      const thread = createSupportThread({ subject, message, topic: selectedTopic });
      setThreads((prev) => [...prev, thread]);
      setSubject('');
      setMessage('');
      setHasNewSupportReply(false);
      showNotification({
        id: `support-thread-${thread.id}`,
        title: 'Ticket créé',
        message: 'Votre demande a été transmise au support.',
      });
    } catch (error) {
      console.error('[ContactSupport] create thread failed', error);
      Alert.alert('Envoi impossible', "Nous n'avons pas pu enregistrer votre demande. Réessayez dans un instant.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 6 : 0}
      >
        <View
          style={[
            styles.pageHeader,
            isAndroid && {
              paddingTop: Math.max(insets.top, 16),
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: BORDER,
              backgroundColor: '#FFFFFF',
              justifyContent: 'space-between',
              gap: 0,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.navButton, isAndroid && styles.navButtonAndroid]}
            onPress={() => router.back()} activeOpacity={0.8}
          >
            <Feather name="chevron-left" size={20} color={DARK} />
          </TouchableOpacity>
          <View style={[styles.pageTitleContainer, isAndroid && styles.pageTitleContainerAndroid]}>
            <Text style={styles.pageTitle}>Contactez le support</Text>
            <Text style={styles.pageSubtitle}>On vous répond en quelques temps</Text>
          </View>
          {isAndroid ? <View style={styles.pageHeaderSpacerAndroid} /> : null}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 36 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.heroCard}>
          <View style={styles.heroTextBlock}>
            <Text style={styles.heroTitle}>Toujours là pour vous aider</Text>
            <Text style={styles.heroSubtitle}>
              Décrivez votre problème, suivez la conversation et retrouvez les réponses du support au même endroit.
            </Text>
            <View style={styles.responseTagsRow}>{responseSummary}</View>
          </View>
          <View style={styles.heroBadge}>
            <Feather name="headphones" size={26} color={PRIMARY} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Type de demande</Text>
          <View style={styles.topicGrid}>
            {[SUPPORT_TOPICS.slice(0, 3), SUPPORT_TOPICS.slice(3)].map((row, rowIndex) => (
              <View key={`topic-row-${rowIndex}`} style={styles.topicRow}>
                {row.map((topic) => (
                  <TouchableOpacity
                    key={topic}
                    style={[styles.topicChip, selectedTopic === topic && styles.topicChipActive]}
                    onPress={() => setSelectedTopic(topic)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[styles.topicChipLabel, selectedTopic === topic && styles.topicChipLabelActive]}
                    >
                      {topic}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Détails</Text>
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>Objet</Text>
            <TextInput
              style={styles.input}
              placeholder="Décrivez rapidement le sujet"
              placeholderTextColor="#9CA3AF"
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={[styles.inputLabel, { marginTop: 18 }]}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Ajoutez un maximum de détails pour que l’on vous aide rapidement"
              placeholderTextColor="#9CA3AF"
              value={message}
              onChangeText={setMessage}
              multiline
            />

            <TouchableOpacity style={styles.attachmentButton} activeOpacity={0.85}>
              <Feather name="image" size={16} color={PRIMARY} />
              <Text style={styles.attachmentButtonText}>Ajouter une capture ou un document</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, !canSend && styles.submitButtonDisabled]}
              onPress={handleSend}
              disabled={!canSend}
              activeOpacity={0.85}
            >
              {isSending ? (
                <Text style={styles.submitButtonText}>Envoi...</Text>
              ) : (
                <Text style={styles.submitButtonText}>Envoyer au support</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Autres canaux</Text>
          <View style={styles.channelRow}>
            <TouchableOpacity style={styles.channelCard} activeOpacity={0.85}>
              <Feather name="phone-call" size={20} color={PRIMARY} />
              <View style={{ flex: 1 }}>
                <Text style={styles.channelTitle}>WhatsApp Business</Text>
                <Text style={styles.channelSubtitle}>+237 6 98 45 10 12</Text>
              </View>
              <Feather name="external-link" size={16} color={MUTED} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.channelCard} activeOpacity={0.85}>
              <Feather name="mail" size={20} color={PRIMARY} />
              <View style={{ flex: 1 }}>
                <Text style={styles.channelTitle}>support@puol.com</Text>
                <Text style={styles.channelSubtitle}>Réponse sous 12h</Text>
              </View>
              <Feather name="external-link" size={16} color={MUTED} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.threadHeader}>
            <Text style={styles.sectionLabel}>Derniers échanges</Text>
            {hasNewSupportReply ? (
              <Text style={styles.threadHint}>Nouvelle réponse détectée, voyez le bas de la page.</Text>
            ) : (
              <TouchableOpacity activeOpacity={0.8}>
                <Text style={styles.threadSeeAll}>Tout voir</Text>
              </TouchableOpacity>
            )}
          </View>

          {threads.map((thread) => (
            <TouchableOpacity
              key={thread.id}
              style={[styles.threadCard, thread.isNew && styles.threadCardNew]}
              activeOpacity={0.9}
              onPress={() => router.push(`/support/${thread.id}` as never)}
            >
              <View style={styles.threadBadge}>
                <Feather name="message-circle" size={18} color={PRIMARY} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.threadTitle}>{thread.title}</Text>
                <Text style={styles.threadMeta}>
                  {thread.lastResponse} • {thread.timestamp}
                </Text>
                <Text style={styles.threadExcerpt}>{thread.excerpt}</Text>
              </View>
              <View>
                <View style={[styles.threadStatus, thread.status === 'Résolu' ? styles.threadStatusSuccess : styles.threadStatusPending]}>
                  <Text style={styles.threadStatusText}>{thread.status}</Text>
                </View>
                {thread.isNew && (
                  <View style={styles.newThreadBadge}>
                    <Text style={styles.newThreadBadgeText}>Nouvelle réponse</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
    gap: 14,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  navButtonAndroid: {
    borderWidth: 0,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    marginRight: 12,
  },
  pageTitleContainer: {
    flex: 1,
  },
  pageTitleContainerAndroid: {
    marginLeft: 4,
  },
  pageTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: DARK,
  },
  pageSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  pageHeaderSpacerAndroid: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    backgroundColor: SURFACE,
  },
  heroCard: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 20,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
    flexDirection: 'row',
    gap: 16,
  },
  heroTextBlock: {
    flex: 1,
    gap: 10,
  },
  heroBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  heroTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
  },
  heroSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    lineHeight: 18,
    color: MUTED,
  },
  responseTagsRow: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 6,
  },
  responseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.08)',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  responseTagLabel: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: DARK,
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: DARK,
    marginBottom: 12,
  },
  topicGrid: {
    gap: 12,
  },
  topicRow: {
    flexDirection: 'row',
    gap: 10,
  },
  topicChip: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  topicChipActive: {
    borderColor: 'rgba(46, 204, 113, 0.5)',
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
  },
  topicChipLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: DARK,
    textAlign: 'center',
  },
  topicChipLabelActive: {
    color: PRIMARY,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    gap: 8,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  inputLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: DARK,
  },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: DARK,
    backgroundColor: '#FDFDFD',
    marginTop: 6,
  },
  textArea: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
  attachmentButton: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  attachmentButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: PRIMARY,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#A7F3D0',
  },
  submitButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  channelRow: {
    gap: 14,
  },
  channelCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.05)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  channelTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: DARK,
  },
  channelSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
    marginTop: 2,
  },
  threadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    marginBottom: 12,
  },
  threadSeeAll: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: PRIMARY,
    fontWeight: '600',
  },
  threadHint: {
    flex: 1,
    textAlign: 'right',
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
  },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(17, 24, 39, 0.04)',
  },
  threadCardNew: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
  },
  threadBadge: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
    marginBottom: 4,
  },
  threadMeta: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
    marginBottom: 4,
  },
  threadExcerpt: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: DARK,
    lineHeight: 18,
  },
  threadStatus: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginLeft: 12,
  },
  threadStatusSuccess: {
    backgroundColor: 'rgba(16, 185, 129, 0.16)',
  },
  threadStatusPending: {
    backgroundColor: 'rgba(234, 179, 8, 0.16)',
  },
  threadStatusText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '700',
    color: DARK,
  },
  newThreadBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: ALERT,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  newThreadBadgeText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
