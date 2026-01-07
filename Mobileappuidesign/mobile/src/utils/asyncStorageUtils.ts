import AsyncStorage from '@react-native-async-storage/async-storage';

const MAX_STORED_ITEMS = 1000;

/**
 * Sauvegarde un ensemble d'IDs dans AsyncStorage avec nettoyage automatique
 * Garde seulement les 1000 derniers IDs pour éviter de remplir le stockage
 */
export const saveIdsToStorage = async (key: string, ids: Set<string>): Promise<void> => {
  try {
    let idsToSave = ids;
    
    // Limiter à 1000 IDs pour éviter de remplir le stockage
    if (ids.size > MAX_STORED_ITEMS) {
      console.log(`[AsyncStorageUtils] Trimming ${key} from ${ids.size} to ${MAX_STORED_ITEMS}`);
      const idsArray = Array.from(ids);
      // Garder les 1000 derniers IDs
      const trimmedIds = idsArray.slice(-MAX_STORED_ITEMS);
      idsToSave = new Set(trimmedIds);
    }
    
    await AsyncStorage.setItem(key, JSON.stringify(Array.from(idsToSave)));
  } catch (err) {
    console.error(`[AsyncStorageUtils] Error saving IDs to ${key}:`, err);
  }
};

/**
 * Charge un ensemble d'IDs depuis AsyncStorage
 */
export const loadIdsFromStorage = async (key: string): Promise<Set<string>> => {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch (err) {
    console.error(`[AsyncStorageUtils] Error loading IDs from ${key}:`, err);
    return new Set();
  }
};

/**
 * Sauvegarde un tableau d'objets dans AsyncStorage avec nettoyage automatique
 * Garde seulement les 1000 derniers éléments
 */
export const saveArrayToStorage = async (key: string, items: any[]): Promise<void> => {
  try {
    let itemsToSave = items;
    
    // Limiter à 1000 éléments pour éviter de remplir le stockage
    if (items.length > MAX_STORED_ITEMS) {
      console.log(`[AsyncStorageUtils] Trimming array ${key} from ${items.length} to ${MAX_STORED_ITEMS}`);
      // Garder les 1000 derniers éléments
      itemsToSave = items.slice(-MAX_STORED_ITEMS);
    }
    
    await AsyncStorage.setItem(key, JSON.stringify(itemsToSave));
  } catch (err) {
    console.error(`[AsyncStorageUtils] Error saving array to ${key}:`, err);
  }
};

/**
 * Charge un tableau d'objets depuis AsyncStorage
 */
export const loadArrayFromStorage = async (key: string): Promise<any[]> => {
  try {
    const stored = await AsyncStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error(`[AsyncStorageUtils] Error loading array from ${key}:`, err);
    return [];
  }
};

/**
 * Sauvegarde une valeur simple dans AsyncStorage
 */
export const saveValueToStorage = async (key: string, value: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (err) {
    console.error(`[AsyncStorageUtils] Error saving value to ${key}:`, err);
  }
};

/**
 * Charge une valeur simple depuis AsyncStorage
 */
export const loadValueFromStorage = async (key: string): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(key);
  } catch (err) {
    console.error(`[AsyncStorageUtils] Error loading value from ${key}:`, err);
    return null;
  }
};

/**
 * Supprime une clé depuis AsyncStorage
 */
export const removeFromStorage = async (key: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (err) {
    console.error(`[AsyncStorageUtils] Error removing ${key}:`, err);
  }
};

/**
 * Vide complètement AsyncStorage (à utiliser avec prudence)
 */
export const clearAllStorage = async (): Promise<void> => {
  try {
    await AsyncStorage.clear();
    console.log('[AsyncStorageUtils] All AsyncStorage cleared');
  } catch (err) {
    console.error('[AsyncStorageUtils] Error clearing AsyncStorage:', err);
  }
};
