/**
 * Utilitaires pour normaliser les numéros de téléphone
 * Cohérent avec le projet Expo (phoneCountries.ts)
 */

const DEFAULT_COUNTRY_CODE = '+237';

/**
 * Normalise un numéro de téléphone au format E.164 (+237XXXXXXXXX)
 * Cohérent avec formatE164PhoneNumber du projet Expo
 */
export const normalizePhoneToE164 = (rawPhone: string): string => {
  if (!rawPhone) {
    throw new Error('invalid_phone');
  }

  const trimmed = rawPhone.trim();
  
  // Si commence déjà par +, retourner tel quel
  if (trimmed.startsWith('+')) {
    return trimmed;
  }

  // Extraire seulement les chiffres
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (!digitsOnly) {
    throw new Error('invalid_phone');
  }

  // Si commence par 00, remplacer par +
  if (digitsOnly.startsWith('00')) {
    return `+${digitsOnly.slice(2)}`;
  }

  // Sinon, ajouter le code pays par défaut
  return `${DEFAULT_COUNTRY_CODE}${digitsOnly}`;
};

/**
 * Vérifie si un numéro de téléphone est au format E.164 valide
 */
export const isValidE164Phone = (phone: string): boolean => {
  if (!phone) return false;
  return /^\+\d{1,15}$/.test(phone);
};

/**
 * Extrait le numéro national d'un numéro E.164
 * Ex: +237670844398 -> 670844398
 */
export const extractNationalNumber = (e164Phone: string): string => {
  if (!e164Phone.startsWith('+')) {
    return e164Phone;
  }
  
  // Retirer le + et le code pays (+237)
  if (e164Phone.startsWith('+237')) {
    return e164Phone.slice(4);
  }
  
  // Retirer juste le +
  return e164Phone.slice(1);
};
