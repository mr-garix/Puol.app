/**
 * Helper pour gérer la séparation entre GMV et Chiffre d'affaires PUOL
 * Modèle économique PUOL :
 * - Meublés : commission 10% ajoutée au prix (propriétaire reçoit son prix net)
 * - Non-meublés : commission 1 mois de loyer
 * - Visites : 5000 FCFA par visite (100% PUOL)
 */

export interface RevenueBreakdown {
  // GMV (Gross Merchandise Value)
  // = Valeur économique totale générée par PUOL
  gmv: {
    total: number;
    furnished: number;          // Montant réservations meublées (prix propriétaire)
    furnishedCommission: number; // Commission 10% meublés
    unfurnishedCommission: number; // Commission non-meublés (1 mois loyer)
    visitFees: number;           // Frais de visite
  };
  
  // Chiffre d'affaires PUOL (ce que PUOL gagne réellement)
  revenue: {
    total: number;
    furnishedCommission: number; // 10% des réservations meublées
    unfurnishedCommission: number; // 1 mois de loyer pour non-meublés
    visitFees: number;           // 100% des frais de visite (5000 FCFA)
  };
  
  // Métadonnées
  stats: {
    furnishedBookings: number;
    unfurnishedContracts: number;
    visits: number;
    avgFurnishedPrice: number;
    avgUnfurnishedRent: number;
  };
}

/**
 * Calcule le breakdown GMV vs Revenue pour PUOL
 */
export function calculateRevenueBreakdown(
  furnishedBookingsAmount: number,  // Prix net propriétaire (sans commission)
  furnishedBookingsCount: number,
  unfurnishedContracts: number,     // Nombre de contrats non-meublés
  avgUnfurnishedRent: number,       // Loyer moyen mensuel non-meublé
  visitsCount: number,
  visitFee: number = 5000           // 5000 FCFA par visite
): RevenueBreakdown {
  // Commission meublés : 10% ajoutés au prix propriétaire
  const furnishedCommission = furnishedBookingsAmount * 0.10;
  
  // Commission non-meublés : 1 mois de loyer par contrat
  const unfurnishedCommission = unfurnishedContracts * avgUnfurnishedRent;
  
  // Frais de visite : 5000 FCFA × nombre de visites
  const visitFees = visitsCount * visitFee;
  
  // GMV = montant total économique généré par PUOL
  const gmvFurnished = furnishedBookingsAmount; // Prix propriétaire
  const gmvFurnishedCommission = furnishedCommission;
  const gmvUnfurnishedCommission = unfurnishedCommission;
  const gmvVisitFees = visitFees;
  const gmvTotal = gmvFurnished + gmvFurnishedCommission + gmvUnfurnishedCommission + gmvVisitFees;
  
  // Revenue PUOL = ce que PUOL gagne
  const revenueTotal = furnishedCommission + unfurnishedCommission + visitFees;
  
  return {
    gmv: {
      total: gmvTotal,
      furnished: gmvFurnished,
      furnishedCommission: gmvFurnishedCommission,
      unfurnishedCommission: gmvUnfurnishedCommission,
      visitFees: gmvVisitFees,
    },
    revenue: {
      total: revenueTotal,
      furnishedCommission: furnishedCommission,
      unfurnishedCommission: unfurnishedCommission,
      visitFees: visitFees,
    },
    stats: {
      furnishedBookings: furnishedBookingsCount,
      unfurnishedContracts: unfurnishedContracts,
      visits: visitsCount,
      avgFurnishedPrice: furnishedBookingsCount > 0 ? furnishedBookingsAmount / furnishedBookingsCount : 0,
      avgUnfurnishedRent: avgUnfurnishedRent,
    },
  };
}

/**
 * Formatte un montant en FCFA
 */
export function formatCurrency(amount: number, compact: boolean = false): string {
  if (compact && amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    return `${millions.toFixed(1)}M FCFA`;
  }
  
  if (compact && amount >= 1000) {
    const thousands = amount / 1000;
    return `${thousands.toFixed(0)}k FCFA`;
  }
  
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(amount) + ' FCFA';
}

/**
 * Calcule le taux de take rate (% de revenue vs GMV)
 */
export function calculateTakeRate(revenue: number, gmv: number): number {
  if (gmv === 0) return 0;
  return (revenue / gmv) * 100;
}

