import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
import {
  cancelRentalVisit,
  checkRentalVisitAvailability,
  createRentalVisit,
  fetchGuestRentalVisits,
  fetchOccupiedTimeslots,
  fetchExistingVisitForListing,
  updateRentalVisit,
  type GuestRentalVisit,
  type RentalVisitStatus,
} from '@/src/features/rental-visits/services';

export type VisitStatus = RentalVisitStatus;

export interface VisitRecord {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage?: string | null;
  propertyLocation: string;
  propertyBedrooms?: number | null;
  propertyKitchens?: number | null;
  propertyLivingRooms?: number | null;
  propertyType?: string | null;
  propertySurfaceArea?: string | null;
  propertyIsRoadside?: boolean | null;
  visitDate: string;
  visitTime: string;
  status: VisitStatus;
  rawStatus: VisitStatus;
  amount: number;
  createdAt: string;
  source?: string | null;
  notes?: string | null;
  guest?: {
    id?: string;
    name?: string;
    username?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
  } | null;
}

type VisitInput = {
  propertyId: string;
  propertyTitle: string;
  propertyImage?: string | null;
  propertyLocation: string;
  propertyBedrooms?: number | null;
  propertyKitchens?: number | null;
  propertyLivingRooms?: number | null;
  propertyType?: string | null;
  propertySurfaceArea?: string | null;
  propertyIsRoadside?: boolean | null;
  visitDate: Date;
  visitTime: string;
  amount: number;
  notes?: string | null;
};

type VisitUpdateInput = Partial<Omit<VisitInput, 'visitDate' | 'visitTime'>> & {
  visitDate?: Date;
  visitTime?: string;
};

interface VisitsContextValue {
  visits: VisitRecord[];
  isLoading: boolean;
  error: string | null;
  refreshVisits: () => Promise<void>;
  addVisit: (visit: VisitInput) => Promise<VisitRecord>;
  updateVisit: (visitId: string, data: VisitUpdateInput) => Promise<VisitRecord | null>;
  cancelVisit: (visitId: string) => Promise<VisitRecord | null>;
  confirmVisit: (visitId: string) => void;
  getVisitByPropertyId: (propertyId: string) => VisitRecord | undefined;
  getVisitById: (visitId: string) => VisitRecord | undefined;
  checkSlotAvailability: (listingId: string, visitDate: string, visitTime: string) => Promise<boolean>;
  getOccupiedTimeslots: (listingId: string, visitDate: string) => Promise<string[]>;
  fetchLatestVisitForListing: (listingId: string) => Promise<VisitRecord | null>;
}

const AUTO_CONFIRM_DELAY_MS = 2 * 60 * 1000;
const DEFAULT_VISIT_PRICE = 5000;

const VisitsContext = createContext<VisitsContextValue | undefined>(undefined);

const mapGuestVisitToRecord = (
  visit: GuestRentalVisit,
  extras?: Partial<VisitRecord>,
  previous?: VisitRecord,
): VisitRecord => {
  return {
    id: visit.id,
    propertyId: visit.listingId,
    propertyTitle: extras?.propertyTitle ?? previous?.propertyTitle ?? visit.listingTitle,
    propertyImage: extras?.propertyImage ?? previous?.propertyImage ?? visit.listingCoverUrl ?? null,
    propertyLocation: extras?.propertyLocation ?? previous?.propertyLocation ?? visit.listingLocation,
    propertyBedrooms: extras?.propertyBedrooms ?? previous?.propertyBedrooms ?? null,
    propertyKitchens: extras?.propertyKitchens ?? previous?.propertyKitchens ?? null,
    propertyLivingRooms: extras?.propertyLivingRooms ?? previous?.propertyLivingRooms ?? null,
    propertyType: extras?.propertyType ?? previous?.propertyType ?? null,
    propertySurfaceArea: extras?.propertySurfaceArea ?? previous?.propertySurfaceArea ?? null,
    propertyIsRoadside: extras?.propertyIsRoadside ?? previous?.propertyIsRoadside ?? null,
    visitDate: visit.visitDate,
    visitTime: visit.visitTime,
    status: visit.status,
    rawStatus: visit.rawStatus,
    amount: extras?.amount ?? previous?.amount ?? DEFAULT_VISIT_PRICE,
    createdAt: visit.createdAt,
    source: visit.source ?? previous?.source ?? null,
    notes: visit.notes ?? previous?.notes ?? null,
    guest: visit.guest ?? previous?.guest ?? null,
  };
};

type VisitExtrasInput = (VisitInput | VisitUpdateInput | Partial<VisitRecord>) & {
  visitDate?: Date | string;
  visitTime?: string;
  amount?: number;
  notes?: string | null;
};

