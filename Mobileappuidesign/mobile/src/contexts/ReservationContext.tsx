import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled';

export interface ReservationRecord {
  id: string;
  propertyId: string;
  propertyTitle: string;
  propertyImage: string;
  propertyLocation: string;
  propertyAddress: string;
  hostName: string;
  hostAvatar?: string | null;
  hostUsername?: string | null;
  hostIsVerified?: boolean;
  hostId?: string;
  hostPhone: string;
  hostEmail: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalPrice: number;
  pricePerNight: number;
  amountPaid: number;
  amountRemaining: number;
  status: ReservationStatus;
  createdAt: string;
}

interface ReservationContextValue {
  reservations: ReservationRecord[];
  getReservationById: (id: string) => ReservationRecord | undefined;
  cancelReservation: (id: string) => void;
  addReservation: (input: NewReservationInput) => ReservationRecord;
}

const ReservationContext = createContext<ReservationContextValue | undefined>(undefined);

type NewReservationInput = Omit<ReservationRecord, 'id' | 'status' | 'createdAt'> & {
  id?: string;
  status?: ReservationStatus;
};

export const ReservationProvider = ({ children }: { children: ReactNode }) => {
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);

  const addReservation = useCallback((input: NewReservationInput) => {
    const newReservation: ReservationRecord = {
      ...input,
      id: input.id ?? `reservation-${Date.now()}`,
      status: input.status ?? 'confirmed',
      createdAt: new Date().toISOString(),
    };
    setReservations((prev) => [newReservation, ...prev]);
    return newReservation;
  }, []);

  const cancelReservation = useCallback((id: string) => {
    setReservations((prev) =>
      prev.map((reservation) =>
        reservation.id === id ? { ...reservation, status: 'cancelled' as ReservationStatus } : reservation,
      ),
    );
  }, []);

  const getReservationById = useCallback(
    (id: string) => reservations.find((reservation) => reservation.id === id),
    [reservations],
  );

  const value = useMemo<ReservationContextValue>(
    () => ({ reservations, getReservationById, cancelReservation, addReservation }),
    [reservations, getReservationById, cancelReservation, addReservation],
  );

  return <ReservationContext.Provider value={value}>{children}</ReservationContext.Provider>;
};

export const useReservations = () => {
  const context = useContext(ReservationContext);
  if (!context) {
    throw new Error('useReservations must be used within a ReservationProvider');
  }
  return context;
};

export type { NewReservationInput };
