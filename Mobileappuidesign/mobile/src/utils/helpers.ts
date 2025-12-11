/**
 * Utilitaires helpers pour l'application PUOL
 */

/**
 * Formate un nombre en devise FCFA
 */
export const formatCurrency = (amount: number | string): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(num)) return '0 FCFA';
  return `${num.toLocaleString('fr-FR')} FCFA`;
};

/**
 * Formate une date en format lisible
 */
export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return 'Date invalide';
  
  return d.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Formate une date relative (il y a 2 heures, etc.)
 */
export const formatRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!d || isNaN(d.getTime())) return 'Date invalide';
  
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
  if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
  if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
  
  return formatDate(d);
};

/**
 * Génère des initiales à partir d'un nom
 */
export const getInitials = (name: string, fallback = 'U'): string => {
  if (!name) return fallback;
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Valide un email
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valide un numéro de téléphone (basique)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8;
};

/**
 * Tronque un texte avec des points de suspension
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
};

/**
 * Génère une couleur de statut
 */
export const getStatusColor = (status: string): { bg: string; text: string; border: string } => {
  switch (status.toLowerCase()) {
    case 'confirmed':
    case 'verified':
    case 'approved':
      return {
        bg: 'rgba(46, 204, 113, 0.12)',
        text: '#15803D',
        border: '#34D399',
      };
    case 'pending':
    case 'waiting':
      return {
        bg: '#FEF3C7',
        text: '#92400E',
        border: '#FACC15',
      };
    case 'cancelled':
    case 'rejected':
    case 'error':
      return {
        bg: '#FEE2E2',
        text: '#B91C1C',
        border: '#FCA5A5',
      };
    default:
      return {
        bg: '#F3F4F6',
        text: '#374151',
        border: '#E5E7EB',
      };
  }
};

/**
 * Crée un ID unique
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Retarde l'exécution (utilitaire pour async/await)
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Génère l'URL de partage canonique pour une annonce
 */
export const buildListingShareUrl = (listingId: string): string => {
  if (!listingId) {
    return 'https://puol.app';
  }
  return `https://puol.app/l/${listingId}`;
};

export const buildProfileShareUrl = (profileId: string): string => {
  if (!profileId) {
    return 'https://puol.app';
  }
  return `https://puol.app/profile/${profileId}`;
};
