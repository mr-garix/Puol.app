import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/src/supabaseClient';

const NOTIFIED_VISITS_STORAGE_KEY = 'notified_visits_cache';

export const sendVisitNotification = async (visitId: string, guestName: string, listingTitle: string, visitDate: string, visitTime: string, landlordProfileId: string) => {
  try {
    console.log('[visitNotificationService] Sending visit notification:', {
      visitId,
      guestName,
      listingTitle,
      visitDate,
      visitTime,
      landlordProfileId
    });

    // Récupérer le cache des notifications déjà envoyées
    const cached = await AsyncStorage.getItem(NOTIFIED_VISITS_STORAGE_KEY);
    const notifiedVisits = cached ? (JSON.parse(cached) as string[]) : [];
    const notificationKey = `visit-created-${visitId}`;

    // Vérifier si on a déjà notifié cette visite
    if (notifiedVisits.includes(notificationKey)) {
      console.log('[visitNotificationService] Visit already notified:', visitId);
      return;
    }

    // Ajouter à la liste des notifications envoyées
    notifiedVisits.push(notificationKey);
    await AsyncStorage.setItem(NOTIFIED_VISITS_STORAGE_KEY, JSON.stringify(notifiedVisits));

    // Envoyer une notification via Supabase (pour les notifications push)
    // Cette fonction sera appelée par le système de notifications en temps réel
    console.log('[visitNotificationService] Visit notification cached:', notificationKey);
  } catch (error) {
    console.error('[visitNotificationService] Error sending visit notification:', error);
  }
};

export const clearVisitNotificationCache = async () => {
  try {
    await AsyncStorage.removeItem(NOTIFIED_VISITS_STORAGE_KEY);
    console.log('[visitNotificationService] Visit notification cache cleared');
  } catch (error) {
    console.error('[visitNotificationService] Error clearing cache:', error);
  }
};
