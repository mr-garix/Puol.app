import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNotifications, type NotificationPayload } from '@/src/contexts/NotificationContext';
import { useHostBookings } from '@/src/features/host/hooks';
import { useAuth } from '@/src/contexts/AuthContext';
import { fetchHostListingIds } from '@/src/features/bookings/services';

const NOTIFIED_BOOKINGS_STORAGE_KEY = 'notified_bookings_cache';

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
  const hostListingIdsRef = useRef<Set<string>>(new Set());
  const hasLoadedHostListingsRef = useRef(false);
  const notifiedBookingsRef = useRef<Set<string>>(new Set());
  const [notifiedBookingsLoaded, setNotifiedBookingsLoaded] = useState(false);

  console.log('[HostBookingNotificationBridge] Bridge initialized:', {
    isLoggedIn,
    supabaseProfile: supabaseProfile ? { id: supabaseProfile.id, username: supabaseProfile.username } : null,
    bookingsCount: bookings.length
  });

  // 💾 Charger le cache des notifications affichées depuis AsyncStorage
  useEffect(() => {
    const loadNotifiedBookings = async () => {
      try {
        const cached = await AsyncStorage.getItem(NOTIFIED_BOOKINGS_STORAGE_KEY);
        if (cached) {
          const notifiedIds = JSON.parse(cached) as string[];
          notifiedBookingsRef.current = new Set(notifiedIds);
          console.log('[HostBookingNotificationBridge] Loaded notified bookings from cache:', notifiedIds.length);
        }
      } catch (error) {
        console.error('[HostBookingNotificationBridge] Error loading notified bookings cache:', error);
      } finally {
        setNotifiedBookingsLoaded(true);
      }
    };

    loadNotifiedBookings();
  }, []);

  // Initialisation : synchroniser les statuts existants
  useEffect(() => {
    console.log('[HostBookingNotificationBridge] Syncing existing bookings:', bookings.length);
    bookings.forEach((booking) => {
      previousStatusesRef.current[booking.id] = booking.status;
      knownBookingsRef.current.add(booking.id);
    });
  }, [bookings]);

  // Charger les IDs des listings du host pour validation
  useEffect(() => {
    hostListingIdsRef.current = new Set();
    hasLoadedHostListingsRef.current = false;

    const loadHostListingIds = async () => {
      if (!isLoggedIn || !supabaseProfile) {
        return;
      }

      try {
        const listingIds = await fetchHostListingIds(supabaseProfile.id);
        hostListingIdsRef.current = new Set(listingIds);
        console.log('[HostBookingNotificationBridge] Loaded host listing IDs:', {
          hostId: supabaseProfile.id,
          listingCount: listingIds.length,
          listingIds
        });
      } catch (error) {
        console.error('[HostBookingNotificationBridge] Failed to load host listing IDs:', error);
        hostListingIdsRef.current = new Set();
      } finally {
        hasLoadedHostListingsRef.current = true;
      }
    };

    loadHostListingIds();
  }, [isLoggedIn, supabaseProfile]);

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
        listingId: booking.listingId,
        guest: booking.guest ? { id: booking.guest.id, name: booking.guest.name } : 'no guest data',
        currentHostId: supabaseProfile.id
      });

      // Validation locale : vérifier que le listing appartient au host
      if (!booking.listingId) {
        console.log('[HostBookingNotificationBridge] No listingId in booking, skipping notification');
        return;
      }
      const hasLoadedHostListings = hasLoadedHostListingsRef.current && hostListingIdsRef.current.size > 0;
      if (hasLoadedHostListings && !hostListingIdsRef.current.has(booking.listingId)) {
        console.log('[HostBookingNotificationBridge] Listing does not belong to current host, skipping notification', {
          bookingListingId: booking.listingId,
          currentHostId: supabaseProfile.id,
          hostListingIds: Array.from(hostListingIdsRef.current)
        });
        return;
      }

      console.log('[HostBookingNotificationBridge] Notification validated for host', {
        bookingListingId: booking.listingId,
        hostId: supabaseProfile.id
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

      // 🎉 Afficher notification si c'est une nouvelle réservation (confirmée ou en attente)
      if (!isKnownBooking && booking.status !== 'cancelled') {
        // Vérifier si on a déjà notifié cette réservation pour éviter les doublons
        const notificationKey = `booking-created-${booking.id}`;
        if (notifiedBookingsRef.current.has(notificationKey)) {
          console.log('[HostBookingNotificationBridge] Already notified for booking:', booking.id);
          return;
        }
        
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
          notifiedBookingsRef.current.add(notificationKey); // 🆕 Marquer comme notifié
          
          // 💾 Sauvegarder le cache dans AsyncStorage pour persister après actualisation
          const notifiedArray = Array.from(notifiedBookingsRef.current);
          AsyncStorage.setItem(NOTIFIED_BOOKINGS_STORAGE_KEY, JSON.stringify(notifiedArray)).catch((err) => {
            console.error('[HostBookingNotificationBridge] Error saving notified bookings cache:', err);
          });
          console.log('[HostBookingNotificationBridge] New booking notification displayed and cached');
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
