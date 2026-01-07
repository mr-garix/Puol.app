import { useEffect, useRef, useState } from 'react';

import { useNotifications, type NotificationPayload } from '@/src/contexts/NotificationContext';
import { useLandlordVisits } from '@/src/features/rental-visits/hooks';
import { useAuth } from '@/src/contexts/AuthContext';
import { saveIdsToStorage, loadIdsFromStorage } from '@/src/utils/asyncStorageUtils';
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
        const notifiedIds = await loadIdsFromStorage(NOTIFIED_VISITS_STORAGE_KEY);
        notifiedVisitsRef.current = notifiedIds;
        console.log('[LandlordVisitNotificationBridge] Loaded notified visits from cache:', notifiedIds.size);
      } catch (error) {
        console.error('[LandlordVisitNotificationBridge] Error loading notified visits cache:', error);
      } finally {
        setNotifiedVisitsLoaded(true);
      }
    };

    loadNotifiedVisits();
  }, []);

  // Initialisation : synchroniser les statuts existants
  // ⚠️ NE PAS ajouter les visites à knownVisitsRef au démarrage
  // Cela empêcherait le polling de détecter les nouvelles visites
  useEffect(() => {
    console.log('[LandlordVisitNotificationBridge] Syncing existing visits:', visits.length);
    visits.forEach((visit) => {
      // Seulement mettre à jour les statuts, pas ajouter à knownVisitsRef
      // Les visites seront ajoutées à knownVisitsRef lors du polling
      if (!previousStatusesRef.current[visit.id]) {
        previousStatusesRef.current[visit.id] = visit.status;
      }
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
          saveIdsToStorage(NOTIFIED_VISITS_STORAGE_KEY, notifiedVisitsRef.current).catch((err) => {
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

    console.log('[LandlordVisitNotificationBridge] Checking for new visits via polling - Total visits:', visits.length);

    visits.forEach((visit) => {
      const previousStatus = previousStatusesRef.current[visit.id];
      const isKnownVisit = knownVisitsRef.current.has(visit.id);
      
      console.log('[LandlordVisitNotificationBridge] Visit analysis:', {
        visitId: visit.id,
        status: visit.status,
        isKnownVisit,
        previousStatus,
        guestName: visit.guest?.name,
        listingTitle: visit.listingTitle,
        visitDate: visit.visitDate,
        visitTime: visit.visitTime,
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
      // ⚠️ Ignorer les visites du chat (mobile_guest_chat) - elles envoient la notification au HOST
      // Notifier seulement les visites de la property (mobile_guest)
      if (!isKnownVisit && visit.status !== 'cancelled' && visit.source !== 'mobile_guest_chat') {
        console.log('[LandlordVisitNotificationBridge] 🆕 NEW VISIT DETECTED:', {
          visitId: visit.id,
          isKnownVisit,
          status: visit.status,
          source: visit.source,
        });

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

        console.log('[LandlordVisitNotificationBridge] 📢 Calling showNotification with payload:', JSON.stringify(notificationPayload, null, 2));

        try {
          showNotification(notificationPayload);
          console.log('[LandlordVisitNotificationBridge] ✅ showNotification called successfully');
          
          notifiedVisitsRef.current.add(notificationKey);

          // 💾 Sauvegarder le cache dans AsyncStorage pour persister après actualisation
          saveIdsToStorage(NOTIFIED_VISITS_STORAGE_KEY, notifiedVisitsRef.current).catch((err) => {
            console.error('[LandlordVisitNotificationBridge] Error saving notified visits cache:', err);
          });
          console.log('[LandlordVisitNotificationBridge] New visit notification displayed and cached');
        } catch (error) {
          console.error('[LandlordVisitNotificationBridge] ❌ Error showing new visit notification:', error);
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
