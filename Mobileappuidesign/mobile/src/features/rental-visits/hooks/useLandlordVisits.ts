import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
import {
  fetchLandlordRentalVisitById,
  fetchLandlordRentalVisits,
  type LandlordRentalVisit,
} from '@/src/features/rental-visits/services';

interface UseLandlordVisitsResult {
  visits: LandlordRentalVisit[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getVisitById: (id: string) => LandlordRentalVisit | undefined;
  fetchVisit: (id: string) => Promise<LandlordRentalVisit | null>;
  visitsCount: number;
}

export const useLandlordVisits = (): UseLandlordVisitsResult => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const isLandlord = supabaseProfile?.role === 'landlord';
  const [visits, setVisits] = useState<LandlordRentalVisit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPolledRef = useRef<number>(0);

  const refresh = useCallback(async () => {
    if (!isLoggedIn || !supabaseProfile || !isLandlord) {
      setVisits([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchLandlordRentalVisits(supabaseProfile.id);
      // Sécurité côté client : ne garder que les visites liées au bailleur courant.
      const filtered = data.filter((visit) => visit.landlordProfileId === supabaseProfile.id);
      setVisits(filtered);
      setError(null);
    } catch (err) {
      console.error('[useLandlordVisits] Failed to fetch landlord visits', err);
      setError('unable_to_load_landlord_visits');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, supabaseProfile, isLandlord]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // 🔄 Polling intelligent : recharger les visites toutes les 15 secondes
  useEffect(() => {
    if (!isLoggedIn || !supabaseProfile || !isLandlord) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    console.log('[useLandlordVisits] Starting polling for new visits');

    const pollForNewVisits = async () => {
      const now = Date.now();
      if (now - lastPolledRef.current < 15000) {
        return; // Ne pas poller plus souvent que toutes les 15 secondes
      }

      lastPolledRef.current = now;

      try {
        const freshVisits = await fetchLandlordRentalVisits(supabaseProfile.id);

        // Comparer avec les anciennes visites pour détecter les nouvelles
        const oldVisitIds = new Set(visits.map(v => v.id));
        const newVisits = freshVisits.filter(v => !oldVisitIds.has(v.id));

        if (newVisits.length > 0) {
          console.log('[useLandlordVisits] Detected new visits via polling:', newVisits.map(v => v.id));
        }

        // Mettre à jour l'état avec les visites fraîches
        setVisits(freshVisits);
      } catch (err) {
        console.error('[useLandlordVisits] Polling error:', err);
      }
    };

    pollingIntervalRef.current = setInterval(pollForNewVisits, 15000);

    // Faire un premier poll immédiatement
    pollForNewVisits();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isLoggedIn, supabaseProfile, isLandlord, visits]);

  const getVisitById = useCallback(
    (id: string) => visits.find((visit) => visit.id === id),
    [visits],
  );

  const fetchVisit = useCallback(
    async (id: string) => {
      if (!supabaseProfile || !isLandlord) {
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
        console.error('[useLandlordVisits] Failed to fetch landlord visit by id', err);
        return null;
      }
    },
    [supabaseProfile, isLandlord],
  );

  return useMemo(
    () => ({ visits, isLoading, error, refresh, getVisitById, fetchVisit, visitsCount: visits.length }),
    [visits, isLoading, error, refresh, getVisitById, fetchVisit],
  );
};
