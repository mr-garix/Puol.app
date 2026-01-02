import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNotifications, type NotificationPayload } from '@/src/contexts/NotificationContext';
import { useLandlordVisits } from '@/src/features/rental-visits/hooks/useLandlordVisits';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';

const NOTIFIED_VISITS_STORAGE_KEY = 'notified_visits_cache';

const LandlordVisitNotificationBridge = () => {
  console.log('[LandlordVisitNotificationBridge] COMPONENT MOUNTED');
  
  const { supabaseProfile, isLoggedIn } = useAuth();
  const isLandlord = supabaseProfile?.role === 'landlord';
  
  const { visits } = useLandlordVisits();
  const { showNotification } = useNotifications();
  const previousStatusesRef = useRef<Record<string, string>>({});
  const knownVisitsRef = useRef<Set<string>>(new Set());
  const notifiedVisitsRef = useRef<Set<string>>(new Set());
  const [notifiedVisitsLoaded, setNotifiedVisitsLoaded] = useState(false);

  console.log('[LandlordVisitNotificationBridge] Bridge initialized:', {
    isLoggedIn,
    isLandlord,
    supabaseProfile: supabaseProfile ? { id: supabaseProfile.id, username: supabaseProfile.username } : null,
    visitsCount: visits.length
  });

  // 💾 Charger le cache des notifications affichées depuis AsyncStorage
  useEffect(() => {
    const loadNotifiedVisits = async () => {
      try {
        const cached = await AsyncStorage.getItem(NOTIFIED_VISITS_STORAGE_KEY);
        if (cached) {
          const notifiedIds = JSON.parse(cached) as string[];
          notifiedVisitsRef.current = new Set(notifiedIds);
          console.log('[LandlordVisitNotificationBridge] Loaded notified visits from cache:', notifiedIds.length);
        }
      } catch (error) {
        console.error('[LandlordVisitNotificationBridge] Error loading notified visits cache:', error);
      } finally {
        setNotifiedVisitsLoaded(true);
      }
    };

    loadNotifiedVisits();
  }, []);

  // Initialisation : synchroniser les statuts existants
  useEffect(() => {
    console.log('[LandlordVisitNotificationBridge] Syncing existing visits:', visits.length);
    visits.forEach((visit) => {
      previousStatusesRef.current[visit.id] = visit.status;
      knownVisitsRef.current.add(visit.id);
    });
  }, [visits]);

  // 🔔 Écouter les événements broadcast de Supabase pour les nouvelles visites
  useEffect(() => {
    if (!isLoggedIn || !supabaseProfile || !isLandlord || !notifiedVisitsLoaded) {
      console.log('[LandlordVisitNotificationBridge] Not ready for broadcast subscription');
      return;
    }

    console.log('[LandlordVisitNotificationBridge] Setting up broadcast subscription for visit notifications');

    const channelName = `visit-notifications-${supabaseProfile.id}`;
    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'new_visit' }, (payload: any) => {
        console.log('[LandlordVisitNotificationBridge] Received new visit broadcast:', payload);

        const visitData = payload.payload;
        if (!visitData) {
          console.log('[LandlordVisitNotificationBridge] No visit data in payload');
          return;
        }

        const notificationKey = `visit-created-${visitData.visitId}`;
        if (notifiedVisitsRef.current.has(notificationKey)) {
          console.log('[LandlordVisitNotificationBridge] Already notified for visit:', visitData.visitId);
          return;
        }

        const visitDateLabel = new Date(visitData.visitDate).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
        });

        const notificationPayload: NotificationPayload = {
          id: `visit-created-${visitData.visitId}-${Date.now()}`,
          title: 'Nouvelle visite programmée 📅',
          message: `${visitData.guestName} a programmé une visite de ${visitData.listingTitle} • ${visitDateLabel} à ${visitData.visitTime}.`,
          action: {
            type: 'link',
            href: `/landlord-visit/${visitData.visitId}`,
          },
        };

        console.log('[LandlordVisitNotificationBridge] Showing visit notification from broadcast:', JSON.stringify(notificationPayload, null, 2));

        try {
          showNotification(notificationPayload);
          notifiedVisitsRef.current.add(notificationKey);

          // 💾 Sauvegarder le cache
          const notifiedArray = Array.from(notifiedVisitsRef.current);
          AsyncStorage.setItem(NOTIFIED_VISITS_STORAGE_KEY, JSON.stringify(notifiedArray)).catch((err) => {
            console.error('[LandlordVisitNotificationBridge] Error saving notified visits cache:', err);
          });
          console.log('[LandlordVisitNotificationBridge] Visit notification displayed and cached');
        } catch (error) {
          console.error('[LandlordVisitNotificationBridge] Error showing visit notification:', error);
        }
      })
      .subscribe((status) => {
        console.log('[LandlordVisitNotificationBridge] Broadcast subscription status:', status);
      });

    return () => {
      console.log('[LandlordVisitNotificationBridge] Cleaning up broadcast subscription');
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, supabaseProfile, isLandlord, notifiedVisitsLoaded, showNotification]);

  // Écouter les changements de visites via le polling
  useEffect(() => {
    if (!isLoggedIn || !isLandlord || !notifiedVisitsLoaded) {
      console.log('[LandlordVisitNotificationBridge] Not ready for polling notifications');
      return;
    }

    console.log('[LandlordVisitNotificationBridge] Checking for new visits via polling');

    visits.forEach((visit) => {
      const previousStatus = previousStatusesRef.current[visit.id];
      const isKnownVisit = knownVisitsRef.current.has(visit.id);
      
      console.log('[LandlordVisitNotificationBridge] Visit analysis:', {
        visitId: visit.id,
        status: visit.status,
        isKnownVisit,
        previousStatus
      });

      // Mettre à jour le ref avant de traiter
      knownVisitsRef.current.add(visit.id);
      previousStatusesRef.current[visit.id] = visit.status;

      const formatDateLabel = (dateStr?: string) => {
        if (!dateStr) return null;
        try {
          const date = new Date(dateStr);
          if (Number.isNaN(date.getTime())) return null;
          return date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
          });
        } catch {
          return null;
        }
      };

      // 🎉 Afficher notification si c'est une nouvelle visite (confirmée)
      if (!isKnownVisit && visit.status !== 'cancelled') {
        // Vérifier si on a déjà notifié cette visite pour éviter les doublons
        const notificationKey = `visit-created-${visit.id}`;
        if (notifiedVisitsRef.current.has(notificationKey)) {
          console.log('[LandlordVisitNotificationBridge] Already notified for visit:', visit.id);
          return;
        }

        const guestName = visit.guest?.name || 'Un visiteur';
        const listingTitle = visit.listingTitle || 'votre logement';
        const visitDateLabel = formatDateLabel(visit.visitDate);
        const details = visitDateLabel ? `${listingTitle} • ${visitDateLabel} à ${visit.visitTime}` : listingTitle;

        const notificationPayload: NotificationPayload = {
          id: `visit-created-${visit.id}-${Date.now()}`,
          title: 'Nouvelle visite programmée 📅',
          message: `${guestName} a programmé une visite de ${details}.`,
          action: {
            type: 'link',
            href: `/landlord-visit/${visit.id}`,
          },
        };

        console.log('[LandlordVisitNotificationBridge] New visit detected - showing notification:', JSON.stringify(notificationPayload, null, 2));

        try {
          showNotification(notificationPayload);
          notifiedVisitsRef.current.add(notificationKey);

          // 💾 Sauvegarder le cache dans AsyncStorage pour persister après actualisation
          const notifiedArray = Array.from(notifiedVisitsRef.current);
          AsyncStorage.setItem(NOTIFIED_VISITS_STORAGE_KEY, JSON.stringify(notifiedArray)).catch((err) => {
            console.error('[LandlordVisitNotificationBridge] Error saving notified visits cache:', err);
          });
          console.log('[LandlordVisitNotificationBridge] New visit notification displayed and cached');
        } catch (error) {
          console.error('[LandlordVisitNotificationBridge] Error showing new visit notification:', error);
        }
        return;
      }

      // 🚫 Afficher notification si la visite a été annulée
      if (isKnownVisit && previousStatus && visit.status === 'cancelled' && previousStatus !== 'cancelled') {
        console.log('[LandlordVisitNotificationBridge] CANCELLATION DETECTED - Showing notification for visit:', visit.id);

        const notificationPayload: NotificationPayload = {
          id: `visit-cancelled-${visit.id}-${Date.now()}`,
          title: 'Visite annulée 😞',
          message: `La visite de ${visit.guest?.name || 'un visiteur'} pour ${visit.listingTitle} a été annulée.`,
          action: {
            type: 'link',
            href: `/landlord-visit/${visit.id}`,
          },
        };

        console.log('[LandlordVisitNotificationBridge] Notification payload:', JSON.stringify(notificationPayload, null, 2));

        try {
          console.log('[LandlordVisitNotificationBridge] Calling showNotification...');
          showNotification(notificationPayload);
          console.log('[LandlordVisitNotificationBridge] showNotification called successfully');
        } catch (error) {
          console.error('[LandlordVisitNotificationBridge] Error showing notification:', error);
        }
      }
    });
  }, [isLoggedIn, isLandlord, notifiedVisitsLoaded, visits, showNotification]);

  return null;
};

export default LandlordVisitNotificationBridge;
