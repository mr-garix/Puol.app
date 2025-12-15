import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/src/contexts/AuthContext';
import { Avatar } from '@/src/components/ui/Avatar';
import { useConversations } from '@/src/features/messaging/hooks/useConversations';
import type { ConversationSummary } from '@/src/features/messaging/types';
import {
  loadConversationReadMap,
  recordConversationRead,
  type ConversationReadMap,
} from '@/src/features/messaging/conversationReadStorage';

const PUOL_GREEN = '#2ECC71';
const DARK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

const FILTER_TABS = ['Tous', 'Non lus'];

type DerivedConversation = {
  id: string;
  title: string;
  subtitle: string;
  avatarUri: string | null;
  fallbackInitials: string;
  propertyTag: string | null;
  lastMessageSnippet: string;
  lastActivityLabel: string;
  unread: number;
};

const buildDisplayName = (participant: ConversationSummary['guest'] | ConversationSummary['host']): string | null => {
  if (!participant) return null;
  const { firstName, lastName, username } = participant;
  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }
  return username ?? firstName ?? lastName ?? null;
};

const buildLocationTag = (listing: ConversationSummary['listing']): string | null => {
  if (!listing) return null;
  const { title, city, district } = listing;
  if (title && city && district) {
    return `${title} · ${city}${district ? `, ${district}` : ''}`;
  }
  if (title && city) {
    return `${title} · ${city}`;
  }
  return title ?? city ?? district ?? null;
};

const formatTimestampLabel = (isoString: string | null | undefined): string => {
  if (!isoString) {
    return '';
  }
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) {
    return 'Hier';
  }

  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};

const computeUnreadFallback = (conversation: ConversationSummary, viewerProfileId: string | null): number => {
  if (!conversation.latestMessage) {
    return 0;
  }

  const latest = conversation.latestMessage;

  if (conversation.viewerRole === 'host') {
    if (conversation.requiresHostActionPending) {
      return 1;
    }
    if (latest.senderRole === 'guest') {
      return 1;
    }
  }

  if (conversation.viewerRole === 'guest') {
    if (latest.senderProfileId && latest.senderProfileId !== viewerProfileId) {
      return 1;
    }
    if (!latest.senderProfileId && latest.senderRole !== 'guest') {
      return 1;
    }
  }

  return 0;
};

