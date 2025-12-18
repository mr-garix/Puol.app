import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/src/supabaseClient';
import type { HostLikeActivity, HostLikeSummary } from '../types';
import { getLandlordLikeActivities } from '../services';

const EMPTY_SUMMARY: HostLikeSummary = { total: 0, byListing: {} };

export const useLandlordLikeActivities = (landlordId?: string | null) => {
  const [activities, setActivities] = useState<HostLikeActivity[]>([]);
  const [summary, setSummary] = useState<HostLikeSummary>(EMPTY_SUMMARY);
  const [isLoading, setIsLoading] = useState(false);

  const loadActivities = useCallback(async () => {
    if (!landlordId) {
      setActivities([]);
      setSummary(EMPTY_SUMMARY);
      return;
    }

    setIsLoading(true);
    try {
      const { activities: fetchedActivities, summary: fetchedSummary } = await getLandlordLikeActivities(landlordId);
      setActivities(fetchedActivities);
      setSummary(fetchedSummary);
    } catch (error) {
      console.error('[useLandlordLikeActivities] Failed to load landlord like activities', error);
    } finally {
      setIsLoading(false);
    }
  }, [landlordId]);

  useEffect(() => {
    void loadActivities();
  }, [loadActivities]);

  useEffect(() => {
    if (!landlordId) {
      return undefined;
    }

    const channel = supabase
      .channel(`landlord-likes:${landlordId}`)
      .on('postgres_changes', { schema: 'public', table: 'listing_likes', event: '*' }, () => {
        void loadActivities();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [landlordId, loadActivities]);

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
