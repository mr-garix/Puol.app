import { useCallback, useEffect, useMemo, useState } from 'react';

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
