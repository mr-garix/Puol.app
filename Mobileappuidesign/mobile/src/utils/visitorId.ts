import AsyncStorage from '@react-native-async-storage/async-storage';

const VISITOR_ID_KEY = 'PUOL_VISITOR_ID';

let cachedVisitorId: string | null = null;

/**
 * Génère un UUID v4 simple compatible avec React Native
 */
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Récupère ou génère un visitor_id persistant pour les utilisateurs non connectés
 * Le visitor_id est stocké localement et réutilisé tant que l'app est installée
 */
export const getOrCreateVisitorId = async (): Promise<string> => {
  // Retourner le cache si disponible
  if (cachedVisitorId) {
    console.log('[VisitorId] Returning cached visitor_id:', cachedVisitorId);
    return cachedVisitorId;
  }

  try {
    // Vérifier si un visitor_id existe déjà en stockage local
    const stored = await AsyncStorage.getItem(VISITOR_ID_KEY);
    
    if (stored && stored.trim().length > 0) {
      console.log('[VisitorId] Found existing visitor_id in storage');
      cachedVisitorId = stored;
      return stored;
    }

    // Générer un nouveau visitor_id (UUID v4)
    const newVisitorId = generateUUID();
    console.log('[VisitorId] Generated new visitor_id:', newVisitorId);

    // Stocker localement
    await AsyncStorage.setItem(VISITOR_ID_KEY, newVisitorId);
    cachedVisitorId = newVisitorId;

    // ⚡ Envoyer immédiatement un heartbeat pour le nouveau visiteur
    // (sans attendre le throttle)
    console.log('[VisitorId] Sending immediate heartbeat for new visitor');
    try {
      const { sendVisitorHeartbeat } = await import('./heartbeat');
      await sendVisitorHeartbeat(newVisitorId);
    } catch (heartbeatErr) {
      console.error('[VisitorId] Error sending immediate heartbeat:', heartbeatErr);
    }

    return newVisitorId;
  } catch (err) {
    console.error('[VisitorId] Error managing visitor_id:', err);
    // En cas d'erreur, générer un UUID temporaire (ne sera pas persisté)
    const tempVisitorId = generateUUID();
    console.warn('[VisitorId] Using temporary visitor_id due to storage error:', tempVisitorId);
    return tempVisitorId;
  }
};

/**
 * Récupère le visitor_id actuellement en cache (sans accès au stockage)
 */
export const getCachedVisitorId = (): string | null => {
  return cachedVisitorId;
};

/**
 * Réinitialise le cache du visitor_id (utile après logout)
 */
export const resetVisitorIdCache = (): void => {
  cachedVisitorId = null;
  console.log('[VisitorId] Cache reset');
};

/**
 * Supprime complètement le visitor_id du stockage local
 * Appelé au logout pour que le visiteur soit traité comme nouveau
 */
export const deleteVisitorId = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(VISITOR_ID_KEY);
    cachedVisitorId = null;
    console.log('[VisitorId] Visitor ID deleted from storage');
  } catch (err) {
    console.error('[VisitorId] Error deleting visitor_id:', err);
  }
};
