import { supabase } from '../supabaseClient';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getOrCreateVisitorId } from './visitorId';

interface UserHeartbeatPayload {
  user_id: string;
  last_activity_at: string;
  platform?: string | null;
  app_version?: string | null;
  city?: string | null;
}

interface VisitorHeartbeatPayload {
  visitor_id: string;
  last_activity_at: string;
  platform?: string | null;
  app_version?: string | null;
  city?: string | null;
}

// Cache pour la localisation par IP (valide 1 heure)
let cachedCity: string | null = null;
let cachedCityTime: number = 0;
const CITY_CACHE_DURATION = 60 * 60 * 1000; // 1 heure

async function getCityFromIP(): Promise<string | null> {
  try {
    // Vérifier le cache
    const now = Date.now();
    if (cachedCity && (now - cachedCityTime) < CITY_CACHE_DURATION) {
      console.log('[Heartbeat] Using cached city:', cachedCity);
      return cachedCity;
    }

    // Récupérer la localisation par IP
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    const city = data.city || null;
    console.log('[Heartbeat] City from IP:', city);
    
    // Mettre en cache
    cachedCity = city;
    cachedCityTime = now;
    
    return city;
  } catch (err) {
    console.error('[Heartbeat] Error getting city from IP:', err);
    return null;
  }
}

const THROTTLE_INTERVAL_MS = 30 * 1000;

let lastHeartbeatTime: number = 0;
let lastHeartbeatIdentifier: string | null = null;
let lastHeartbeatType: 'user' | 'visitor' | null = null;

/**
 * Envoie un heartbeat pour un utilisateur connecté
 * UPSERT dans user_activity_heartbeat avec throttle de 30 secondes
 */
export const sendUserHeartbeat = async (
  userId: string,
  city?: string | null
): Promise<void> => {
  console.log('[Heartbeat] sendUserHeartbeat called with userId:', userId, 'city:', city);

  if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
    console.warn('[Heartbeat] userId is required and must be a non-empty string');
    return;
  }

  const now = Date.now();
  const timeSinceLastHeartbeat = now - lastHeartbeatTime;

  if (
    lastHeartbeatIdentifier === userId &&
    lastHeartbeatType === 'user' &&
    timeSinceLastHeartbeat < THROTTLE_INTERVAL_MS
  ) {
    console.log('[Heartbeat] ⏱️ User heartbeat throttled - last was', timeSinceLastHeartbeat, 'ms ago (min required:', THROTTLE_INTERVAL_MS, 'ms)');
    return;
  }

  try {
    let finalCity = city;
    if (!finalCity) {
      console.log('[Heartbeat] City not provided, fetching from IP...');
      finalCity = await getCityFromIP();
    }

    const payload: UserHeartbeatPayload = {
      user_id: userId,
      last_activity_at: new Date().toISOString(),
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version || null,
      city: finalCity || null,
    };

    console.log('[Heartbeat] 📤 Sending user heartbeat payload:', payload);

    const { error } = await supabase
      .from('user_activity_heartbeat')
      .upsert(payload, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('[Heartbeat] ❌ Error sending user heartbeat:', error);
      return;
    }

    console.log('[Heartbeat] ✅ User heartbeat sent successfully');
    lastHeartbeatTime = now;
    lastHeartbeatIdentifier = userId;
    lastHeartbeatType = 'user';
  } catch (err) {
    console.error('[Heartbeat] ❌ Unexpected error in sendUserHeartbeat:', err);
  }
};

/**
 * Envoie un heartbeat pour un visiteur non connecté
 * UPSERT dans visitor_activity_heartbeat avec throttle de 30 secondes
 */
export const sendVisitorHeartbeat = async (
  visitorId: string,
  city?: string | null
): Promise<void> => {
  console.log('[Heartbeat] sendVisitorHeartbeat called with visitorId:', visitorId, 'city:', city);

  if (!visitorId || typeof visitorId !== 'string' || visitorId.trim().length === 0) {
    console.warn('[Heartbeat] visitorId is required and must be a non-empty string');
    return;
  }

  const now = Date.now();
  const timeSinceLastHeartbeat = now - lastHeartbeatTime;

  if (
    lastHeartbeatIdentifier === visitorId &&
    lastHeartbeatType === 'visitor' &&
    timeSinceLastHeartbeat < THROTTLE_INTERVAL_MS
  ) {
    console.log('[Heartbeat] ⏱️ Visitor heartbeat throttled - last was', timeSinceLastHeartbeat, 'ms ago (min required:', THROTTLE_INTERVAL_MS, 'ms)');
    return;
  }

  try {
    let finalCity = city;
    if (!finalCity) {
      console.log('[Heartbeat] City not provided, fetching from IP...');
      finalCity = await getCityFromIP();
    }

    const payload: VisitorHeartbeatPayload = {
      visitor_id: visitorId,
      last_activity_at: new Date().toISOString(),
      platform: Platform.OS,
      app_version: Constants.expoConfig?.version || null,
      city: finalCity || null,
    };

    console.log('[Heartbeat] 📤 Sending visitor heartbeat payload:', payload);

    const { error } = await supabase
      .from('visitor_activity_heartbeat')
      .upsert(payload, {
        onConflict: 'visitor_id',
      });

    if (error) {
      console.error('[Heartbeat] ❌ Error sending visitor heartbeat:', error);
      return;
    }

    console.log('[Heartbeat] ✅ Visitor heartbeat sent successfully');
    lastHeartbeatTime = now;
    lastHeartbeatIdentifier = visitorId;
    lastHeartbeatType = 'visitor';
  } catch (err) {
    console.error('[Heartbeat] ❌ Unexpected error in sendVisitorHeartbeat:', err);
  }
};

/**
 * Wrapper unique qui choisit automatiquement entre user et visitor heartbeat
 * Si userId est fourni et valide → sendUserHeartbeat
 * Sinon → sendVisitorHeartbeat
 */
export const trackActivity = async (
  userId: string | null | undefined,
  city?: string | null
): Promise<void> => {
  if (userId && typeof userId === 'string' && userId.trim().length > 0) {
    console.log('[Heartbeat] trackActivity: User is logged in, sending user heartbeat');
    await sendUserHeartbeat(userId, city);
  } else {
    console.log('[Heartbeat] trackActivity: User not logged in, sending visitor heartbeat');
    const visitorId = await getOrCreateVisitorId();
    await sendVisitorHeartbeat(visitorId, city);
  }
};

/**
 * Alias pour compatibilité rétroactive avec le code existant
 * Appelle trackActivity avec le userId fourni (ou null pour les visiteurs)
 */
export const sendHeartbeat = async (
  userId: string | null | undefined,
  city?: string | null
): Promise<void> => {
  await trackActivity(userId, city);
};

export const resetHeartbeatThrottle = (): void => {
  lastHeartbeatTime = 0;
  lastHeartbeatIdentifier = null;
  lastHeartbeatType = null;
  console.log('[Heartbeat] Throttle reset');
};
