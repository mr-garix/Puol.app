import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OneSignalService } from '@/src/services/OneSignalService';
import { Platform, Linking } from 'react-native';

const NOTIFICATION_PERMISSION_KEY = 'notification_permission_accepted';
const NOTIFICATION_PERMISSION_DENIED_KEY = 'notification_permission_denied';

export const useNotificationPermission = () => {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Vérifier si l'utilisateur a déjà accepté ou refusé les notifications
  useEffect(() => {
    const checkPermissionStatus = async () => {
      try {
        console.log('[useNotificationPermission] Checking permission status...');
        const accepted = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_KEY);
        const denied = await AsyncStorage.getItem(NOTIFICATION_PERMISSION_DENIED_KEY);
        // Status OneSignal (si disponible)
        let systemStatus: string | null = null;
        try {
          const state = await OneSignalService.getPermissionState();
          systemStatus = state?.status ?? null;
        } catch (err) {
          console.warn('[useNotificationPermission] getPermissionState failed', err);
        }

        // Fallback Expo (dynamiques, sans dépendance typée)
        let expoStatus: string | null = null;
        try {
          const ExpoNotifications = require('expo-notifications');
          if (ExpoNotifications?.getPermissionsAsync) {
            const expoPerm = await ExpoNotifications.getPermissionsAsync();
            expoStatus = expoPerm?.status ?? null;
          }
        } catch (expoErr) {
          console.warn('[useNotificationPermission] Expo getPermissionsAsync failed', expoErr);
        }

        // Déterminer si on a pu obtenir un statut système fiable
        const hasSystemInfo = systemStatus !== null || expoStatus !== null;
        
        const isAuthorized =
          systemStatus === 'authorized' ||
          systemStatus === 'provisional' ||
          expoStatus === 'granted' ||
          expoStatus === 'limited';
        let willShowModal = false;
        let decisionReason = '';
        
        console.log('[useNotificationPermission] Stored values - accepted:', accepted, 'denied:', denied, 'systemStatus:', systemStatus, 'expoStatus:', expoStatus, 'hasSystemInfo:', hasSystemInfo);
        
        // Si le système est autorisé, on synchronise le flag et on masque la modale
        if (isAuthorized) {
          await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
          await AsyncStorage.removeItem(NOTIFICATION_PERMISSION_DENIED_KEY);
          console.log('[useNotificationPermission] Modal hidden (system authorized)');
          setShowModal(false);
          decisionReason = 'authorized-system';
        }
        // FALLBACK : Si aucune info système disponible, on se fie au flag accepted
        else if (!hasSystemInfo && accepted === 'true') {
          console.log('[useNotificationPermission] Modal hidden (no system info but accepted flag is true)');
          setShowModal(false);
          decisionReason = 'no-system-info-but-accepted-flag';
        }
        // Si le système n'est pas autorisé mais qu'on avait déjà accepté, on ré-affiche pour réactiver
        else if (accepted === 'true' && hasSystemInfo && !isAuthorized) {
          console.log('[useNotificationPermission] Showing modal (was accepted but system now blocked)');
          setShowModal(true);
          willShowModal = true;
          decisionReason = 'accepted-flag-but-blocked-system';
        }
        // Cas générique : refusé ou jamais accepté -> afficher
        else {
          console.log('[useNotificationPermission] Showing modal (denied or not accepted yet)');
          setShowModal(true);
          willShowModal = true;
          decisionReason = 'denied-or-not-accepted';
        }

        console.log('[useNotificationPermission] Decision summary:', {
          isAuthorized,
          systemStatus,
          accepted,
          denied,
          willShowModal,
          decisionReason,
        });
      } catch (error) {
        console.error('[useNotificationPermission] Error checking permission status:', error);
        setShowModal(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissionStatus();
  }, []);

  const handleAcceptNotifications = useCallback(async () => {
    try {
      console.log('[useNotificationPermission] Requesting notification permission...');
      
      // Demander la permission OneSignal
      const result = await OneSignalService.requestPermission();
      
      console.log('[useNotificationPermission] Permission result:', result);
      
      if (result) {
        // Marquer comme accepté dans AsyncStorage
        await AsyncStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
        // Effacer le flag de refus s'il existe
        await AsyncStorage.removeItem(NOTIFICATION_PERMISSION_DENIED_KEY);

        // Fermer la modale
        setShowModal(false);
        return true;
      }

      // Permission refusée ou non accordée : marquer le refus pour réafficher la modale plus tard
      await AsyncStorage.setItem(NOTIFICATION_PERMISSION_DENIED_KEY, 'true');
      setShowModal(true);

      // Si iOS et déjà refusé dans Réglages, proposer d'ouvrir les paramètres
      if (Platform.OS === 'ios') {
        Linking.openSettings().catch((err) => console.warn('[useNotificationPermission] openSettings failed', err));
      }
      return false;
    } catch (error) {
      console.error('[useNotificationPermission] Error requesting permission:', error);
      // Ne pas fermer la modale en cas d'erreur, laisser l'utilisateur réessayer
      return false;
    }
  }, []);

  const handleDismissModal = useCallback(() => {
    // L'utilisateur a cliqué sur "Plus tard"
    // Marquer que l'utilisateur a refusé (pour relancer la modale plus tard)
    AsyncStorage.setItem(NOTIFICATION_PERMISSION_DENIED_KEY, 'true').catch((err) => {
      console.error('[useNotificationPermission] Error marking permission as denied:', err);
    });
    setShowModal(false);
  }, []);

  return {
    showModal,
    isLoading,
    handleAcceptNotifications,
    handleDismissModal,
  };
};
