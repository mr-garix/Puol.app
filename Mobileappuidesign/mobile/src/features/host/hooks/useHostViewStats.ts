import { useCallback, useEffect, useRef, useState } from 'react';

import { supabase } from '@/src/supabaseClient';

interface HostViewStats {
  total: number;
}

const EMPTY_STATS: HostViewStats = {
  total: 0,
};

export const useHostViewStats = (hostId?: string | null) => {
  const [stats, setStats] = useState<HostViewStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const listingIdsRef = useRef<Set<string>>(new Set());

  const loadStats = useCallback(async () => {
    if (!hostId) {
      setStats(EMPTY_STATS);
      setHasLoaded(true);
      return;
    }

    setIsLoading(true);
    try {
      const { data: listings, error: listingsError } = await supabase
        .from('listings')
        .select('id')
        .eq('host_id', hostId);

      if (listingsError) {
        throw listingsError;
      }

      const listingIds = (listings ?? [])
        .map((row) => row.id)
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

      listingIdsRef.current = new Set(listingIds);

      if (listingIds.length === 0) {
        setStats(EMPTY_STATS);
        setHasLoaded(true);
        return;
      }

      const { count, error: viewsError } = await supabase
        .from('listing_views')
        .select('listing_id', { count: 'exact', head: true })
        .in('listing_id', listingIds);

      if (viewsError) {
        throw viewsError;
      }

      setStats({ total: count ?? 0 });
      setHasLoaded(true);
    } catch (error) {
      console.error('[useHostViewStats] Failed to load host view stats', error);
      setStats(EMPTY_STATS);
      setHasLoaded(true);
    } finally {
      setIsLoading(false);
    }
  }, [hostId]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    if (!hostId) {
      return undefined;
    }

    type ListingViewRow = { listing_id?: string | null };

    const channel = supabase
      .channel(`host-views:${hostId}`)
      .on('postgres_changes', { schema: 'public', table: 'listing_views', event: '*' }, (payload) => {
        const nextRow = (payload.new as ListingViewRow | null) ?? null;
        const prevRow = (payload.old as ListingViewRow | null) ?? null;
        const listingId = nextRow?.listing_id ?? prevRow?.listing_id ?? null;
        if (!listingId || !listingIdsRef.current.has(listingId)) {
          return;
        }

        setStats((current) => {
          if (payload.eventType === 'INSERT') {
            return { total: current.total + 1 };
          }
          if (payload.eventType === 'DELETE') {
            return { total: Math.max(0, current.total - 1) };
          }
          return current;
        });
      })
      .on('postgres_changes', { schema: 'public', table: 'listings', event: '*', filter: `host_id=eq.${hostId}` }, () => {
        void loadStats();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [hostId, loadStats]);

  return {
    stats,
    total: stats.total,
    isLoading,
    hasLoaded,
    refresh: loadStats,
  };
};
