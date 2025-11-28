import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  appendSupportThreadMessage,
  getSupportThreadById,
  getSupportThreadMessages,
  markSupportRepliesRead,
  type SupportMessage,
  type SupportThread,
} from '@/src/services/supportReplies';

const PRIMARY = '#2ECC71';
const DARK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

export default function SupportConversationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [thread, setThread] = useState<SupportThread | undefined>();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    const nextThread = getSupportThreadById(id);
    setThread(nextThread);
    setMessages(getSupportThreadMessages(id));
    markSupportRepliesRead();
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleSend = () => {
    if (!thread || !id || !draft.trim()) {
      return;
    }

    const newMessage: SupportMessage = {
      id: `${id}-${Date.now()}`,
      sender: 'user',
      content: draft.trim(),
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    appendSupportThreadMessage(id, newMessage);
    setMessages((prev) => [...prev, newMessage]);
    setDraft('');
    setSending(true);

    setTimeout(() => {
      const autoReply: SupportMessage = {
        id: `${id}-reply-${Date.now()}`,
        sender: 'support',
        content: "Merci pour votre retour, nous revenons vers vous avec davantage de précisions.",
        timestamp: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      appendSupportThreadMessage(id, autoReply);
      setMessages((prev) => [...prev, autoReply]);
      setSending(false);
    }, 1500);
  };

  const headerTitle = useMemo(() => thread?.title ?? 'Ticket support', [thread]);

  if (!thread) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Ticket introuvable</Text>
          <Text style={styles.emptySubtitle}>Ce ticket n'existe plus ou a été supprimé.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => router.replace('/support' as never)}>
            <Feather name="arrow-left" size={16} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Retour au support</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.back()}>
          <Feather name="chevron-left" size={20} color={DARK} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {headerTitle}
          </Text>
          <Text style={styles.headerSubtitle}>{thread.excerpt}</Text>
        </View>
        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{thread.status}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.threadContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
      >
        <ScrollView ref={scrollRef} style={styles.thread} contentContainerStyle={{ padding: 20 }}>
          {messages.map((message) => {
            const isUser = message.sender === 'user';
            return (
              <View key={message.id} style={[styles.messageBubble, isUser ? styles.messageUser : styles.messageSupport]}>
                <Text style={[styles.messageText, isUser && styles.messageTextUser]}>{message.content}</Text>
                <Text style={[styles.messageTimestamp, isUser && styles.messageTimestampUser]}>{message.timestamp}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.composerInput}
            placeholder="Écrire un message..."
            placeholderTextColor={MUTED}
            multiline
            value={draft}
            onChangeText={setDraft}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!draft.trim() || sending) && styles.sendButtonDisabled]}
            disabled={!draft.trim() || sending}
            onPress={handleSend}
            activeOpacity={0.85}
          >
            <Feather name="send" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 17,
    fontWeight: '700',
    color: DARK,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
  },
  statusPillText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY,
  },
  threadContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  thread: {
    flex: 1,
  },
  messageBubble: {
    marginBottom: 16,
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    maxWidth: '85%',
  },
  messageUser: {
    alignSelf: 'flex-end',
    backgroundColor: PRIMARY,
  },
  messageSupport: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
  },
  messageText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: DARK,
  },
  messageTextUser: {
    color: '#FFFFFF',
  },
  messageTimestamp: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: MUTED,
    marginTop: 6,
  },
  messageTimestampUser: {
    color: 'rgba(255,255,255,0.85)',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: BORDER,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: DARK,
    backgroundColor: '#FFFFFF',
    maxHeight: 120,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#A7F3D0',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
  },
  emptySubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 8,
    backgroundColor: PRIMARY,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
