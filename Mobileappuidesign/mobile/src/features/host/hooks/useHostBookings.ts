import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/src/contexts/AuthContext';
import {
  fetchHostBookings,
  fetchHostBookingById,
  type HostBookingRecord,
  type BookingRow,
} from '@/src/features/bookings/services';
import { supabase } from '@/src/supabaseClient';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

interface UseHostBookingsResult {
  bookings: HostBookingRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getBookingById: (id: string) => HostBookingRecord | undefined;
  fetchBooking: (id: string) => Promise<HostBookingRecord | null>;
  onBookingChange: (callback: (booking: HostBookingRecord) => void) => void;
}

export const useHostBookings = (subscriptionScope = 'ui'): UseHostBookingsResult => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const isHostProfile = supabaseProfile?.role === 'host';
  const [bookings, setBookings] = useState<HostBookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changeCallbacksRef = useRef(new Set<(booking: HostBookingRecord) => void>());

  const refresh = useCallback(async () => {
    if (!isLoggedIn || !supabaseProfile || !isHostProfile) {
      setBookings([]);
      return;
    }

    setIsLoading(true);
    try {
      const data = await fetchHostBookings(supabaseProfile.id);
      setBookings(data);
      setError(null);
    } catch (err) {
      console.error('[useHostBookings] failed to load host bookings', err);
      setError('unable_to_load_host_bookings');
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, supabaseProfile, isHostProfile]);

  const onBookingChange = useCallback((callback: (booking: HostBookingRecord) => void): (() => void) => {
    const callbacks = changeCallbacksRef.current;
    console.log(`[useHostBookings] Adding booking change callback, total callbacks: ${callbacks.size + 1}`);
    callbacks.add(callback);
    return () => {
      const currentCallbacks = changeCallbacksRef.current;
      console.log(`[useHostBookings] Removing booking change callback, remaining: ${Math.max(currentCallbacks.size - 1, 0)}`);
      currentCallbacks.delete(callback);
    };
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!supabaseProfile) {
      console.log('[useHostBookings] No supabase profile, skipping realtime subscription');
      return undefined;
    }
    if (!isHostProfile) {
      console.log('[useHostBookings] Profile is not a host, skipping realtime subscription');
      return undefined;
    }

    console.log('[useHostBookings] Setting up realtime subscription for host:', supabaseProfile.id);
    const channelName = `host-bookings-${subscriptionScope}-${supabaseProfile.id}`;
    console.log(`[useHostBookings] Creating channel: ${channelName}`);
    
    // Afficher l'état actuel des abonnements
    console.log('[useHostBookings] Current Supabase channels:', supabase.getChannels());
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { ack: true },
          presence: { key: `host-${supabaseProfile.id}` }
        }
      })
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          // Temporairement sans filtre pour voir tout ce qui se passe
          // filter: `listing.host_id=eq.${supabaseProfile.id}`,
        } as const,
        async (payload: any) => {
          console.log(`[useHostBookings] Received change on channel ${channelName}:`, {
            eventType: payload.eventType,
            table: payload.table,
            timestamp: new Date().toISOString()
          });
          const newRecord = payload.new as (BookingRow & { listing?: { host_id: string } }) | null;
          const oldRecord = payload.old as (BookingRow & { listing?: { host_id: string } }) | null;
          
          console.log('[useHostBookings] RAW REALTIME PAYLOAD:', {
            eventType: payload.eventType,
            payload: payload,
            newId: newRecord?.id,
            oldId: oldRecord?.id,
            newHostId: newRecord?.listing?.host_id,
            oldHostId: oldRecord?.listing?.host_id,
            currentHostId: supabaseProfile.id
          });
          
          // Notifier les callbacks immédiatement pour les notifications instantanées
          if (payload.eventType === 'UPDATE') {
            const targetBookingId = newRecord?.id ?? oldRecord?.id;
            if (!targetBookingId) {
              console.warn('[useHostBookings] UPDATE event without booking id, skipping');
              return;
            }

            console.log(`[useHostBookings] Processing UPDATE event for booking ${targetBookingId}`);
            try {
              // Fetch the full booking details to ensure we have all necessary data
              console.log(`[useHostBookings] Fetching updated booking details for ${targetBookingId}`);
              const updatedBooking = await fetchHostBookingById(supabaseProfile.id, targetBookingId);
              
              if (!updatedBooking) {
                console.log(`[useHostBookings] No booking found with ID ${targetBookingId} for host ${supabaseProfile.id}`);
                return;
              }
              
              console.log('[useHostBookings] Booking updated details:', {
                id: updatedBooking.id,
                status: updatedBooking.status,
                hasGuestData: !!updatedBooking.guest,
                hasListingData: !!updatedBooking.listingTitle
              });
              
              // Mettre à jour le state local
              setBookings((prev) => {
                const exists = prev.findIndex((item) => item.id === updatedBooking.id);
                if (exists >= 0) {
                  console.log(`[useHostBookings] Updating existing booking in state (index ${exists})`);
                  const copy = [...prev];
                  copy[exists] = updatedBooking;
                  return copy;
                }
                console.log('[useHostBookings] Adding new booking to state');
                return [updatedBooking, ...prev];
              });

              // Notifier les callbacks pour les notifications
              const callbacks = Array.from(changeCallbacksRef.current);
              console.log(`[useHostBookings] Notifying ${callbacks.length} callbacks`);
              let callbackCount = 0;
              callbacks.forEach((callback) => {
                try {
                  callback(updatedBooking);
                  callbackCount++;
                } catch (callbackError) {
                  console.error('[useHostBookings] Error in callback:', callbackError);
                }
              });
              console.log(`[useHostBookings] Successfully notified ${callbackCount} callbacks`);
            } catch (error) {
              console.error('[useHostBookings] Error processing update:', error);
            }
          } else if (payload.eventType === 'INSERT' && newRecord) {
            try {
              // Fetch the full booking details to ensure we have all necessary data
              const newBooking = await fetchHostBookingById(supabaseProfile.id, newRecord.id);
              if (!newBooking) return;
              
              console.log('[useHostBookings] New booking inserted:', newBooking.id);
              
              setBookings((prev) => [newBooking, ...prev]);
              changeCallbacksRef.current.forEach((callback) => callback(newBooking));
            } catch (error) {
              console.error('[useHostBookings] Error processing insert:', error);
            }
          } else if (payload.eventType === 'DELETE' && oldRecord) {
            console.log('[useHostBookings] Booking deleted:', oldRecord.id);
            
            setBookings((prev) => prev.filter((item) => item.id !== oldRecord.id));
            // Pas de notification pour les suppressions
          }
        },
      )
      .subscribe((status, error) => {
        console.log('[useHostBookings] Subscription status:', status);
        
        if (error) {
          console.error('[useHostBookings] Subscription error:', error);
          return;
        }
        
        // Vérifier l'état de l'abonnement
        if (status === 'SUBSCRIBED') {
          console.log('[useHostBookings] Successfully subscribed to realtime updates');
          
          // Vérifier l'état du canal
          channel.send({
            type: 'broadcast',
            event: 'test',
            payload: { message: 'Test message' }
          }).then(() => {
            console.log('[useHostBookings] Test message sent successfully');
          }).catch((sendError) => {
            console.error('[useHostBookings] Error sending test message:', sendError);
          });
        }
      });
      
    console.log('[useHostBookings] Channel created:', channel.topic);

    return () => {
      console.log('[useHostBookings] Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [supabaseProfile, subscriptionScope, isHostProfile]);

  const getBookingById = useCallback(
    (id: string) => bookings.find((booking) => booking.id === id),
    [bookings],
  );

  const fetchBooking = useCallback(
    async (id: string) => {
      if (!supabaseProfile) {
        return null;
      }
      try {
        const booking = await fetchHostBookingById(supabaseProfile.id, id);
        if (booking) {
          setBookings((prev) => {
            const exists = prev.findIndex((item) => item.id === booking.id);
            if (exists >= 0) {
              const copy = [...prev];
              copy[exists] = booking;
              return copy;
            }
            return [booking, ...prev];
          });
        }
        return booking;
      } catch (err) {
        console.error('[useHostBookings] failed to fetch booking by id', err);
        return null;
      }
    },
    [supabaseProfile],
  );

  return useMemo(
    () => ({ bookings, isLoading, error, refresh, getBookingById, fetchBooking, onBookingChange }),
    [bookings, isLoading, error, refresh, getBookingById, fetchBooking, onBookingChange],
  );
};
