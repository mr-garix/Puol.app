import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';
import { getLandlordListingsByProfileId, type LandlordListingWithRelations } from './services';

interface HookState<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export const useLandlordDashboardListings = (): HookState<LandlordListingWithRelations[]> => {
  const { supabaseProfile } = useAuth();
  const [data, setData] = useState<LandlordListingWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const listingIdsRef = useRef<Set<string>>(new Set());
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!supabaseProfile?.id) {
      setData([]);
      listingIdsRef.current = new Set();
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await getLandlordListingsByProfileId(supabaseProfile.id);
      setData(result);
      listingIdsRef.current = new Set(result.map((item) => item.listing.id));
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [supabaseProfile?.id]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      return;
    }
    refreshTimeoutRef.current = setTimeout(() => {
      refreshTimeoutRef.current = null;
      void refresh();
    }, 300);
  }, [refresh]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabaseProfile?.id) {
      return undefined;
    }

    const handleListingsChange = () => {
      scheduleRefresh();
    };

    const handleRelatedChange = (payload: { new: Record<string, unknown> | null; old: Record<string, unknown> | null }) => {
      const listingId = (payload.new as { listing_id?: string; listingId?: string } | null)?.listing_id
        ?? (payload.old as { listing_id?: string; listingId?: string } | null)?.listing_id
        ?? (payload.new as { listingId?: string } | null)?.listingId
        ?? (payload.old as { listingId?: string } | null)?.listingId;

      if (!listingId) {
        scheduleRefresh();
        return;
      }

      if (listingIdsRef.current.has(String(listingId))) {
        scheduleRefresh();
      }
    };

    const channel = supabase
      .channel(`landlord-dashboard-${supabaseProfile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'listings',
          filter: `host_id=eq.${supabaseProfile.id}`,
        },
        handleListingsChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listing_views' },
        handleRelatedChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listing_likes' },
        handleRelatedChange,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'listing_comments' },
        handleRelatedChange,
      )
      .subscribe();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      supabase.removeChannel(channel);
    };
  }, [scheduleRefresh, supabaseProfile?.id]);

  const state = useMemo<HookState<LandlordListingWithRelations[]>>(
    () => ({
      data,
      isLoading,
      error,
      refresh,
    }),
    [data, error, isLoading, refresh],
  );

  return state;
};

export const useLandlordListingStats = () => {
  const { data: listings, isLoading } = useLandlordDashboardListings();

  const stats = {
    total: listings?.length || 0,
    available: listings?.filter((l: LandlordListingWithRelations) => l.listing.is_available).length || 0,
    unavailable: listings?.filter((l: LandlordListingWithRelations) => !l.listing.is_available).length || 0,
    furnished: listings?.filter((l: LandlordListingWithRelations) => l.listing.is_furnished).length || 0, // Devrait être 0 pour landlords
    unfurnished: listings?.filter((l: LandlordListingWithRelations) => !l.listing.is_furnished).length || 0, // Devrait être total pour landlords
  };

  return {
    stats,
    isLoading,
  };
};

// Hook pour obtenir une annonce spécifique avec ses relations
export const useLandlordListingDetail = (listingId: string | null): HookState<LandlordListingWithRelations> => {
  const [data, setData] = useState<LandlordListingWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    if (!listingId) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Réutiliser la fonction existante qui récupère déjà les relations
      const { getLandlordListingById } = await import('./services');
      const result = await getLandlordListingById(listingId);
      setData(result);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [listingId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const state = useMemo<HookState<LandlordListingWithRelations>>(
    () => ({
      data,
      isLoading,
      error,
      refresh,
    }),
    [data, error, isLoading, refresh],
  );

  return state;
};
