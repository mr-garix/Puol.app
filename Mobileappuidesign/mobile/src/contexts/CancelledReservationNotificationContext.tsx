import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';
import { saveIdsToStorage, loadIdsFromStorage } from '@/src/utils/asyncStorageUtils';

type Booking = Database['public']['Tables']['bookings']['Row'];

interface CancelledReservationNotificationContextValue {
  // Context for managing cancelled reservation notifications
}

const SHOWN_CANCELLED_RESERVATIONS_KEY = 'shown_cancelled_reservations';

const CancelledReservationNotificationContext = createContext<CancelledReservationNotificationContextValue | undefined>(undefined);

const showCancelledReservationNotification = (booking: Booking, router: any) => {
  const checkoutDate = booking.checkout_date ? new Date(booking.checkout_date).toLocaleDateString('fr-FR') : 'date inconnue';

  Alert.alert(
    'Réservation annulée',
    `Votre réservation prévue jusqu'au ${checkoutDate} a été annulée.\n\nPour plus d'informations, veuillez contacter le support.`,
    [
      {
        text: 'OK',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Contacter le support',
        onPress: () => {
          router.push('/support' as never);
        },
        style: 'default',
      },
    ]
  );
};

export const CancelledReservationNotificationProvider = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
  const { supabaseProfile, isLoggedIn } = useAuth();
  const [shownCancelledReservations, setShownCancelledReservations] = useState<Set<string>>(new Set());
  const [isInitialized, setIsInitialized] = useState(false);

  // Charger les notifications affichées depuis le stockage au démarrage
  useEffect(() => {
    const loadShownReservations = async () => {
      const stored = await loadIdsFromStorage(SHOWN_CANCELLED_RESERVATIONS_KEY);
      setShownCancelledReservations(stored);
      setIsInitialized(true);
    };
    loadShownReservations();
  }, []);

  // Vérifier les réservations annulées passées au démarrage
  useEffect(() => {
    if (!supabaseProfile || !isInitialized) {
      console.log('[CancelledReservationNotificationContext] Waiting for initialization or profile');
      return;
    }

    const checkPastCancelledReservations = async () => {
      try {
        console.log('[CancelledReservationNotificationContext] Checking for past cancelled reservations for guest:', supabaseProfile.id);
        console.log('[CancelledReservationNotificationContext] Already shown reservations:', Array.from(shownCancelledReservations));
        
        const { data: bookings, error } = await (supabase as any)
          .from('bookings')
          .select('*')
          .eq('guest_profile_id', supabaseProfile.id)
          .eq('status', 'cancelled')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          console.error('[CancelledReservationNotificationContext] Error fetching past cancelled reservations:', error);
          return;
        }

        if (bookings && bookings.length > 0) {
          console.log('[CancelledReservationNotificationContext] Found past cancelled reservations:', bookings.length);
          
          // Afficher les réservations annulées non encore affichées
          for (const booking of bookings) {
            // Vérifier que la réservation appartient bien à l'utilisateur actuel
            if (booking.guest_profile_id !== supabaseProfile.id) {
              console.log('[CancelledReservationNotificationContext] Skipping reservation not for current user:', booking.id);
              continue;
            }

            if (!shownCancelledReservations.has(booking.id)) {
              console.log('[CancelledReservationNotificationContext] Showing past cancelled reservation notification:', booking.id);
              showCancelledReservationNotification(booking, router);
              const newShownReservations = new Set(shownCancelledReservations);
              newShownReservations.add(booking.id);
              setShownCancelledReservations(newShownReservations);
              // Sauvegarder immédiatement pour éviter les doublons
              await saveIdsToStorage(SHOWN_CANCELLED_RESERVATIONS_KEY, newShownReservations);
              // Délai plus long entre les notifications pour éviter les chevauchements
              await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
              console.log('[CancelledReservationNotificationContext] Reservation already shown, skipping:', booking.id);
            }
          }
        }
      } catch (error) {
        console.error('[CancelledReservationNotificationContext] Error checking past cancelled reservations:', error);
      }
    };

    // Attendre un peu avant de vérifier les réservations annulées passées
    const timer = setTimeout(() => {
      checkPastCancelledReservations();
    }, 5000);

    return () => clearTimeout(timer);
  }, [supabaseProfile?.id, isInitialized]);

  // Écouter les annulations de réservations en temps réel
  useEffect(() => {
    if (!supabaseProfile) {
      console.log('[CancelledReservationNotificationContext] No supabase profile, skipping realtime subscription');
      return;
    }

    console.log('[CancelledReservationNotificationContext] Setting up realtime subscription for guest:', supabaseProfile.id);
    
    const channel = supabase.channel(`guest-cancelled-reservations-${supabaseProfile.id}`);
    
    const subscription = channel
      .on('postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `guest_profile_id=eq.${supabaseProfile.id}`,
        },
        async (payload: any) => {
          console.log('[CancelledReservationNotificationContext] Realtime booking change received:', {
            eventType: payload.eventType,
            bookingId: payload.new?.id,
            status: payload.new?.status,
            currentGuestId: supabaseProfile.id
          });

          try {
            if (payload.eventType === 'UPDATE' && payload.new && payload.new.status === 'cancelled') {
              const booking = payload.new;
              console.log('[CancelledReservationNotificationContext] Booking cancelled detected:', booking.id);
              
              // Vérifier que la réservation appartient à l'utilisateur actuel
              if (booking.guest_profile_id !== supabaseProfile.id) {
                console.log('[CancelledReservationNotificationContext] Booking not for current user, skipping:', booking.id);
                return;
              }
              
              if (!shownCancelledReservations.has(booking.id)) {
                showCancelledReservationNotification(booking, router);
                const newShownReservations = new Set(shownCancelledReservations);
                newShownReservations.add(booking.id);
                setShownCancelledReservations(newShownReservations);
                // Sauvegarder immédiatement
                await saveIdsToStorage(SHOWN_CANCELLED_RESERVATIONS_KEY, newShownReservations);
              }
            }
          } catch (error) {
            console.error('[CancelledReservationNotificationContext] Error processing realtime update:', error);
          }
        }
      )
      .subscribe((status: string) => {
        console.log('[CancelledReservationNotificationContext] Subscription status:', status);
        
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.log('[CancelledReservationNotificationContext] Subscription error, attempting to resubscribe...');
          channel.unsubscribe();
          channel.subscribe();
        }
      });

    return () => {
      console.log('[CancelledReservationNotificationContext] Cleaning up realtime subscription');
      subscription?.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabaseProfile?.id, shownCancelledReservations, router]);

  const value: CancelledReservationNotificationContextValue = {};

  return (
    <CancelledReservationNotificationContext.Provider value={value}>
      {children}
    </CancelledReservationNotificationContext.Provider>
  );
};

export const useCancelledReservationNotifications = () => {
  const context = useContext(CancelledReservationNotificationContext);
  if (!context) {
    throw new Error('useCancelledReservationNotifications must be used within a CancelledReservationNotificationProvider');
  }
  return context;
};
