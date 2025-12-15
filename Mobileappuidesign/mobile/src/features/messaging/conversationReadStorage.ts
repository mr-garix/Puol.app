import AsyncStorage from '@react-native-async-storage/async-storage';

export type ConversationReadMap = Record<string, number>;

const STORAGE_PREFIX = 'puol:messages:last_read:';

const storageKey = (profileId: string) => `${STORAGE_PREFIX}${profileId}`;

export const loadConversationReadMap = async (profileId: string | null): Promise<ConversationReadMap> => {
  if (!profileId) {
    return {};
  }
  try {
    const raw = await AsyncStorage.getItem(storageKey(profileId));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as ConversationReadMap;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {};
  } catch (error) {
    console.warn('[conversationReadStorage] load failed', error);
    return {};
  }
};

const persistMap = async (profileId: string, map: ConversationReadMap) => {
  try {
    await AsyncStorage.setItem(storageKey(profileId), JSON.stringify(map));
  } catch (error) {
    console.warn('[conversationReadStorage] persist failed', error);
  }
};

export const recordConversationRead = async (
  profileId: string | null,
  conversationId: string,
  timestamp: number,
): Promise<void> => {
  if (!profileId || !conversationId) {
    return;
  }
  try {
    const map = await loadConversationReadMap(profileId);
    if ((map[conversationId] ?? 0) >= timestamp) {
      return;
    }
    map[conversationId] = timestamp;
    await persistMap(profileId, map);
  } catch (error) {
    console.warn('[conversationReadStorage] record failed', error);
  }
};
