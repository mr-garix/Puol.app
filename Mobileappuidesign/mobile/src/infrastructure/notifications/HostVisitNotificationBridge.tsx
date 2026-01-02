import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useNotifications, type NotificationPayload } from '@/src/contexts/NotificationContext';
import { useAuth } from '@/src/contexts/AuthContext';
import { supabase } from '@/src/supabaseClient';

const NOTIFIED_HOST_VISITS_STORAGE_KEY = 'notified_host_visits_cache';

const HostVisitNotificationBridge = () => {
  console.log('[HostVisitNotificationBridge] COMPONENT MOUNTED - This should always appear!');
  
  const { supabaseProfile, isLoggedIn } = useAuth();
  const isHost = supabaseProfile?.role === 'host';
  
  const { showNotification } = useNotifications();
  const notifiedVisitsRef = useRef<Set<string>>(new Set());
  const [notifiedVisitsLoaded, setNotifiedVisitsLoaded] = useState(false);

  console.log('[HostVisitNotificationBridge] Bridge initialized:', {
    isLoggedIn,
    isHost,
    profileRole: supabaseProfile?.role,
    supabaseProfile: supabaseProfile ? { id: supabaseProfile.id, username: supabaseProfile.username, role: supabaseProfile.role } : null,
  });

  // 💾 Charger le cache des notifications affichées depuis AsyncStorage
  useEffect(() => {
    const loadNotifiedVisits = async () => {
      try {
        const cached = await AsyncStorage.getItem(NOTIFIED_HOST_VISITS_STORAGE_KEY);
        if (cached) {
          const notifiedIds = JSON.parse(cached) as string[];
          notifiedVisitsRef.current = new Set(notifiedIds);
          console.log('[HostVisitNotificationBridge] Loaded notified visits from cache:', notifiedIds.length);
        }
      } catch (error) {
        console.error('[HostVisitNotificationBridge] Error loading notified visits cache:', error);
      } finally {
        setNotifiedVisitsLoaded(true);
      }
    };

    loadNotifiedVisits();
  }, []);

  // 🔔 Écouter les événements broadcast de Supabase pour les nouvelles visites du HOST
  useEffect(() => {
    if (!isLoggedIn || !supabaseProfile || !isHost || !notifiedVisitsLoaded) {
      console.log('[HostVisitNotificationBridge] Not ready for broadcast subscription:', {
        isLoggedIn,
        hasProfile: !!supabaseProfile,
        isHost,
        notifiedVisitsLoaded,
      });
      return;
    }

    const channelName = `host-visit-notifications-${supabaseProfile.id}`;
    console.log('[HostVisitNotificationBridge] Setting up broadcast subscription for host visit notifications');
    console.log('[HostVisitNotificationBridge] Listening on channel:', channelName);

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'new_host_visit' }, (payload: any) => {
        console.log('[HostVisitNotificationBridge] 🎉 Received new host visit broadcast:', JSON.stringify(payload, null, 2));

        const visitData = payload.payload;
        if (!visitData) {
          console.log('[HostVisitNotificationBridge] No visit data in payload');
          return;
        }

        const notificationKey = `host-visit-created-${visitData.visitId}`;
        if (notifiedVisitsRef.current.has(notificationKey)) {
          console.log('[HostVisitNotificationBridge] Already notified for visit:', visitData.visitId);
          return;
        }

        const visitDateLabel = new Date(visitData.visitDate).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
        });

        const notificationPayload: NotificationPayload = {
          id: `host-visit-created-${visitData.visitId}-${Date.now()}`,
          title: 'Nouvelle visite programmée 📅',
          message: `${visitData.guestName} a programmé une visite de ${visitData.listingTitle} • ${visitDateLabel} à ${visitData.visitTime}.`,
          action: {
            type: 'link',
            href: `/host-visit/${visitData.visitId}`,
          },
        };

        console.log('[HostVisitNotificationBridge] Showing visit notification from broadcast:', JSON.stringify(notificationPayload, null, 2));

        try {
          showNotification(notificationPayload);
          notifiedVisitsRef.current.add(notificationKey);

          // 💾 Sauvegarder le cache
          const notifiedArray = Array.from(notifiedVisitsRef.current);
          AsyncStorage.setItem(NOTIFIED_HOST_VISITS_STORAGE_KEY, JSON.stringify(notifiedArray)).catch((err) => {
            console.error('[HostVisitNotificationBridge] Error saving notified visits cache:', err);
          });
          console.log('[HostVisitNotificationBridge] Visit notification displayed and cached');
        } catch (error) {
          console.error('[HostVisitNotificationBridge] Error showing visit notification:', error);
        }
      })
      .subscribe((status) => {
        console.log('[HostVisitNotificationBridge] Broadcast subscription status:', status);
      });

    return () => {
      console.log('[HostVisitNotificationBridge] Cleaning up broadcast subscription');
      supabase.removeChannel(channel);
    };
  }, [isLoggedIn, supabaseProfile, isHost, notifiedVisitsLoaded, showNotification]);

  return null;
};

export default HostVisitNotificationBridge;
