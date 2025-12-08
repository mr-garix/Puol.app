import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  followProfile,
  getFollowStats,
  getIsFollowing,
  type FollowActionResult,
  unfollowProfile,
} from '@/src/features/follows/services';
import { supabase } from '@/src/supabaseClient';

type FollowStats = {
  followersCount: number;
  followingCount: number;
};

const followStatusCache = new Map<string, boolean>();
const reverseFollowStatusCache = new Map<string, boolean>();
const followStatsCache = new Map<string, FollowStats>();

const buildStatusCacheKey = (followerId?: string | null, followedId?: string | null) => {
  if (!followerId || !followedId) {
    return null;
  }
  return `${followerId}:${followedId}`;
};

const updateStatsCache = (profileId: string, updater: (current: FollowStats | null) => FollowStats | null) => {
  const next = updater(followStatsCache.get(profileId) ?? null);
  if (next) {
    followStatsCache.set(profileId, next);
  } else {
    followStatsCache.delete(profileId);
  }
  return next;
};

export const useFollowStats = (profileId?: string | null, options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;
  const [stats, setStats] = useState<FollowStats | null>(() => {
    if (!profileId) {
      return null;
    }
    return followStatsCache.get(profileId) ?? null;
  });
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || !profileId) {
      setStats(null);
      return null;
    }

    setIsFetching(true);
    try {
      const result = await getFollowStats(profileId);
      followStatsCache.set(profileId, result);
      setStats(result);
      setError(null);
      return result;
    } catch (err) {
      const errorObject = err instanceof Error ? err : new Error(String(err));
      setError(errorObject);
      throw errorObject;
    } finally {
      setIsFetching(false);
    }
  }, [enabled, profileId]);

  const applyDelta = useCallback(
    (deltaFollowers: number, deltaFollowing = 0) => {
      if (!profileId) {
        return;
      }
      setStats((current) => {
        const base = current ?? followStatsCache.get(profileId) ?? { followersCount: 0, followingCount: 0 };
        const next: FollowStats = {
          followersCount: Math.max(0, base.followersCount + deltaFollowers),
          followingCount: Math.max(0, base.followingCount + deltaFollowing),
        };
        followStatsCache.set(profileId, next);
        return next;
      });
    },
    [profileId],
  );

  useEffect(() => {
    if (!enabled || !profileId) {
      setStats(null);
      return;
    }

    if (!followStatsCache.has(profileId)) {
      void refresh();
    } else {
      setStats(followStatsCache.get(profileId) ?? null);
      // Fetch latest in background
      void refresh();
    }
  }, [enabled, profileId, refresh]);

  useEffect(() => {
    if (!enabled || !profileId) {
      return;
    }

    const channel = supabase
      .channel(`profile-follow-stats:${profileId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_follows', filter: `followed_id=eq.${profileId}` },
        () => {
          void refresh();
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profile_follows', filter: `follower_id=eq.${profileId}` },
        () => {
          void refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, profileId, refresh]);

  return {
    stats,
    followersCount: stats?.followersCount ?? null,
    followingCount: stats?.followingCount ?? null,
    isFetching,
    error,
    refresh,
    applyDelta,
  };
};

type UseFollowStateParams = {
  followerId?: string | null;
  followedId?: string | null;
  enabled?: boolean;
};

type UseFollowStateResult = {
  isFollowing: boolean;
  isFollowedByTarget: boolean;
  isMutual: boolean;
  isReady: boolean;
  isProcessing: boolean;
  followersCount: number | null;
  followingCount: number | null;
  toggleFollow: () => Promise<FollowActionResult | null>;
  refreshStats: () => Promise<FollowStats | null>;
};

export const useFollowState = ({
  followerId,
  followedId,
  enabled = true,
}: UseFollowStateParams): UseFollowStateResult => {
  const isSameProfile = Boolean(followerId && followedId && followerId === followedId);
  const shouldEnable = enabled && Boolean(followerId) && Boolean(followedId) && !isSameProfile;

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedByTarget, setIsFollowedByTarget] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const statusCacheKey = useMemo(() => buildStatusCacheKey(followerId, followedId), [followerId, followedId]);
  const reverseStatusCacheKey = useMemo(
    () => buildStatusCacheKey(followedId, followerId),
    [followerId, followedId],
  );

  const {
    followersCount,
    followingCount,
    refresh: refreshStats,
    applyDelta,
  } = useFollowStats(followedId, { enabled: Boolean(followedId) });

  useEffect(() => {
    if (!shouldEnable || !statusCacheKey) {
      setIsFollowing(false);
      setIsReady(false);
      return;
    }

    const cachedValue = followStatusCache.get(statusCacheKey);
    if (typeof cachedValue === 'boolean') {
      setIsFollowing(cachedValue);
      setIsReady(true);
    } else {
      setIsReady(false);
    }

    let isMounted = true;
    void (async () => {
      try {
        const result = await getIsFollowing(followerId as string, followedId as string);
        followStatusCache.set(statusCacheKey, result);
        if (isMounted) {
          setIsFollowing(result);
          setIsReady(true);
        }
      } catch (error) {
        console.error('[useFollowState] Failed to determine follow status', error);
        if (isMounted) {
          setIsReady(true);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [followedId, followerId, shouldEnable, statusCacheKey]);

  useEffect(() => {
    if (!shouldEnable || !reverseStatusCacheKey) {
      setIsFollowedByTarget(false);
      return;
    }

    const cachedValue = reverseFollowStatusCache.get(reverseStatusCacheKey);
    if (typeof cachedValue === 'boolean') {
      setIsFollowedByTarget(cachedValue);
    }

    let isMounted = true;
    void (async () => {
      try {
        const result = await getIsFollowing(followedId as string, followerId as string);
        reverseFollowStatusCache.set(reverseStatusCacheKey, result);
        if (isMounted) {
          setIsFollowedByTarget(result);
        }
      } catch (error) {
        console.error('[useFollowState] Failed to determine reverse follow status', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [followedId, followerId, reverseStatusCacheKey, shouldEnable]);

  useEffect(() => {
    if (!shouldEnable || !followerId || !followedId || !statusCacheKey) {
      return;
    }

    const channel = supabase
      .channel(`follow-state:${followerId}:${followedId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_follows',
          filter: `follower_id=eq.${followerId}`,
        },
        (payload) => {
          const newRow = payload.new as { follower_id?: string; followed_id?: string } | null;
          if (newRow?.followed_id === followedId) {
            followStatusCache.set(statusCacheKey, true);
            setIsFollowing(true);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'profile_follows',
          filter: `follower_id=eq.${followerId}`,
        },
        (payload) => {
          const oldRow = payload.old as { follower_id?: string; followed_id?: string } | null;
          if (oldRow?.followed_id === followedId) {
            followStatusCache.set(statusCacheKey, false);
            setIsFollowing(false);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [followedId, followerId, shouldEnable, statusCacheKey]);

  useEffect(() => {
    if (!shouldEnable || !followerId || !followedId || !reverseStatusCacheKey) {
      return;
    }

    const channel = supabase
      .channel(`follow-reverse-state:${followedId}:${followerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profile_follows',
          filter: `follower_id=eq.${followedId}`,
        },
        (payload) => {
          const newRow = payload.new as { follower_id?: string; followed_id?: string } | null;
          if (newRow?.followed_id === followerId) {
            reverseFollowStatusCache.set(reverseStatusCacheKey, true);
            setIsFollowedByTarget(true);
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'profile_follows',
          filter: `follower_id=eq.${followedId}`,
        },
        (payload) => {
          const oldRow = payload.old as { follower_id?: string; followed_id?: string } | null;
          if (oldRow?.followed_id === followerId) {
            reverseFollowStatusCache.set(reverseStatusCacheKey, false);
            setIsFollowedByTarget(false);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [followedId, followerId, reverseStatusCacheKey, shouldEnable]);

  const toggleFollow = useCallback(async () => {
    if (!shouldEnable || !followerId || !followedId || isProcessing) {
      return null;
    }

    const nextIsFollowing = !isFollowing;
    const cacheKey = buildStatusCacheKey(followerId, followedId);
    const followerDelta = nextIsFollowing ? 1 : -1;

    if (cacheKey) {
      followStatusCache.set(cacheKey, nextIsFollowing);
    }

    setIsProcessing(true);
    setIsFollowing(nextIsFollowing);
    applyDelta(followerDelta);

    try {
      const action = nextIsFollowing ? followProfile : unfollowProfile;
      const result = await action(followerId, followedId);
      await refreshStats();
      return result;
    } catch (error) {
      console.error('[useFollowState] toggleFollow error', error);
      // revert optimistic update
      if (cacheKey) {
        followStatusCache.set(cacheKey, !nextIsFollowing);
      }
      setIsFollowing((prev) => !prev);
      applyDelta(-followerDelta);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [applyDelta, followedId, followerId, isFollowing, isProcessing, refreshStats, shouldEnable]);

  return {
    isFollowing,
    isFollowedByTarget,
    isMutual: isFollowing && isFollowedByTarget,
    isReady: isSameProfile ? true : isReady,
    isProcessing,
    followersCount,
    followingCount,
    toggleFollow,
    refreshStats,
  };
};