/**
 * Mock data réalistes pour une plateforme active depuis plusieurs mois
 * Niveaux moyens-élevés cohérents
 */
export function getMockRevenueData(period: 'day' | 'week' | 'month' = 'month'): RevenueBreakdown {
  // Données hebdomadaires (baseline)
  const weeklyData = {
    furnishedBookingsAmount: 24_500_000,  // Prix net propriétaires (180 réservations × ~136k FCFA)
    furnishedBookingsCount: 180,
    unfurnishedContracts: 45,             // 45 contrats non-meublés signés
    avgUnfurnishedRent: 85_000,           // Loyer moyen 85k FCFA/mois
    visitsCount: 420,                     // 420 visites payées
  };
  
  // Données journalières (baseline)
  const dailyData = {
    furnishedBookingsAmount: 3_500_000,   // ~25 réservations/jour
    furnishedBookingsCount: 25,
    unfurnishedContracts: 6,
    avgUnfurnishedRent: 85_000,
    visitsCount: 60,
  };
  
  // Données mensuelles (baseline)
  const monthlyData = {
    furnishedBookingsAmount: 98_000_000,  // ~720 réservations/mois
    furnishedBookingsCount: 720,
    unfurnishedContracts: 180,
    avgUnfurnishedRent: 85_000,
    visitsCount: 1680,
  };
  
  const data = period === 'day' ? dailyData : period === 'week' ? weeklyData : monthlyData;
  
  return calculateRevenueBreakdown(
    data.furnishedBookingsAmount,
    data.furnishedBookingsCount,
    data.unfurnishedContracts,
    data.avgUnfurnishedRent,
    data.visitsCount,
    5000 // 5000 FCFA par visite
  );
}

/**
 * Calcule le prix total payé par le locataire (prix propriétaire + 10% commission)
 */
export function calculateTenantPrice(ownerPrice: number): number {
  return ownerPrice * 1.10; // +10% commission
}

/**
 * Calcule la commission PUOL sur un logement meublé
 */
export function calculateFurnishedCommission(ownerPrice: number): number {
  return ownerPrice * 0.10; // 10%
}

/**
 * Calcule la commission PUOL sur un logement non-meublé (1 mois de loyer)
 */
export function calculateUnfurnishedCommission(monthlyRent: number): number {
  return monthlyRent; // 1 mois de loyer
}

/**
 * Couleurs pour l'affichage
 */
export const REVENUE_COLORS = {
  gmv: {
    primary: '#3B82F6',      // Bleu pour GMV
    light: '#DBEAFE',        // Bleu clair
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-100',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  revenue: {
    primary: '#2ECC71',      // Vert PUOL pour Revenue
    light: '#D1FAE5',        // Vert clair
    bg: 'bg-[#2ECC71]',
    bgLight: 'bg-green-100',
    text: 'text-[#2ECC71]',
    border: 'border-green-200',
  },
  furnished: {
    primary: '#8B5CF6',      // Violet pour meublés
    light: '#EDE9FE',
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-100',
    text: 'text-purple-600',
    border: 'border-purple-200',
  },
  unfurnished: {
    primary: '#F59E0B',      // Orange pour non-meublés
    light: '#FEF3C7',
    bg: 'bg-orange-500',
    bgLight: 'bg-orange-100',
    text: 'text-orange-600',
    border: 'border-orange-200',
  },
};

/**
 * Simule une mise à jour en temps réel du GMV et Revenue
 * Utilisé dans la section Temps Réel
 */
export function simulateRealtimeRevenue(): {
  gmv24h: number;
  revenue24h: number;
  lastEvent: { type: 'visit' | 'furnished' | 'unfurnished'; amount: number; time: string };
} {
  const data24h = getMockRevenueData('day');
  
  // Simule un événement récent
  const eventTypes: ('visit' | 'furnished' | 'unfurnished')[] = ['visit', 'furnished', 'furnished', 'furnished'];
  const randomType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  
  let eventAmount = 0;
  if (randomType === 'visit') {
    eventAmount = 5000;
  } else if (randomType === 'furnished') {
    eventAmount = Math.floor(Math.random() * 80000) + 50000; // 50k-130k
  } else {
    eventAmount = 85000; // 1 mois de loyer
  }
  
  return {
    gmv24h: data24h.gmv.total,
    revenue24h: data24h.revenue.total,
    lastEvent: {
      type: randomType,
      amount: eventAmount,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    },
  };
}