export default function MessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const { supabaseProfile, isLoggedIn } = useAuth();
  const profileId = supabaseProfile?.id ?? null;
  const { conversations, isLoading, isRefreshing, refresh } = useConversations(profileId);
  const [activeFilter, setActiveFilter] = useState(FILTER_TABS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [readMap, setReadMap] = useState<ConversationReadMap>({});

  const handleSelectFilter = (tab: string) => {
    setActiveFilter(tab);
  };

  useEffect(() => {
    let isMounted = true;
    if (!profileId) {
      setReadMap({});
      return () => {
        isMounted = false;
      };
    }

    void loadConversationReadMap(profileId).then((map) => {
      if (isMounted) {
        setReadMap(map);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [profileId]);

  useEffect(() => {
    if (!profileId) {
      return;
    }
    setReadMap((current) => {
      const next = { ...current };
      let mutated = false;
      conversations.forEach((conversation) => {
        if (typeof next[conversation.id] !== 'number') {
          next[conversation.id] = 0;
          mutated = true;
        }
      });
      return mutated ? next : current;
    });
  }, [conversations, profileId]);

  const guestConversations = useMemo(
    () => conversations.filter((conversation) => conversation.viewerRole === 'guest'),
    [conversations],
  );

  const derivedConversations: DerivedConversation[] = useMemo(() => {
    if (!guestConversations.length) {
      return [];
    }

    return guestConversations.map((conversation) => {
      const otherParticipant = conversation.viewerRole === 'guest' ? conversation.host : conversation.guest;
      const fallbackParticipant = conversation.viewerRole === 'guest' ? conversation.host : conversation.guest;
      const listingTag = buildLocationTag(conversation.listing);
      const otherName = buildDisplayName(otherParticipant) ?? 'Interlocuteur PUOL';
      const roleLabel = conversation.viewerRole === 'host' ? 'Locataire potentiel' : 'Bailleur';
      const subtitle = `${roleLabel}${otherName ? ` · ${otherName}` : ''}`;
      const lastMessageSnippet = conversation.latestMessage?.content?.trim() || 'Aucun message pour le moment.';
      const lastActivityLabel = formatTimestampLabel(conversation.latestMessage?.createdAt ?? conversation.updatedAt);
      const latestMessageTime = conversation.latestMessage
        ? new Date(conversation.latestMessage.createdAt).getTime()
        : 0;
      const lastRead = readMap[conversation.id] ?? 0;
      let unread = computeUnreadFallback(conversation, profileId);
      if (lastRead >= latestMessageTime && latestMessageTime > 0) {
        unread = 0;
      } else if (latestMessageTime > lastRead && latestMessageTime > 0) {
        unread = 1;
      }
      const initialsSourceName = otherName || listingTag || 'PUOL';

      return {
        id: conversation.id,
        title: conversation.listing?.title ?? otherName ?? 'Conversation PUOL',
        subtitle,
        avatarUri: otherParticipant?.avatarUrl ?? conversation.listing?.coverPhotoUrl ?? null,
        fallbackInitials: initialsSourceName,
        propertyTag: listingTag,
        lastMessageSnippet,
        lastActivityLabel,
        unread,
      } satisfies DerivedConversation;
    });
  }, [guestConversations, profileId, readMap]);

  const filteredConversations = useMemo(() => {
    if (!derivedConversations.length) {
      return [];
    }

    const query = searchQuery.trim().toLowerCase();
    const base = derivedConversations.filter((conversation) => {
      if (activeFilter === 'Non lus') {
        return conversation.unread > 0;
      }
      return true;
    });

    if (!query) {
      return base;
    }

    return base.filter((conversation) => {
      const haystack = `${conversation.title} ${conversation.subtitle} ${conversation.propertyTag ?? ''}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [activeFilter, derivedConversations, searchQuery]);

  const discussionsCount = filteredConversations.length;

  if (!isLoggedIn || !profileId) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
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
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Feather name="chevron-left" size={20} color={DARK} />
          </TouchableOpacity>
          <View style={[styles.pageTitleContainer, isAndroid && styles.pageTitleContainerAndroid]}>
            <Text style={styles.pageTitle}>Messages</Text>
            <Text style={styles.pageSubtitle}>Connectez-vous pour accéder à votre messagerie</Text>
          </View>
          {isAndroid ? <View style={styles.pageHeaderSpacerAndroid} /> : null}
        </View>

        <View style={styles.notLoggedContainer}>
          <Feather name="lock" size={36} color={PUOL_GREEN} />
          <Text style={styles.notLoggedTitle}>Messagerie réservée aux membres</Text>
          <Text style={styles.notLoggedSubtitle}>
            Identifiez-vous pour retrouver vos conversations avec les bailleurs et continuer vos échanges.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            activeOpacity={0.85}
            onPress={() => router.push('/login' as never)}
          >
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

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
        <View style={[styles.pageHeaderLeft, isAndroid && styles.pageHeaderLeftAndroid]}>
          <TouchableOpacity
            style={[styles.navButton, isAndroid && styles.navButtonAndroid]}
            onPress={() => router.back()}
            activeOpacity={0.75}
          >
            <Feather name="chevron-left" size={20} color={DARK} />
          </TouchableOpacity>
          <View style={[styles.pageTitleContainer, isAndroid && styles.pageTitleContainerAndroid]}>
            <Text style={styles.pageTitle}>Messages</Text>
            <Text style={styles.pageSubtitle}>Tous vos échanges avec les bailleurs</Text>
          </View>
        </View>
        {isAndroid ? <View style={styles.pageHeaderSpacerAndroid} /> : null}
      </View>

      <View style={styles.container}>
        <View style={styles.conversationMetaRow}>
          <View>
            <Text style={styles.sectionTitle}>Conversations</Text>
            <Text style={styles.sectionSubtitle}>
              {discussionsCount} discussion{discussionsCount > 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.inlineFilterGroup}>
            {FILTER_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.filterTab, activeFilter === tab && styles.filterTabActive]}
                onPress={() => handleSelectFilter(tab)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    activeFilter === tab ? styles.filterTabTextActive : styles.filterTabTextInactive,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.searchInputWrapper}>
          <Feather name="search" size={16} color={MUTED} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une conversation"
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color={MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={PUOL_GREEN} />
            <Text style={styles.loadingText}>Chargement de vos conversations…</Text>
          </View>
        ) : (
          <FlatList
            data={filteredConversations}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.conversationListContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={PUOL_GREEN} />}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.conversationCard}
                activeOpacity={0.9}
                onPress={() => {
                  if (profileId) {
                    const latestMessage = conversations.find((conversation) => conversation.id === item.id)?.latestMessage;
                    const latestTimestamp = latestMessage ? new Date(latestMessage.createdAt).getTime() : Date.now();
                    const safeTimestamp = Number.isNaN(latestTimestamp) ? Date.now() : latestTimestamp;
                    void recordConversationRead(profileId, item.id, safeTimestamp);
                    setReadMap((prev) => ({ ...prev, [item.id]: safeTimestamp }));
                  }
                  router.push(`/messages/${item.id}` as never);
                }}
              >
                <Avatar
                  source={item.avatarUri ? { uri: item.avatarUri } : undefined}
                  name={item.fallbackInitials}
                  size="large"
                />

                <View style={{ flex: 1 }}>
                  <View style={styles.conversationRow}>
                    <Text style={styles.conversationName} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.conversationTime}>{item.lastActivityLabel}</Text>
                  </View>
                  <Text style={styles.conversationSubtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                  <Text style={styles.conversationLastMessage} numberOfLines={1}>
                    {item.lastMessageSnippet}
                  </Text>
                  {item.propertyTag ? (
                    <View style={styles.propertyTag}>
                      <Feather name="home" size={12} color={PUOL_GREEN} />
                      <Text style={styles.propertyTagText}>{item.propertyTag}</Text>
                    </View>
                  ) : null}
                </View>

                {item.unread > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{item.unread}</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyConversations}>
                <Feather name="mail" size={28} color="#9CA3AF" />
                <Text style={styles.emptyConversationsTitle}>Aucune discussion</Text>
                <Text style={styles.emptyConversationsSubtitle}>
                  Lancez une conversation depuis une annonce.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F6F7F9',
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
  },
  navButtonAndroid: {
    borderWidth: 0,
    backgroundColor: '#F3F4F6',
  },
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pageHeaderLeftAndroid: {
    gap: 12,
  },
  pageTitleContainer: {
    flex: 1,
  },
  pageTitleContainerAndroid: {
    marginLeft: 4,
  },
  pageHeaderSpacerAndroid: {
    width: 40,
  },
  pageTitle: {
    fontFamily: 'Manrope',
    fontSize: 26,
    fontWeight: '700',
    color: DARK,
  },
  pageSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
    marginTop: 4,
  },
  notLoggedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
  },
  notLoggedTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: DARK,
    textAlign: 'center',
  },
  notLoggedSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
    textAlign: 'center',
    lineHeight: 20,
  },
  loginButton: {
    marginTop: 6,
    backgroundColor: PUOL_GREEN,
    borderRadius: 999,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  loginButtonText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterTabActive: {
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderColor: 'rgba(46,204,113,0.3)',
  },
  filterTabText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
  },
  filterTabTextActive: {
    color: PUOL_GREEN,
  },
  filterTabTextInactive: {
    color: MUTED,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  conversationMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
  },
  sectionSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: MUTED,
  },
  inlineFilterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Manrope',
    fontSize: 13,
    color: DARK,
  },
  conversationListContent: {
    paddingBottom: 20,
  },
  conversationCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'transparent',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  conversationAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: MUTED,
  },
  conversationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  conversationName: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '600',
    color: DARK,
  },
  conversationNameActive: {
    color: PUOL_GREEN,
  },
  conversationTime: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: '#9CA3AF',
  },
  conversationSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
  },
  conversationLastMessage: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#374151',
    marginTop: 4,
  },
  propertyTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  propertyTagText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: PUOL_GREEN,
  },
  unreadBadge: {
    backgroundColor: PUOL_GREEN,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
  },
  unreadText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptyConversations: {
    marginTop: 60,
    alignItems: 'center',
    gap: 6,
  },
  emptyConversationsTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: DARK,
  },
  emptyConversationsSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: MUTED,
    textAlign: 'center',
  },
});
