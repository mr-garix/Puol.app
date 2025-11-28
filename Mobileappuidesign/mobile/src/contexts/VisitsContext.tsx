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

export type VisitStatus = 'pending' | 'confirmed' | 'cancelled';

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
  visitDate: string; // ISO string
  visitTime: string;
  status: VisitStatus;
  amount: number;
  createdAt: string; // ISO string
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
};

interface VisitsContextValue {
  visits: VisitRecord[];
  addVisit: (visit: VisitInput) => string;
  updateVisit: (visitId: string, data: Partial<Omit<VisitInput, 'visitDate'>> & { visitDate?: Date }) => void;
  cancelVisit: (visitId: string) => void;
  confirmVisit: (visitId: string) => void;
  getVisitByPropertyId: (propertyId: string) => VisitRecord | undefined;
  getVisitById: (visitId: string) => VisitRecord | undefined;
}

const AUTO_CONFIRM_DELAY = 30000; // 30s

const VisitsContext = createContext<VisitsContextValue | undefined>(undefined);

export const VisitsProvider = ({ children }: { children: ReactNode }) => {
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const scheduleAutoConfirm = useCallback((visitId: string, delay = AUTO_CONFIRM_DELAY) => {
    if (timersRef.current[visitId]) {
      clearTimeout(timersRef.current[visitId]);
    }

    timersRef.current[visitId] = setTimeout(() => {
      setVisits((prev) =>
        prev.map((visit) =>
          visit.id === visitId && visit.status === 'pending'
            ? { ...visit, status: 'confirmed' as VisitStatus }
            : visit,
        ),
      );
      delete timersRef.current[visitId];
    }, delay);
  }, []);

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, []);

  const addVisit: VisitsContextValue['addVisit'] = useCallback((visit) => {
    const id = `visit-${Date.now()}`;
    const createdAt = new Date();
    const visitRecord: VisitRecord = {
      id,
      status: 'pending',
      createdAt: createdAt.toISOString(),
      visitDate: visit.visitDate.toISOString(),
      visitTime: visit.visitTime,
      propertyId: visit.propertyId,
      propertyTitle: visit.propertyTitle,
      propertyImage: visit.propertyImage ?? null,
      propertyLocation: visit.propertyLocation,
      propertyBedrooms: visit.propertyBedrooms ?? null,
      propertyKitchens: visit.propertyKitchens ?? null,
      propertyLivingRooms: visit.propertyLivingRooms ?? null,
      propertyType: visit.propertyType ?? null,
      propertySurfaceArea: visit.propertySurfaceArea ?? null,
      propertyIsRoadside: visit.propertyIsRoadside ?? null,
      amount: visit.amount,
    };

    setVisits((prev) => [visitRecord, ...prev]);
    scheduleAutoConfirm(id);
    return id;
  }, [scheduleAutoConfirm]);

  const updateVisit: VisitsContextValue['updateVisit'] = useCallback(
    (visitId, data) => {
      setVisits((prev) =>
        prev.map((visit) => {
          if (visit.id !== visitId) {
            return visit;
          }

          const nextDate = data.visitDate ? data.visitDate.toISOString() : visit.visitDate;
          const updated: VisitRecord = {
            ...visit,
            propertyTitle: data.propertyTitle ?? visit.propertyTitle,
            propertyLocation: data.propertyLocation ?? visit.propertyLocation,
            propertyImage: data.propertyImage ?? visit.propertyImage ?? null,
            propertyBedrooms:
              data.propertyBedrooms !== undefined ? data.propertyBedrooms : visit.propertyBedrooms ?? null,
            propertyKitchens:
              data.propertyKitchens !== undefined ? data.propertyKitchens : visit.propertyKitchens ?? null,
            propertyLivingRooms:
              data.propertyLivingRooms !== undefined
                ? data.propertyLivingRooms
                : visit.propertyLivingRooms ?? null,
            propertyType: data.propertyType ?? visit.propertyType ?? null,
            propertySurfaceArea: data.propertySurfaceArea ?? visit.propertySurfaceArea ?? null,
            propertyIsRoadside:
              data.propertyIsRoadside !== undefined
                ? data.propertyIsRoadside
                : visit.propertyIsRoadside ?? null,
            amount: data.amount ?? visit.amount,
            visitDate: nextDate,
            visitTime: data.visitTime ?? visit.visitTime,
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
          scheduleAutoConfirm(visitId);
          return updated;
        }),
      );
    },
    [scheduleAutoConfirm],
  );

  const cancelVisit: VisitsContextValue['cancelVisit'] = useCallback((visitId) => {
    if (timersRef.current[visitId]) {
      clearTimeout(timersRef.current[visitId]);
      delete timersRef.current[visitId];
    }

    setVisits((prev) =>
      prev.map((visit) =>
        visit.id === visitId ? { ...visit, status: 'cancelled' as VisitStatus } : visit,
      ),
    );
  }, []);

  const confirmVisit: VisitsContextValue['confirmVisit'] = useCallback((visitId) => {
    if (timersRef.current[visitId]) {
      clearTimeout(timersRef.current[visitId]);
      delete timersRef.current[visitId];
    }

    setVisits((prev) =>
      prev.map((visit) =>
        visit.id === visitId ? { ...visit, status: 'confirmed' as VisitStatus } : visit,
      ),
    );
  }, []);

  const getVisitByPropertyId = useCallback(
    (propertyId: string) => visits.find((visit) => visit.propertyId === propertyId && visit.status !== 'cancelled'),
    [visits],
  );

  const getVisitById = useCallback((visitId: string) => visits.find((visit) => visit.id === visitId), [visits]);

  const value = useMemo<VisitsContextValue>(
    () => ({ visits, addVisit, updateVisit, cancelVisit, confirmVisit, getVisitByPropertyId, getVisitById }),
    [visits, addVisit, updateVisit, cancelVisit, confirmVisit, getVisitByPropertyId, getVisitById],
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
