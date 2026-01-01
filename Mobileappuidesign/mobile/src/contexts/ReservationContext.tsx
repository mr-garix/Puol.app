import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { useAuth } from '@/src/contexts/AuthContext';
import {
  cancelGuestBooking,
  createBooking,
  fetchGuestBookings,
  type GuestBookingRecord,
} from '@/src/features/bookings/services';
import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';

type BookingRow = Database['public']['Tables']['bookings']['Row'];
type BookingRealtimePayload = RealtimePostgresChangesPayload<BookingRow>;

export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';

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
  guestName?: string | null;
  guestPhone?: string | null;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalPrice: number;
  pricePerNight: number;
  amountPaid: number;
  amountRemaining: number;
  originalTotal: number;
  discountAmount: number;
  discountPercent?: number | null;
  paymentScheme?: 'full' | 'installment' | 'split';
  depositNights?: number;
  remainingNights?: number;
  remainingPaymentStatus?: 'idle' | 'requested' | 'paid';
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

interface ReservationContextValue {
  reservations: ReservationRecord[];
  isLoading: boolean;
  error: string | null;
  refreshReservations: () => Promise<void>;
  getReservationById: (id: string) => ReservationRecord | undefined;
  cancelReservation: (id: string) => Promise<void>;
  addReservation: (input: NewReservationInput) => Promise<ReservationRecord>;
  pendingRemainingPayment: ReservationRecord | null;
  clearPendingRemainingPayment: () => void;
}

const ReservationContext = createContext<ReservationContextValue | undefined>(undefined);

type NewReservationInput = Omit<ReservationRecord, 'id' | 'status' | 'createdAt'> & {
  id?: string;
  status?: ReservationStatus;
  autoConfirm?: boolean;
};

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1502672260066-6bc36a7cad24?w=400&auto=format&fit=crop&q=80';
const FALLBACK_HOST_NAME = 'Hôte PUOL';
const FALLBACK_PHONE = '+237600000000';
const FALLBACK_EMAIL = 'support@puol.cm';
const FALLBACK_GUEST_NAME = 'Voyageur PUOL';
const FALLBACK_GUEST_PHONE = 'Non renseigné';

const mapBookingToReservationRecord = (
  booking: GuestBookingRecord,
  fallback?: Partial<ReservationRecord>,
): ReservationRecord => {
  const normalizedStatus: ReservationStatus = booking.status === 'cancelled'
    ? 'cancelled'
    : booking.status === 'completed'
      ? 'completed'
      : booking.status === 'confirmed'
        ? 'confirmed'
        : 'pending';
  const fallbackGuest = fallback?.guestName ?? FALLBACK_GUEST_NAME;
  const fallbackGuestPhone = fallback?.guestPhone ?? FALLBACK_GUEST_PHONE;

  return {
    id: booking.id,
    propertyId: booking.listingId,
    propertyTitle: booking.listingTitle || fallback?.propertyTitle || 'Annonce PUOL',
    propertyImage: booking.listingImage || fallback?.propertyImage || FALLBACK_IMAGE,
    propertyLocation: booking.listingLocation || fallback?.propertyLocation || 'Douala, Cameroun',
    propertyAddress: booking.listingAddress || fallback?.propertyAddress || '',
    hostName: booking.host?.name || fallback?.hostName || FALLBACK_HOST_NAME,
    hostAvatar: booking.host?.avatarUrl ?? fallback?.hostAvatar ?? null,
    hostUsername: booking.host?.username ?? fallback?.hostUsername ?? null,
    hostIsVerified: booking.host?.isVerified ?? fallback?.hostIsVerified ?? false,
    hostId: booking.host?.id ?? fallback?.hostId,
    hostPhone: booking.host?.phone || fallback?.hostPhone || FALLBACK_PHONE,
    hostEmail: FALLBACK_EMAIL,
    guestName: booking.guestName || fallbackGuest,
    guestPhone: booking.guestPhone || fallbackGuestPhone,
    updatedAt: booking.updated_at || new Date().toISOString(),
    checkInDate: booking.checkInDate,
    checkOutDate: booking.checkOutDate,
    nights: booking.nights,
    totalPrice: booking.totalPrice,
    pricePerNight: booking.nightlyPrice,
    amountPaid: booking.amountPaid,
    amountRemaining: booking.amountRemaining,
    originalTotal: booking.originalTotal ?? fallback?.originalTotal ?? booking.totalPrice,
    discountAmount: booking.discountAmount ?? fallback?.discountAmount ?? 0,
    discountPercent: booking.discountPercent ?? fallback?.discountPercent ?? null,
    paymentScheme: booking.paymentScheme as 'full' | 'installment' | 'split',
    depositNights: booking.depositNights,
    remainingNights: booking.remainingNights,
    remainingPaymentStatus: booking.remainingPaymentStatus as 'idle' | 'requested' | 'paid' | undefined,
    status: normalizedStatus,
    createdAt: booking.createdAt,
  };
};

