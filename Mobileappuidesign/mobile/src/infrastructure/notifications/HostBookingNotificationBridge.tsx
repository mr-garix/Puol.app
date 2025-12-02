import { useEffect, useRef } from 'react';

import { useNotifications, type NotificationPayload } from '@/src/contexts/NotificationContext';
import { useHostBookings } from '@/src/features/host/hooks';
import { useAuth } from '@/src/contexts/AuthContext';

const HostBookingNotificationBridge = () => {
  console.log('[HostBookingNotificationBridge] COMPONENT MOUNTED - This should always appear!');
  
  const { supabaseProfile, isLoggedIn } = useAuth();
  console.log('[HostBookingNotificationBridge] Auth state:', { 
    isLoggedIn, 
    hasProfile: !!supabaseProfile,
    profileId: supabaseProfile?.id,
    username: supabaseProfile?.username
  });
  
  const { bookings, onBookingChange } = useHostBookings('bridge');
  const { showNotification } = useNotifications();
  const previousStatusesRef = useRef<Record<string, string>>({});
  const knownBookingsRef = useRef<Set<string>>(new Set());

  console.log('[HostBookingNotificationBridge] Bridge initialized:', {
    isLoggedIn,
    supabaseProfile: supabaseProfile ? { id: supabaseProfile.id, username: supabaseProfile.username } : null,
    bookingsCount: bookings.length
  });

  // Initialisation : synchroniser les statuts existants
  useEffect(() => {
    console.log('[HostBookingNotificationBridge] Syncing existing bookings:', bookings.length);
    bookings.forEach((booking) => {
      previousStatusesRef.current[booking.id] = booking.status;
      knownBookingsRef.current.add(booking.id);
    });
  }, [bookings]);

  // Écouter les changements en temps réel
  useEffect(() => {
    console.log('[HostBookingNotificationBridge] Setting up effect with:', {
      isLoggedIn,
      hasProfile: !!supabaseProfile,
      profileId: supabaseProfile?.id
    });
    
    if (!isLoggedIn || !supabaseProfile) {
      console.log('[HostBookingNotificationBridge] User not logged in or no profile, skipping subscription');
      return;
    }

    console.log('[HostBookingNotificationBridge] Setting up booking change listener for host:', supabaseProfile.id);
    
    const handleBookingChange = (booking: any) => {
      console.log('[HostBookingNotificationBridge] handleBookingChange called:', {
        bookingId: booking.id,
        status: booking.status,
        previousStatus: previousStatusesRef.current[booking.id],
        guestName: booking.guest?.name,
        listingTitle: booking.listingTitle,
        guest: booking.guest ? { id: booking.guest.id, name: booking.guest.name } : 'no guest data'
      });

      const previousStatus = previousStatusesRef.current[booking.id];
      const isKnownBooking = knownBookingsRef.current.has(booking.id);
      const statusChanged = previousStatus !== booking.status;
      const becameCancelled = isKnownBooking && previousStatus && booking.status === 'cancelled' && statusChanged;
      
      console.log('[HostBookingNotificationBridge] Status analysis:', {
        statusChanged,
        becameCancelled,
        previousStatus,
        currentStatus: booking.status,
        hasGuestData: !!booking.guest,
        hasListingTitle: !!booking.listingTitle
      });
      
      // Mettre à jour le ref avant de traiter
      knownBookingsRef.current.add(booking.id);
      previousStatusesRef.current[booking.id] = booking.status;

      const formatDateLabel = (iso?: string | null) => {
        if (!iso) return null;
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) {
          return null;
        }
        return date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
        });
      };

      const formatStayRange = () => {
        const start = formatDateLabel(booking.checkInDate);
        const end = formatDateLabel(booking.checkOutDate);
        if (start && end) {
          return `${start} → ${end}`;
        }
        return start ?? end ?? null;
      };

      if (!isKnownBooking && booking.status !== 'cancelled') {
        const guestName = booking.guest?.name || 'Un voyageur';
        const listingTitle = booking.listingTitle || 'votre logement';
        const stayRange = formatStayRange();
        const details = stayRange ? `${listingTitle} • ${stayRange}` : listingTitle;

        const notificationPayload: NotificationPayload = {
          id: `booking-created-${booking.id}-${Date.now()}`,
          title: 'Nouvelle réservation 🎉',
          message: `${guestName} a réservé ${details}.`,
          action: {
            type: 'link',
            href: `/host-reservations/${booking.id}`,
          },
        };

        console.log('[HostBookingNotificationBridge] New booking detected - showing notification:', JSON.stringify(notificationPayload, null, 2));

        try {
          showNotification(notificationPayload);
          console.log('[HostBookingNotificationBridge] New booking notification displayed');
        } catch (error) {
          console.error('[HostBookingNotificationBridge] Error showing new booking notification:', error);
        }
        return;
      }

      if (becameCancelled) {
        console.log('[HostBookingNotificationBridge] CANCELLATION DETECTED - Showing notification for booking:', booking.id);
        
        const notificationPayload: NotificationPayload = {
          id: `booking-cancelled-${booking.id}-${Date.now()}`,
          title: 'Réservation annulée',
          message: `${booking.guest?.name || 'Un voyageur'} a annulé sa réservation pour ${booking.listingTitle || 'votre logement'}.`,
          action: { 
            type: 'link', 
            href: `/host-reservations/${booking.id}` 
          } as const
        };
        
        console.log('[HostBookingNotificationBridge] Notification payload:', JSON.stringify(notificationPayload, null, 2));
        
        try {
          console.log('[HostBookingNotificationBridge] Calling showNotification...');
          showNotification(notificationPayload);
          console.log('[HostBookingNotificationBridge] showNotification called successfully');
        } catch (error) {
          console.error('[HostBookingNotificationBridge] Error showing notification:', error);
        }
      } else {
        console.log('[HostBookingNotificationBridge] No notification needed - not a new cancellation');
      }
    };

    console.log('[HostBookingNotificationBridge] Subscribing to booking changes');
    const unsubscribe = onBookingChange(handleBookingChange);
    
    // Vérifier immédiatement après l'abonnement
    console.log('[HostBookingNotificationBridge] Subscription to booking changes established');

    return () => {
      console.log('[HostBookingNotificationBridge] Cleaning up booking change listener');
      // Ne pas appeler directement unsubscribe ici, car c'est déjà géré par le hook useHostBookings
    };
  }, [isLoggedIn, supabaseProfile, onBookingChange, showNotification]);

  return null;
};

export default HostBookingNotificationBridge;
