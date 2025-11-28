import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { MOCK_CONVERSATIONS, THREAD_BY_CONVERSATION, type Message } from './mockData';

const PUOL_GREEN = '#2ECC71';
const DARK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

export default function ConversationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isResponding, setIsResponding] = useState(false);

  const conversation = useMemo(() => MOCK_CONVERSATIONS.find((conv) => conv.id === id), [id]);

  useEffect(() => {
    setMessages(THREAD_BY_CONVERSATION[id as string] ?? []);
  }, [id]);

  const handleSend = () => {
    if (!draft.trim()) return;
    const newMessage: Message = {
      id: `temp-${Date.now()}`,
      sender: 'user',
      content: draft.trim(),
      timestamp: new Date().toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    setMessages((prev) => [...prev, newMessage]);
    setDraft('');
    setIsResponding(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `auto-${Date.now()}`,
          sender: 'host',
          content: "Bien noté ! Je reviens vers vous avec les détails supplémentaires.",
          timestamp: new Date().toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        },
      ]);
      setIsResponding(false);
    }, 1200);
  };

  if (!conversation) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Conversation introuvable</Text>
          <TouchableOpacity style={styles.backCta} onPress={() => router.replace('/messages' as never)}>
            <Feather name="arrow-left" size={16} color="#FFFFFF" />
            <Text style={styles.backCtaText}>Retour aux messages</Text>
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
          <View style={styles.headerTextBlock}>
            <Text style={styles.headerTitle} numberOfLines={2}>
              {conversation.name}
            </Text>
            <Text style={styles.headerSubtitle}>{conversation.subtitle}</Text>
          </View>
          <TouchableOpacity
            style={styles.headerLink}
            activeOpacity={0.8}
            onPress={() =>
              router.push({ pathname: '/property/[id]', params: { id: conversation.propertyId } } as never)
            }
          >
            <Feather name="link" size={12} color={PUOL_GREEN} />
            <Text style={styles.headerLinkText}>Voir l'annonce</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.contentWrapper}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
      >
        <ScrollView
          style={styles.thread}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((message) => {
            const isUser = message.sender === 'user';
            return (
              <View key={message.id} style={[styles.messageBubble, isUser ? styles.messageUser : styles.messageHost]}>
                <Text style={[styles.messageText, isUser && styles.messageTextUser]}>{message.content}</Text>
                <Text style={[styles.messageTimestamp, isUser && styles.messageTimestampUser]}>{message.timestamp}</Text>
              </View>
            );
          })}
        </ScrollView>

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Écrire un message..."
            placeholderTextColor={MUTED}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!draft.trim() || isResponding) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!draft.trim() || isResponding}
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
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextBlock: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
  },
  headerSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
  },
  headerLink: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.3)',
    backgroundColor: 'rgba(46,204,113,0.08)',
  },
  headerLinkText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '600',
    color: DARK,
  },
  thread: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  messageBubble: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    maxWidth: '80%',
  },
  messageHost: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
  },
  messageUser: {
    alignSelf: 'flex-end',
    backgroundColor: PUOL_GREEN,
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
    textAlign: 'right',
  },
  messageTimestampUser: {
    color: 'rgba(255,255,255,0.8)',
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: DARK,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PUOL_GREEN,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '600',
    color: DARK,
  },
  backCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: PUOL_GREEN,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  backCtaText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