const buildExtrasFromInput = (input: VisitExtrasInput): Partial<VisitRecord> => {
  return {
    propertyId: input.propertyId,
    propertyTitle: input.propertyTitle,
    propertyImage: input.propertyImage,
    propertyLocation: input.propertyLocation,
    propertyBedrooms: input.propertyBedrooms ?? null,
    propertyKitchens: input.propertyKitchens ?? null,
    propertyLivingRooms: input.propertyLivingRooms ?? null,
    propertyType: input.propertyType ?? null,
    propertySurfaceArea: input.propertySurfaceArea ?? null,
    propertyIsRoadside: input.propertyIsRoadside ?? null,
    visitDate: input.visitDate instanceof Date ? input.visitDate.toISOString() : input.visitDate,
    visitTime: input.visitTime ?? undefined,
    amount: input.amount ?? undefined,
    notes: input.notes ?? undefined,
  };
};

export const VisitsProvider = ({ children }: { children: ReactNode }) => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visitsRef = useRef<VisitRecord[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearTimer = useCallback((visitId: string) => {
    if (timersRef.current[visitId]) {
      clearTimeout(timersRef.current[visitId]);
      delete timersRef.current[visitId];
    }
  }, []);

  const scheduleAutoConfirm = useCallback(
    (visit: VisitRecord) => {
      clearTimer(visit.id);

      if (visit.status !== 'pending') {
        return;
      }

      const createdAt = visit.createdAt ? new Date(visit.createdAt).getTime() : null;
      if (!createdAt) {
        return;
      }

      const elapsed = Date.now() - createdAt;
      const remaining = AUTO_CONFIRM_DELAY_MS - elapsed;

      if (remaining <= 0) {
        setVisits((prev) =>
          prev.map((item) =>
            item.id === visit.id ? { ...item, status: 'confirmed' as VisitStatus, rawStatus: 'confirmed' } : item,
          ),
        );
        return;
      }

      timersRef.current[visit.id] = setTimeout(() => {
        setVisits((prev) =>
          prev.map((item) =>
            item.id === visit.id ? { ...item, status: 'confirmed' as VisitStatus, rawStatus: 'confirmed' } : item,
          ),
        );
        delete timersRef.current[visit.id];
      }, remaining);
    },
    [clearTimer],
  );

  const applyVisits = useCallback(
    (nextVisits: VisitRecord[]) => {
      setVisits((prevVisits) => {
        const prevIds = new Set(prevVisits.map((visit) => visit.id));
        nextVisits.forEach((visit) => {
          scheduleAutoConfirm(visit);
          prevIds.delete(visit.id);
        });
        prevIds.forEach((id) => clearTimer(id));
        visitsRef.current = nextVisits;
        return nextVisits;
      });
    },
    [clearTimer, scheduleAutoConfirm],
  );

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
      timersRef.current = {};
    };
  }, []);

  const refreshVisits = useCallback(async () => {
    if (!isLoggedIn || !supabaseProfile) {
      applyVisits([]);
      return;
    }

    setIsLoading(true);
    try {
      const fetched = await fetchGuestRentalVisits(supabaseProfile.id);
      const previousIndex = new Map(visitsRef.current.map((visit) => [visit.id, visit] as const));
      const mapped = fetched
        .map((visit) => {
          const previous = previousIndex.get(visit.id);
          return mapGuestVisitToRecord(visit, undefined, previous ?? undefined);
        })
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      applyVisits(mapped);
      setError(null);
    } catch (err) {
      console.error('[VisitsContext] Failed to refresh visits', err);
      setError('unable_to_load');
    } finally {
      setIsLoading(false);
    }
  }, [applyVisits, isLoggedIn, supabaseProfile]);

  useEffect(() => {
    if (isLoggedIn && supabaseProfile) {
      void refreshVisits();
    } else {
      visitsRef.current = [];
      setVisits([]);
      Object.keys(timersRef.current).forEach((id) => clearTimer(id));
    }
  }, [clearTimer, isLoggedIn, refreshVisits, supabaseProfile]);

  const addVisit = useCallback<VisitsContextValue['addVisit']>(
    async (visit) => {
      if (!supabaseProfile) {
        throw new Error('not_authenticated');
      }

      const created = await createRentalVisit({
        listingId: visit.propertyId,
        guestProfileId: supabaseProfile.id,
        visitDate: visit.visitDate,
        visitTime: visit.visitTime,
        source: 'mobile_guest',
        notes: visit.notes ?? null,
      });

      const extras = buildExtrasFromInput(visit);
      const record = mapGuestVisitToRecord(created, extras);

      setVisits((prev) => {
        const next = [record, ...prev.filter((item) => item.id !== record.id)];
        scheduleAutoConfirm(record);
        visitsRef.current = next;
        return next;
      });

      return record;
    },
    [scheduleAutoConfirm, supabaseProfile],
  );

  const updateVisit = useCallback<VisitsContextValue['updateVisit']>(
    async (visitId, data) => {
      if (!supabaseProfile || (!data.visitDate && !data.visitTime)) {
        throw new Error('invalid_update_payload');
      }

      const current = visits.find((visit) => visit.id === visitId);
      try {
        const updated = await updateRentalVisit({
          visitId,
          newDate: data.visitDate ?? new Date(current?.visitDate ?? new Date().toISOString()),
          newTime: data.visitTime ?? current?.visitTime ?? '11:00',
        });

        const extras = buildExtrasFromInput({ ...(current ?? {}), ...data } as VisitExtrasInput);
        const record = mapGuestVisitToRecord(updated, extras, current);
        setVisits((prev) => {
          const next = prev.map((visit) => (visit.id === record.id ? record : visit));
          scheduleAutoConfirm(record);
          visitsRef.current = next;
          return next;
        });
        return record;
      } catch (err) {
        console.error('[VisitsContext] Failed to update visit', err);
        throw err;
      }
    },
    [scheduleAutoConfirm, supabaseProfile],
  );

  const handleCancelVisit = useCallback<VisitsContextValue['cancelVisit']>(
    async (visitId) => {
      try {
        const cancelled = await cancelRentalVisit(visitId);
        const previous = visitsRef.current.find((visit) => visit.id === visitId);
        const record = mapGuestVisitToRecord(cancelled, undefined, previous);
        clearTimer(visitId);
        setVisits((prev) => {
          const next = prev.map((visit) => (visit.id === visitId ? record : visit));
          visitsRef.current = next;
          return next;
        });
        return record;
      } catch (err) {
        console.error('[VisitsContext] Failed to cancel visit', err);
        throw err;
      }
    },
    [clearTimer],
  );

  const confirmVisit = useCallback((visitId: string) => {
    clearTimer(visitId);
    setVisits((prev) => {
      const next: VisitRecord[] = prev.map((visit) =>
        visit.id === visitId
          ? { ...visit, status: 'confirmed' as VisitStatus, rawStatus: 'confirmed' as VisitStatus }
          : visit,
      );
      visitsRef.current = next;
      return next;
    });
  }, [clearTimer]);

  const getVisitByPropertyId = useCallback(
    (propertyId: string) => visits.find((visit) => visit.propertyId === propertyId && visit.status !== 'cancelled'),
    [visits],
  );

  const getVisitById = useCallback((visitId: string) => visits.find((visit) => visit.id === visitId), [visits]);

  const checkSlotAvailability = useCallback<VisitsContextValue['checkSlotAvailability']>(
    async (listingId, visitDate, visitTime) => {
      try {
        return await checkRentalVisitAvailability({ listingId, visitDate, visitTime });
      } catch (err) {
        console.error('[VisitsContext] Failed to check slot availability', err);
        throw err;
      }
    },
    [],
  );

  const getOccupiedTimeslots = useCallback<VisitsContextValue['getOccupiedTimeslots']>(
    async (listingId, visitDate) => {
      try {
        return await fetchOccupiedTimeslots({ listingId, visitDate });
      } catch (err) {
        console.error('[VisitsContext] Failed to fetch occupied timeslots', err);
        throw err;
      }
    },
    [],
  );

  const fetchLatestVisitForListing = useCallback<VisitsContextValue['fetchLatestVisitForListing']>(
    async (listingId) => {
      if (!supabaseProfile) {
        throw new Error('not_authenticated');
      }

      const visit = await fetchExistingVisitForListing(supabaseProfile.id, listingId);
      if (!visit) {
        return null;
      }

      const current = visits.find((item) => item.id === visit.id);
      return mapGuestVisitToRecord(visit, undefined, current);
    },
    [supabaseProfile, visits],
  );

  const value = useMemo<VisitsContextValue>(
    () => ({
      visits,
      isLoading,
      error,
      refreshVisits,
      addVisit,
      updateVisit,
      cancelVisit: handleCancelVisit,
      confirmVisit,
      getVisitByPropertyId,
      getVisitById,
      checkSlotAvailability,
      getOccupiedTimeslots,
      fetchLatestVisitForListing,
    }),
    [
      visits,
      isLoading,
      error,
      refreshVisits,
      addVisit,
      updateVisit,
      handleCancelVisit,
      confirmVisit,
      getVisitByPropertyId,
      getVisitById,
      checkSlotAvailability,
      getOccupiedTimeslots,
      fetchLatestVisitForListing,
    ],
  );

  return <VisitsContext.Provider value={value}>{children}</VisitsContext.Provider>;
};

export const useVisits = () => {
  const context = useContext(VisitsContext);
  if (!context) {
    throw new Error('useVisits must be used within a VisitsProvider');
  }
  return context;
};
