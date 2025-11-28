import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  TextInput,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import type { Conversation } from './mockData';
import { MOCK_CONVERSATIONS } from './mockData';

const PUOL_GREEN = '#2ECC71';
const DARK = '#111827';
const MUTED = '#6B7280';
const BORDER = '#E5E7EB';

const FILTER_TABS = ['Tous', 'Non lus'];

const CONVERSATIONS: Conversation[] = MOCK_CONVERSATIONS;

export default function MessagesScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState(FILTER_TABS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectFilter = (tab: string) => {
    setActiveFilter(tab);
  };

  const filteredConversations = useMemo(() => {
    const filterFn = (conversation: (typeof CONVERSATIONS)[number]) => {
      if (activeFilter === 'Non lus') {
        return conversation.unread > 0;
      }
      return true;
    };

    const query = searchQuery.trim().toLowerCase();
    const base = CONVERSATIONS.filter(filterFn);

    if (!query) {
      return base;
    }

    return base.filter((conversation) => {
      const haystack = `${conversation.name} ${conversation.subtitle} ${conversation.propertyTag}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [activeFilter, searchQuery]);

  const discussionsCount = filteredConversations.length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      <View style={styles.pageHeader}>
        <View style={styles.pageHeaderLeft}>
          <TouchableOpacity style={styles.navButton} onPress={() => router.back()} activeOpacity={0.75}>
            <Feather name="chevron-left" size={20} color={DARK} />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Messages</Text>
            <Text style={styles.pageSubtitle}>Tous vos échanges avec les bailleurs</Text>
          </View>
        </View>
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

        <FlatList
          data={filteredConversations}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.conversationListContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.conversationCard}
              activeOpacity={0.9}
              onPress={() => router.push(`/messages/${item.id}` as never)}
            >
              <Image source={{ uri: item.avatar }} style={styles.conversationAvatar} />

              <View style={{ flex: 1 }}>
                <View style={styles.conversationRow}>
                  <Text style={styles.conversationName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.conversationTime}>09:32</Text>
                </View>
                <Text style={styles.conversationSubtitle}>{item.subtitle}</Text>
                <Text style={styles.conversationLastMessage} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
                <View style={styles.propertyTag}>
                  <Feather name="home" size={12} color={PUOL_GREEN} />
                  <Text style={styles.propertyTagText}>{item.propertyTag}</Text>
                </View>
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
