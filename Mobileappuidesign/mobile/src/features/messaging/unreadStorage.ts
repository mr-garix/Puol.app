import AsyncStorage from '@react-native-async-storage/async-storage';

export type UnreadMap = Record<string, number>;

const STORAGE_PREFIX = 'puol:messages:unread:';

const caches: Record<string, UnreadMap> = {};
const listeners: Record<string, Set<(map: UnreadMap) => void>> = {};

const storageKey = (profileId: string) => `${STORAGE_PREFIX}${profileId}`;

const getCache = (profileId: string): UnreadMap => {
  if (!caches[profileId]) {
    caches[profileId] = {};
  }
  return caches[profileId];
};

const setCache = (profileId: string, map: UnreadMap) => {
  caches[profileId] = map;
};

const notify = (profileId: string) => {
  const snapshot = { ...getCache(profileId) };
  const bucket = listeners[profileId];
  if (!bucket) {
    return;
  }
  bucket.forEach((listener) => {
    try {
      listener(snapshot);
    } catch (error) {
      console.warn('[unreadStorage] listener error', error);
    }
  });
};

const persist = async (profileId: string) => {
  const key = storageKey(profileId);
  try {
    await AsyncStorage.setItem(key, JSON.stringify(getCache(profileId)));
  } catch (error) {
    console.warn('[unreadStorage] persist failed', error);
  }
};

export const initializeUnread = async (profileId: string): Promise<UnreadMap> => {
  if (!profileId) {
    return {};
  }
  const key = storageKey(profileId);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as UnreadMap;
      setCache(profileId, parsed ?? {});
    } else {
      setCache(profileId, {});
    }
  } catch (error) {
    console.warn('[unreadStorage] initialize failed', error);
    setCache(profileId, {});
  }
  notify(profileId);
  return getCache(profileId);
};

export const subscribeUnread = (profileId: string, listener: (map: UnreadMap) => void) => {
  if (!listeners[profileId]) {
    listeners[profileId] = new Set();
  }
  listeners[profileId]!.add(listener);
  listener({ ...getCache(profileId) });
  return () => {
    listeners[profileId]?.delete(listener);
    if (listeners[profileId] && listeners[profileId]!.size === 0) {
      delete listeners[profileId];
    }
  };
};

export const ensureConversationKeys = async (profileId: string, conversationIds: string[]) => {
  if (!profileId) {
    return;
  }
  const cache = getCache(profileId);
  let mutated = false;
  conversationIds.forEach((id) => {
    if (typeof cache[id] !== 'number') {
      cache[id] = 0;
      mutated = true;
    }
  });
  if (mutated) {
    notify(profileId);
    await persist(profileId);
  }
};

export const incrementUnreadCount = async (profileId: string, conversationId: string, step = 1) => {
  if (!profileId || !conversationId) {
    return;
  }
  const cache = getCache(profileId);
  cache[conversationId] = Math.max(0, (cache[conversationId] ?? 0) + step);
  notify(profileId);
  await persist(profileId);
};

export const resetUnreadCount = async (profileId: string, conversationId: string) => {
  if (!profileId || !conversationId) {
    return;
  }
  const cache = getCache(profileId);
  if (cache[conversationId] !== 0) {
    cache[conversationId] = 0;
    notify(profileId);
    await persist(profileId);
  }
};

export const resetUnreadCountsBulk = async (profileId: string, conversationIds: string[]) => {
  if (!profileId) {
    return;
  }
  const cache = getCache(profileId);
  let mutated = false;
  conversationIds.forEach((id) => {
    if (cache[id] !== 0) {
      cache[id] = 0;
      mutated = true;
    }
  });
  if (mutated) {
    notify(profileId);
    await persist(profileId);
  }
};

export const getUnreadSnapshot = (profileId: string): UnreadMap => ({ ...getCache(profileId) });
