import { supabase } from '@/src/supabaseClient';
import { saveIdsToStorage, loadIdsFromStorage } from '@/src/utils/asyncStorageUtils';

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
    const notifiedVisits = await loadIdsFromStorage(NOTIFIED_VISITS_STORAGE_KEY);
    const notificationKey = `visit-created-${visitId}`;

    // Vérifier si on a déjà notifié cette visite
    if (notifiedVisits.has(notificationKey)) {
      console.log('[visitNotificationService] Visit already notified:', visitId);
      return;
    }

    // Ajouter à la liste des notifications envoyées
    notifiedVisits.add(notificationKey);
    await saveIdsToStorage(NOTIFIED_VISITS_STORAGE_KEY, notifiedVisits);

    // Envoyer une notification via Supabase (pour les notifications push)
    // Cette fonction sera appelée par le système de notifications en temps réel
    console.log('[visitNotificationService] Visit notification cached:', notificationKey);
  } catch (error) {
    console.error('[visitNotificationService] Error sending visit notification:', error);
  }
};
