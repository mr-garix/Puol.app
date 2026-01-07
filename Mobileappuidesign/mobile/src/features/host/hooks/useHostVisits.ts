import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
import {
  fetchLandlordRentalVisitById,
  fetchLandlordRentalVisits,
  type LandlordRentalVisit,
} from '@/src/features/rental-visits/services';

interface UseHostVisitsResult {
  visits: LandlordRentalVisit[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getVisitById: (id: string) => LandlordRentalVisit | undefined;
  fetchVisit: (id: string) => Promise<LandlordRentalVisit | null>;
  visitsCount: number;
}

export const useHostVisits = (): UseHostVisitsResult => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const isHost = supabaseProfile?.role === 'host';
  const [visits, setVisits] = useState<LandlordRentalVisit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPolledRef = useRef<number>(0);

  const refresh = useCallback(async () => {
    if (!isLoggedIn || !supabaseProfile || !isHost) {
      setVisits([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchLandlordRentalVisits(supabaseProfile.id);
      setVisits(data);
      setError(null);
    } catch (err) {
      console.error('[useHostVisits] Failed to load host visits', err);
      setError('unable_to_load_host_visits');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, supabaseProfile, isHost]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const getVisitById = useCallback(
    (id: string) => visits.find((visit) => visit.id === id),
    [visits],
  );

  const fetchVisit = useCallback(
    async (id: string) => {
      if (!supabaseProfile || !isHost) {
        return null;
      }

      try {
        const visit = await fetchLandlordRentalVisitById(supabaseProfile.id, id);
        if (visit) {
          setVisits((previous) => {
            const existingIndex = previous.findIndex((item) => item.id === visit.id);
            if (existingIndex >= 0) {
              const copy = [...previous];
              copy[existingIndex] = visit;
              return copy;
            }
            return [visit, ...previous];
          });
        }
        return visit;
      } catch (err) {
        console.error('[useHostVisits] Failed to fetch visit by id', err);
        return null;
      }
    },
    [supabaseProfile, isHost],
  );

  // 🔄 Polling intelligent : recharger les visites toutes les 15 secondes
  useEffect(() => {
    if (!isLoggedIn || !supabaseProfile || !isHost) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    const pollForNewVisits = async () => {
      const now = Date.now();
      if (now - lastPolledRef.current < 15000) {
        return;
      }

      lastPolledRef.current = now;

      try {
        const freshVisits = await fetchLandlordRentalVisits(supabaseProfile.id);
        setVisits(freshVisits);
      } catch (err) {
        console.error('[useHostVisits] Polling error:', err);
      }
    };

    pollingIntervalRef.current = setInterval(pollForNewVisits, 15000);
    pollForNewVisits();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isLoggedIn, supabaseProfile, isHost, visits]);

  return useMemo(
    () => ({
      visits,
      isLoading,
      error,
      refresh,
      getVisitById,
      fetchVisit,
      visitsCount: visits.length,
    }),
    [visits, isLoading, error, refresh, getVisitById, fetchVisit],
  );
};