export const ReservationProvider = ({ children }: { children: ReactNode }) => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRemainingPayment, setPendingRemainingPayment] = useState<ReservationRecord | null>(null);

  const applyReservations = useCallback((bookings: GuestBookingRecord[]) => {
    const mappedReservations = bookings.map((booking) => mapBookingToReservationRecord(booking));
    setReservations(mappedReservations);

    const requestedPayment = mappedReservations.find(
      (reservation) => reservation.remainingPaymentStatus === 'requested',
    );

    setPendingRemainingPayment(requestedPayment ?? null);
  }, []);

  const refreshReservations = useCallback(async () => {
    if (!isLoggedIn || !supabaseProfile) {
      setReservations([]);
      setPendingRemainingPayment(null);
      return;
    }

    setIsLoading(true);
    try {
      const bookings = await fetchGuestBookings(supabaseProfile.id);
      applyReservations(bookings);

      setError(null);
    } catch (err) {
      console.error('[ReservationContext] Failed to load reservations', err);
      setError('unable_to_load');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, supabaseProfile, applyReservations]);

  useEffect(() => {
    if (!isLoggedIn || !supabaseProfile) {
      setReservations([]);
      return;
    }
    refreshReservations();
  }, [isLoggedIn, supabaseProfile, refreshReservations]);

  useEffect(() => {
    if (!supabaseProfile) {
      console.log('[ReservationContext] No supabase profile, skipping realtime subscription');
      return;
    }

    console.log('[ReservationContext] Setting up realtime subscription for guest:', supabaseProfile.id);
    
    const channel = supabase.channel(`guest-bookings-${supabaseProfile.id}`);
    
    const subscription = channel
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `guest_profile_id=eq.${supabaseProfile.id}`,
        },
        async (payload: any) => {
          console.log('[ReservationContext] Realtime change received:', {
            eventType: payload.eventType,
            newId: payload.new?.id,
            oldId: payload.old?.id,
            currentGuestId: supabaseProfile.id
          });

          try {
            if (payload.eventType === 'DELETE' && payload.old) {
              const deletedId = payload.old.id;
              console.log('[ReservationContext] Booking deleted:', deletedId);
              
              // Mettre à jour immédiatement le state local
              setReservations((prev: ReservationRecord[]) => {
                const updated = prev.filter((reservation) => reservation.id !== deletedId);
                console.log('[ReservationContext] Removed from local state, count:', updated.length);

                const requestedPayment = updated.find(
                  (reservation) => reservation.remainingPaymentStatus === 'requested',
                );
                setPendingRemainingPayment(requestedPayment ?? null);

                return updated;
              });
            } 
            else if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedId = payload.new.id;
              const newRemainingPaymentStatus = payload.new.remaining_payment_status;
              console.log('[ReservationContext] Booking updated:', {
                id: updatedId,
                remainingPaymentStatus: newRemainingPaymentStatus
              });
              
              // Mettre à jour immédiatement si c'est un changement de remaining_payment_status
              if (newRemainingPaymentStatus === 'requested') {
                console.log('[ReservationContext] Payment requested detected, updating immediately');
                setReservations((prev) => {
                  const updated = prev.map((reservation) => {
                    if (reservation.id === updatedId) {
                      return {
                        ...reservation,
                        remainingPaymentStatus: 'requested' as const
                      };
                    }
                    return reservation;
                  });
                  
                  const requestedPayment = updated.find(
                    (reservation) => reservation.remainingPaymentStatus === 'requested',
                  );
                  setPendingRemainingPayment((requestedPayment as ReservationRecord | null) ?? null);
                  
                  return updated;
                });
              } else {
                // Pour les autres changements, recharger complètement
                console.log('[ReservationContext] Other update detected, refreshing completely');
                const bookings = await fetchGuestBookings(supabaseProfile.id);
                applyReservations(bookings);
              }
            } 
            else if (payload.eventType === 'INSERT' && payload.new) {
              const newId = payload.new.id;
              console.log('[ReservationContext] New booking, refreshing:', newId);
              
              // Recharger les données pour s'assurer d'avoir toutes les infos
              const bookings = await fetchGuestBookings(supabaseProfile.id);
              applyReservations(bookings);
            }
          } catch (error) {
            console.error('[ReservationContext] Error processing realtime update:', error);
            
            // En cas d'erreur, on essaie de rafraîchir complètement
            try {
              const bookings = await fetchGuestBookings(supabaseProfile.id);
              applyReservations(bookings);
            } catch (refreshError) {
              console.error('[ReservationContext] Failed to refresh after error:', refreshError);
            }
          }
        }
      )
      .subscribe((status: string) => {
        console.log('[ReservationContext] Subscription status:', status);
        
        // Si la connexion est perdue, on essaie de se reconnecter
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('[ReservationContext] Subscription error, attempting to resubscribe...');
          channel.unsubscribe();
          channel.subscribe();
        }
      });

    // Nettoyage de l'effet
    return () => {
      console.log('[ReservationContext] Cleaning up realtime subscription');
      subscription?.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabaseProfile, refreshReservations]);

  const addReservation = useCallback(
    async (input: NewReservationInput) => {
      console.log('[ReservationContext] addReservation appelé avec input:', input);
      
      if (!supabaseProfile) {
        console.error('[ReservationContext] Pas de supabaseProfile, utilisateur non authentifié');
        throw new Error('not_authenticated');
      }

      console.log('[ReservationContext] Appel createBooking avec supabaseProfile.id:', supabaseProfile.id);
      
      try {
        const booking = await createBooking({
          listingId: input.propertyId,
          guestProfileId: supabaseProfile.id,
          checkInDate: input.checkInDate,
          checkOutDate: input.checkOutDate,
          nights: input.nights,
          nightlyPrice: input.pricePerNight,
          totalPrice: input.totalPrice,
          depositAmount: input.amountPaid,
          remainingAmount: input.amountRemaining,
          discountAmount: input.discountAmount,
          discountPercent: input.discountPercent,
          hasDiscount: Boolean(input.discountAmount && input.discountAmount > 0),
          status: 'confirmed',
        });
        
        console.log('[ReservationContext] createBooking réussi, booking créé:', booking);

        const mapped = mapBookingToReservationRecord(booking, input);
        console.log('[ReservationContext] Mapping réussi, réservation mappée:', mapped);
        
        setReservations((prev) => {
          const next = [mapped, ...prev.filter((reservation) => reservation.id !== mapped.id)];
          const requestedPayment = next.find((reservation) => reservation.remainingPaymentStatus === 'requested');
          setPendingRemainingPayment(requestedPayment ?? null);
          console.log('[ReservationContext] État des réservations mis à jour, nombre total:', next.length);
          return next;
        });
        
        console.log('[ReservationContext] addReservation terminé avec succès');
        return mapped;
      } catch (error) {
        console.error('[ReservationContext] Erreur dans addReservation:', error);
        console.error('[ReservationContext] Stack trace:', error instanceof Error ? error.stack : 'No stack');
        throw error;
      }
    },
    [supabaseProfile],
  );

  const cancelReservation = useCallback(
    async (id: string) => {
      if (!supabaseProfile) {
        throw new Error('not_authenticated');
      }

      const cancelled = await cancelGuestBooking(supabaseProfile.id, id);
      if (!cancelled) {
        return;
      }

      const mapped = mapBookingToReservationRecord(cancelled);
      setReservations((prev) => {
        const next = prev.map((reservation) => (reservation.id === id ? mapped : reservation));
        const requestedPayment = next.find((reservation) => reservation.remainingPaymentStatus === 'requested');
        setPendingRemainingPayment(requestedPayment ?? null);
        return next;
      });
    },
    [supabaseProfile],
  );

  const getReservationById = useCallback(
    (id: string) => reservations.find((reservation) => reservation.id === id),
    [reservations],
  );

  const clearPendingRemainingPayment = useCallback(() => {
    setPendingRemainingPayment(null);
  }, []);

  const value = useMemo<ReservationContextValue>(
    () => ({
      reservations,
      isLoading,
      error,
      refreshReservations,
      getReservationById,
      cancelReservation,
      addReservation,
      pendingRemainingPayment,
      clearPendingRemainingPayment,
    }),
    [reservations, isLoading, error, refreshReservations, getReservationById, cancelReservation, addReservation, pendingRemainingPayment, clearPendingRemainingPayment],
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
