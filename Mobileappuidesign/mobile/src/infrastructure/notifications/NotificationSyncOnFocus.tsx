import { useEffect } from 'react';
import { useAppFocus } from '@/src/hooks/useAppFocus';
import { useAuth } from '@/src/contexts/AuthContext';
import { useNotifications } from '@/src/contexts/NotificationContext';
import { supabase } from '@/src/supabaseClient';
import { loadIdsFromStorage, saveIdsToStorage } from '@/src/utils/asyncStorageUtils';

const NOTIFIED_CANCELLATIONS_KEY = 'notified_guest_cancellations_cache';
const NOTIFIED_REFUNDS_KEY = 'notified_refunds_cache';
const NOTIFIED_PAYMENT_REQUESTS_KEY = 'notified_payment_requests_cache';

const NotificationSyncOnFocus = () => {
  const { supabaseProfile, isLoggedIn } = useAuth();
  const { showNotification } = useNotifications();

  const handleAppFocus = async (isFocused: boolean) => {
    if (!isFocused || !isLoggedIn || !supabaseProfile) {
      return;
    }

    console.log('[NotificationSyncOnFocus] App focused, checking for pending notifications');

    try {
      // Charger les notifications déjà affichées
      const notifiedCancellations = await loadIdsFromStorage(NOTIFIED_CANCELLATIONS_KEY);
      const notifiedRefunds = await loadIdsFromStorage(NOTIFIED_REFUNDS_KEY);
      const notifiedPaymentRequests = await loadIdsFromStorage(NOTIFIED_PAYMENT_REQUESTS_KEY);

      const profileId = supabaseProfile.id;

      // ============================================================================
      // 1. Vérifier les réservations annulées (pour les hôtes)
      // ============================================================================
      if (supabaseProfile.role === 'host' || supabaseProfile.supply_role === 'host') {
        console.log('[NotificationSyncOnFocus] Checking for cancelled bookings...');
        try {
          const { data: hostListings } = await supabase
            .from('listings')
            .select('id')
            .eq('host_id', profileId);

          if (hostListings && hostListings.length > 0) {
            const listingIds = hostListings.map((l) => l.id);

            const { data: cancelledBookings } = await supabase
              .from('bookings')
              .select('id, guest_profile_id, listing_id, status')
              .in('listing_id', listingIds)
              .eq('status', 'cancelled');

            if (cancelledBookings) {
              for (const booking of cancelledBookings) {
                const notificationKey = `cancellation-${booking.id}`;
                if (!notifiedCancellations.has(notificationKey)) {
                  console.log('[NotificationSyncOnFocus] Found pending cancellation notification:', booking.id);

                  // Récupérer les infos du guest et du listing
                  const { data: guestData } = await supabase
                    .from('profiles')
                    .select('first_name, last_name')
                    .eq('id', booking.guest_profile_id)
                    .maybeSingle();

                  const { data: listingData } = await supabase
                    .from('listings')
                    .select('title')
                    .eq('id', booking.listing_id)
                    .maybeSingle();

                  const guestName = guestData
                    ? [guestData.first_name, guestData.last_name].filter(Boolean).join(' ') || 'Un voyageur'
                    : 'Un voyageur';

                  const listingTitle = listingData?.title || 'Annonce PUOL';

                  showNotification({
                    id: `guest-cancellation-${booking.id}-${Date.now()}`,
                    title: 'Réservation annulée',
                    message: `${guestName} a annulé sa réservation pour "${listingTitle}"`,
                    action: { type: 'link', href: `/host-reservations/${booking.id}` },
                  });

                  notifiedCancellations.add(notificationKey);
                }
              }

              if (notifiedCancellations.size > 0) {
                await saveIdsToStorage(NOTIFIED_CANCELLATIONS_KEY, notifiedCancellations);
              }
            }
          }
        } catch (error) {
          console.error('[NotificationSyncOnFocus] Error checking cancelled bookings:', error);
        }
      }

      // ============================================================================
      // 2. Vérifier les demandes de paiement en attente (pour les invités)
      // ============================================================================
      if (supabaseProfile.role === 'guest' || supabaseProfile.supply_role === 'none') {
        console.log('[NotificationSyncOnFocus] Checking for pending payment requests...');
        try {
          const { data: guestBookings } = await supabase
            .from('bookings')
            .select('id, listing_id, remaining_payment_status, remaining_amount')
            .eq('guest_profile_id', profileId)
            .eq('remaining_payment_status', 'requested');

          if (guestBookings) {
            for (const booking of guestBookings) {
              const notificationKey = `payment-request-${booking.id}`;
              if (!notifiedPaymentRequests.has(notificationKey)) {
                console.log('[NotificationSyncOnFocus] Found pending payment request:', booking.id);

                const { data: listingData } = await supabase
                  .from('listings')
                  .select('title')
                  .eq('id', booking.listing_id)
                  .maybeSingle();

                const listingTitle = listingData?.title || 'Annonce PUOL';
                const amount = booking.remaining_amount || 0;

                showNotification({
                  id: `payment-request-${booking.id}-${Date.now()}`,
                  title: 'Demande de paiement',
                  message: `L'hôte demande le paiement du reste (${amount.toFixed(0)} €) pour "${listingTitle}"`,
                  action: { type: 'link', href: `/reservations/${booking.id}` },
                });

                notifiedPaymentRequests.add(notificationKey);
              }
            }

            if (notifiedPaymentRequests.size > 0) {
              await saveIdsToStorage(NOTIFIED_PAYMENT_REQUESTS_KEY, notifiedPaymentRequests);
            }
          }
        } catch (error) {
          console.error('[NotificationSyncOnFocus] Error checking payment requests:', error);
        }
      }

      console.log('[NotificationSyncOnFocus] Notification sync completed');
    } catch (error) {
      console.error('[NotificationSyncOnFocus] Error syncing notifications:', error);
    }
  };

  useAppFocus(handleAppFocus);

  return null;
};

export default NotificationSyncOnFocus;
