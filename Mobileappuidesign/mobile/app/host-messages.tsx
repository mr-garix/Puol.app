import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
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

type MessageItem = {
  id: string;
  client: string;
  property: string;
  excerpt: string;
  timestamp: string;
  status: 'Nouveau' | 'En cours';
};

const MOCK_MESSAGES: MessageItem[] = [
  {
    id: 'inbox-1',
    client: 'Mélissa D.',
    property: 'Loft premium Bonapriso',
    excerpt: 'Bonjour, je souhaite réserver pour le week-end prochain. Est-ce disponible ?',
    timestamp: '09:42',
    status: 'Nouveau',
  },
  {
    id: 'inbox-2',
    client: 'Samuel K.',
    property: 'Studio cosy Akwa',
    excerpt: 'Merci pour votre retour ! Je confirme la visite de vendredi.',
    timestamp: '08:10',
    status: 'En cours',
  },
  {
    id: 'inbox-3',
    client: 'Diane L.',
    property: 'Résidence Makepe',
    excerpt: 'Bonjour, puis-je avoir plus de photos de la chambre principale ?',
    timestamp: 'Hier',
    status: 'Nouveau',
  },
];

export default function HostMessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top - 40, 2);
  const [replyDrafts, setReplyDrafts] = React.useState<Record<string, string>>({});
  const [sentStatus, setSentStatus] = React.useState<Record<string, boolean>>({});

  const handleChangeDraft = (id: string, text: string) => {
    setReplyDrafts((prev) => ({ ...prev, [id]: text }));
  };

  const handleSendReply = (id: string) => {
    const draft = replyDrafts[id]?.trim();
    if (!draft) {
      return;
    }
    setReplyDrafts((prev) => ({ ...prev, [id]: '' }));
    setSentStatus((prev) => ({ ...prev, [id]: true }));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={[styles.headerWrapper, { paddingTop: topPadding }]}> 
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.navButton} activeOpacity={0.85} onPress={() => router.back()}>
            <Feather name="chevron-left" size={22} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Messages reçus</Text>
            <Text style={styles.headerSubtitle}>Répondez rapidement aux clients intéressés</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {MOCK_MESSAGES.map((message) => (
          <TouchableOpacity key={message.id} style={styles.messageCard} activeOpacity={0.85}>
            <View style={styles.messageHeader}>
              <View>
                <Text style={styles.clientName}>{message.client}</Text>
                <Text style={styles.propertyName}>{message.property}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.timestamp}>{message.timestamp}</Text>
                <View style={[styles.statusBadge, message.status === 'Nouveau' && styles.statusBadgeNew]}>
                  <Text
                    style={[styles.statusBadgeText, message.status === 'Nouveau' && styles.statusBadgeTextNew]}
                  >
                    {message.status}
                  </Text>
                </View>
              </View>
            </View>
            <Text style={styles.excerpt}>{message.excerpt}</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.replyButton, !replyDrafts[message.id]?.trim() && styles.replyButtonDisabled]}
                activeOpacity={0.9}
                onPress={() => handleSendReply(message.id)}
                disabled={!replyDrafts[message.id]?.trim()}
              >
                <Feather name="send" size={14} color={COLORS.accent} />
                <Text style={styles.replyText}>Répondre</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.replyInputContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Tapez votre réponse..."
                placeholderTextColor={COLORS.muted}
                multiline
                value={replyDrafts[message.id] ?? ''}
                onChangeText={(text) => handleChangeDraft(message.id, text)}
              />
              {sentStatus[message.id] && <Text style={styles.sentHint}>Réponse envoyée • conversation mise à jour</Text>}
            </View>
          </TouchableOpacity>
        ))}
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
  messageCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    borderWidth: 1,
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
  },
  replyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
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
  replyInputContainer: {
    marginTop: 12,
    gap: 8,
  },
  replyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    minHeight: 60,
    textAlignVertical: 'top',
    backgroundColor: '#FFFFFF',
  },
  sentHint: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
});
