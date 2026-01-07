import { useEffect, useRef, useState } from 'react';

import { useNotifications, type NotificationPayload } from '@/src/contexts/NotificationContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { saveIdsToStorage, loadIdsFromStorage } from '@/src/utils/asyncStorageUtils';
import { supabase } from '@/src/supabaseClient';

const NOTIFIED_CANCELLATIONS_STORAGE_KEY = 'notified_guest_cancellations_cache';

const GuestCancellationNotificationBridge = () => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const { showNotification } = useNotifications();
  const lastNotifiedRef = useRef<string | null>(null);
  const notifiedCancellationsRef = useRef<Set<string>>(new Set());
  const [notifiedCancellationsLoaded, setNotifiedCancellationsLoaded] = useState(false);

  console.log('[GuestCancellationNotificationBridge] COMPONENT MOUNTED - This should always appear!');
  console.log('[GuestCancellationNotificationBridge] Auth state:', { isLoggedIn, profileId: supabaseProfile?.id, username: supabaseProfile?.username });

  // 💾 Charger le cache des notifications affichées depuis AsyncStorage
  useEffect(() => {
    const loadNotifiedCancellations = async () => {
      try {
        const notifiedIds = await loadIdsFromStorage(NOTIFIED_CANCELLATIONS_STORAGE_KEY);
        notifiedCancellationsRef.current = notifiedIds;
        console.log('[GuestCancellationNotificationBridge] Loaded notified cancellations from cache:', notifiedIds.size);
      } catch (error) {
        console.error('[GuestCancellationNotificationBridge] Error loading notified cancellations cache:', error);
      } finally {
        setNotifiedCancellationsLoaded(true);
      }
    };

    loadNotifiedCancellations();
  }, []);

  // 🔔 Écouter les changements de statut des réservations (postgres_changes)
  useEffect(() => {
    const hostId = supabaseProfile?.id;
    console.log('[GuestCancellationNotificationBridge] useEffect triggered - isLoggedIn:', isLoggedIn, 'hostId:', hostId);
    
    if (!isLoggedIn || !hostId) {
      console.log('[GuestCancellationNotificationBridge] Not logged in or no hostId, skipping subscription setup');
      return;
    }

    console.log('[GuestCancellationNotificationBridge] ✅ Setting up postgres_changes subscription for booking cancellations');
    console.log('[GuestCancellationNotificationBridge] Listening for updates where listing.host_id =', hostId);

    const channel = supabase
      .channel(`host-booking-cancellations:${hostId}`)
      .on(
        'postgres_changes',
        {
          schema: 'public',
          table: 'bookings',
          event: 'UPDATE',
        },
        async (payload) => {
          console.log('[GuestCancellationNotificationBridge] 🎉 Received booking update:', JSON.stringify(payload, null, 2));

          const oldStatus = payload.old?.status;
          const newStatus = payload.new?.status;
          const bookingId = payload.new?.id;
          const listingId = payload.new?.listing_id;

          console.log('[GuestCancellationNotificationBridge] Update details:', {
            bookingId,
            listingId,
            oldStatus,
            newStatus,
            expectedHostId: hostId,
          });

          // Vérifier que c'est une annulation (passage à 'cancelled')
          if (newStatus !== 'cancelled') {
            console.log('[GuestCancellationNotificationBridge] Not a cancellation event (newStatus is', newStatus, '), skipping');
            return;
          }

          if (oldStatus === 'cancelled') {
            console.log('[GuestCancellationNotificationBridge] Already was cancelled, skipping');
            return;
          }

          if (!bookingId) {
            console.log('[GuestCancellationNotificationBridge] No booking ID in payload');
            return;
          }

          const notificationKey = `cancellation-${bookingId}`;
          if (notifiedCancellationsRef.current.has(notificationKey)) {
            console.log('[GuestCancellationNotificationBridge] Already notified for cancellation:', bookingId);
            return;
          }

          // Récupérer les informations complètes de la réservation et de l'annonce
          try {
            console.log('[GuestCancellationNotificationBridge] Fetching listing data for ID:', listingId);
            const { data: listingDataForHost, error: listingErrorForHost } = await supabase
              .from('listings')
              .select('id, host_id, title')
              .eq('id', listingId)
              .maybeSingle();

            if (listingErrorForHost) {
              console.error('[GuestCancellationNotificationBridge] Error fetching listing data:', listingErrorForHost);
              return;
            }

            if (!listingDataForHost) {
              console.error('[GuestCancellationNotificationBridge] No listing data found for ID:', listingId);
              return;
            }

            console.log('[GuestCancellationNotificationBridge] Listing data fetched:', listingDataForHost);

            // Vérifier que cette annonce appartient bien au host actuel
            if (listingDataForHost.host_id !== hostId) {
              console.log('[GuestCancellationNotificationBridge] This booking does not belong to this host. Listing host:', listingDataForHost.host_id, 'Current host:', hostId);
              return;
            }

            console.log('[GuestCancellationNotificationBridge] ✅ Booking belongs to current host');

            console.log('[GuestCancellationNotificationBridge] Fetching booking data for ID:', bookingId);
            const { data: bookingData, error: bookingError } = await supabase
              .from('bookings')
              .select('id, guest_profile_id, listing_id, checkin_date, checkout_date')
              .eq('id', bookingId)
              .maybeSingle();

            if (bookingError) {
              console.error('[GuestCancellationNotificationBridge] Error fetching booking data:', bookingError);
              return;
            }

            if (!bookingData) {
              console.error('[GuestCancellationNotificationBridge] No booking data found for ID:', bookingId);
              return;
            }

            console.log('[GuestCancellationNotificationBridge] Booking data fetched:', bookingData);

            // Récupérer le nom du voyageur
            console.log('[GuestCancellationNotificationBridge] Fetching guest profile for ID:', bookingData.guest_profile_id);
            const { data: guestData, error: guestError } = await supabase
              .from('profiles')
              .select('first_name, last_name')
              .eq('id', bookingData.guest_profile_id)
              .maybeSingle();

            if (guestError) {
              console.warn('[GuestCancellationNotificationBridge] Error fetching guest data:', guestError);
            }

            const guestName = guestData
              ? [guestData.first_name, guestData.last_name].filter(Boolean).join(' ') || 'Un voyageur'
              : 'Un voyageur';

            console.log('[GuestCancellationNotificationBridge] Guest name:', guestName);

            const listingTitle = listingDataForHost?.title || 'Annonce PUOL';

            console.log('[GuestCancellationNotificationBridge] Listing title:', listingTitle);

            const title = 'Réservation annulée';
            const message = `${guestName} a annulé sa réservation pour "${listingTitle}"`;

            console.log('[GuestCancellationNotificationBridge] ✅ About to show cancellation notification:', { title, message, notificationId: `guest-cancellation-${bookingId}-${Date.now()}` });

            showNotification({
              id: `guest-cancellation-${bookingId}-${Date.now()}`,
              title,
              message,
              action: { type: 'link', href: `/host-reservations/${bookingId}` },
            });

            console.log('[GuestCancellationNotificationBridge] ✅ showNotification called successfully');

            notifiedCancellationsRef.current.add(notificationKey);

            // 💾 Sauvegarder le cache
            saveIdsToStorage(NOTIFIED_CANCELLATIONS_STORAGE_KEY, notifiedCancellationsRef.current).catch((err) => {
              console.error('[GuestCancellationNotificationBridge] Error saving notified cancellations cache:', err);
            });
            console.log('[GuestCancellationNotificationBridge] ✅ Cancellation notification displayed and cached');
          } catch (error) {
            console.error('[GuestCancellationNotificationBridge] ❌ Error processing cancellation:', error);
          }
        },
      )
      .subscribe((status) => {
        console.log('[GuestCancellationNotificationBridge] Postgres_changes subscription status:', status);
      });

    return () => {
      console.log('[GuestCancellationNotificationBridge] Cleaning up postgres_changes subscription');
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, supabaseProfile?.id, showNotification]);

  return null;
};

export default GuestCancellationNotificationBridge;
