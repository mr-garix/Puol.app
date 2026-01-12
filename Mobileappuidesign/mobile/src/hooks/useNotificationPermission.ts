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
        const state = await OneSignalService.getPermissionState();
        const systemStatus = state?.status ?? null;
        
        console.log('[useNotificationPermission] Stored values - accepted:', accepted, 'denied:', denied, 'systemStatus:', systemStatus);
        
        // Si l'utilisateur a accepté et que le système est toujours autorisé, ne pas afficher la modale
        if (accepted === 'true' && systemStatus === 'authorized') {
          console.log('[useNotificationPermission] Modal hidden (already accepted)');
          setShowModal(false);
        }
        // Si refusé OU jamais accepté, on affiche notre modale de relance
        else {
          console.log('[useNotificationPermission] Showing modal (denied or not accepted yet)');
          setShowModal(true);
        }
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
