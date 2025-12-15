import { useCallback, useEffect, useMemo, useState } from 'react';

import type { UnreadMap } from '../unreadStorage';
import {
  ensureConversationKeys,
  getUnreadSnapshot,
  incrementUnreadCount,
  initializeUnread,
  resetUnreadCount,
  resetUnreadCountsBulk,
  subscribeUnread,
} from '../unreadStorage';

export interface UseUnreadBadgeResult {
  unreadMap: UnreadMap;
  totalUnread: number;
  ensureTrackedConversations: (conversationIds: string[]) => Promise<void>;
  incrementUnread: (conversationId: string, step?: number) => Promise<void>;
  resetUnread: (conversationId: string) => Promise<void>;
  resetUnreadBulk: (conversationIds: string[]) => Promise<void>;
  getSnapshot: () => UnreadMap;
}

export const useUnreadBadge = (profileId: string | null): UseUnreadBadgeResult => {
  const [unreadMap, setUnreadMap] = useState<UnreadMap>({});

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    if (!profileId) {
      setUnreadMap({});
      return () => {
        unsubscribe?.();
      };
    }

    void initializeUnread(profileId).then((initial) => {
      if (isMounted) {
        setUnreadMap({ ...initial });
      }
    });

    unsubscribe = subscribeUnread(profileId, (next) => {
      if (isMounted) {
        setUnreadMap({ ...next });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [profileId]);

  const ensureTrackedConversations = useCallback(
    async (conversationIds: string[]) => {
      if (!profileId || conversationIds.length === 0) {
        return;
      }
      await ensureConversationKeys(profileId, conversationIds);
    },
    [profileId],
  );

  const incrementUnread = useCallback(
    async (conversationId: string, step = 1) => {
      if (!profileId || !conversationId) {
        return;
      }
      await incrementUnreadCount(profileId, conversationId, step);
    },
    [profileId],
  );

  const resetUnread = useCallback(
    async (conversationId: string) => {
      if (!profileId || !conversationId) {
        return;
      }
      await resetUnreadCount(profileId, conversationId);
    },
    [profileId],
  );

  const resetUnreadBulk = useCallback(
    async (conversationIds: string[]) => {
      if (!profileId || conversationIds.length === 0) {
        return;
      }
      await resetUnreadCountsBulk(profileId, conversationIds);
    },
    [profileId],
  );

  const getSnapshot = useCallback(() => {
    if (!profileId) {
      return {};
    }
    return getUnreadSnapshot(profileId);
  }, [profileId]);

  const totalUnread = useMemo(
    () => Object.values(unreadMap).reduce((accumulator, value) => accumulator + (value ?? 0), 0),
    [unreadMap],
  );

  return {
    unreadMap,
    totalUnread,
    ensureTrackedConversations,
    incrementUnread,
    resetUnread,
    resetUnreadBulk,
    getSnapshot,
  };
};
