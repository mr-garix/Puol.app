import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/src/supabaseClient';
import type { HostLikeActivity, HostLikeSummary } from '../types';
import { getHostLikeActivities } from '../services';

const EMPTY_SUMMARY: HostLikeSummary = { total: 0, byListing: {} };

export const useHostLikeActivities = (hostId?: string | null) => {
  const [activities, setActivities] = useState<HostLikeActivity[]>([]);
  const [summary, setSummary] = useState<HostLikeSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);

  const loadActivities = useCallback(async () => {
    if (!hostId) {
      setActivities([]);
      setSummary(EMPTY_SUMMARY);
      return;
    }

    setIsLoading(true);
    try {
      const { activities: fetchedActivities, summary: fetchedSummary } = await getHostLikeActivities(hostId);
      setActivities(fetchedActivities);
      setSummary(fetchedSummary);
    } catch (error) {
      console.error('[useHostLikeActivities] Failed to load host like activities', error);
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    if (!hostId) {
      return undefined;
    }

    const channel = supabase
      .channel(`host-likes:${hostId}`)
      .on('postgres_changes', { schema: 'public', table: 'listing_likes', event: '*' }, () => {
        void loadActivities();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hostId, loadActivities]);

  const latestActivityByListing = useMemo(() => {
    return activities.reduce<Record<string, HostLikeActivity>>((acc, activity) => {
      const listingId = activity.listingId;
      if (!listingId) {
        return acc;
      }

      const previous = acc[listingId];
      if (!previous) {
        acc[listingId] = activity;
        return acc;
      }

      const previousTime = new Date(previous.createdAt).getTime();
      const currentTime = new Date(activity.createdAt).getTime();
      if (Number.isNaN(previousTime) || Number.isNaN(currentTime) || currentTime > previousTime) {
        acc[listingId] = activity;
      }

      return acc;
    }, {});
  }, [activities]);

  return {
    activities,
    summary,
    isLoading,
    refresh: loadActivities,
    latestActivityByListing,
  };
};
