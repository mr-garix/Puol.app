/**
 * DONNÉES MOCK UNIFIÉES ET COHÉRENTES
 * 
 * Toutes les sections du back-office utilisent ces données
 * pour garantir la cohérence totale.
 * 
 * Niveaux : moyens-élevés (plateforme active depuis plusieurs mois)
 */

import { getMockRevenueData, calculateTakeRate, formatCurrency } from './revenueMetrics';

// ============================================
// PÉRIODE DE RÉFÉRENCE : 30 DERNIERS JOURS
// ============================================

// Données de revenus (source centrale)
export const UNIFIED_REVENUE = getMockRevenueData('month');

// ============================================
// UTILISATEURS
// ============================================
export const UNIFIED_USERS = {
  total: 28_450,
  active: 5_847,           // Utilisateurs actifs (30j)
  new: 1_240,              // Nouveaux utilisateurs (30j)
  tenants: 22_100,         // Locataires
  hosts: 6_350,            // Propriétaires
  verified: 24_782,        // Comptes vérifiés
  premium: 892,            // Comptes premium
  activeDaily: 3_200,      // Actifs par jour (moyenne)
  activeWeekly: 16_500,    // Actifs par semaine (moyenne)
  
  // Croissance
  growth: {
    active: 12.5,
    new: 10.0,
    tenants: 9.8,
    hosts: 15.2,
  },
};

// ============================================
// ANNONCES
// ============================================
export const UNIFIED_PROPERTIES = {
  total: 3_120,
  online: 2_567,           // Publiées uniquement
  pending: 145,            // En attente de modération
  draft: 312,              // Brouillons
  archived: 96,            // Archivées
  
  // Par type
  furnished: 2_050,        // 80% des annonces en ligne (meublés)
  unfurnished: 517,        // 20% des annonces en ligne (non-meublés)
  
  // Performance
  avgViews: 2_450,         // Vues moyennes par annonce (30j)
  avgLikes: 142,           // Likes moyens
  avgMessages: 23,         // Messages moyens
  
  // Croissance
  growth: {
    total: 8.2,
    online: 8.2,
    furnished: 7.9,
    unfurnished: 10.3,
  },
};

// ============================================
// RÉSERVATIONS
// ============================================
export const UNIFIED_BOOKINGS = {
  total: 720,              // Réservations confirmées (30j)
  pending: 42,             // En attente de confirmation
  cancelled: 38,           // Annulées
  completed: 682,          // Terminées
  active: 38,              // En cours
  
  // Valeurs
  avgValue: 136_111,       // Prix moyen réservation (net propriétaire)
  totalValue: UNIFIED_REVENUE.gmv.furnished, // Total réservations
  
  // Par durée
  shortTerm: 576,          // 1-7 jours (80%)
  mediumTerm: 108,         // 8-30 jours (15%)
  longTerm: 36,            // 30+ jours (5%)
  
  // Croissance
  growth: {
    total: 14.3,
    value: 18.5,
  },
};

// ============================================
// VISITES
// ============================================
export const UNIFIED_VISITS = {
  total: 1_680,            // Visites programmées (30j)
  pending: 58,             // À confirmer
  confirmed: 1_124,        // Confirmées
  completed: 456,          // Effectuées
  cancelled: 42,           // Annulées
  
  // Valeurs
  fee: 5_000,              // Frais par visite
  totalRevenue: UNIFIED_REVENUE.revenue.visitFees,
  
  // Croissance
  growth: {
    total: 5.4,
    confirmed: 6.2,
  },
};

// ============================================
// CONTRATS NON-MEUBLÉS
// ============================================
export const UNIFIED_CONTRACTS = {
  total: 180,              // Contrats signés (30j)
  avgRent: 85_000,         // Loyer moyen mensuel
  totalCommission: UNIFIED_REVENUE.revenue.unfurnishedCommission,
  
  // Croissance
  growth: {
    total: 22.4,
    commission: 22.4,
  },
};

// ============================================
// AVIS & NOTES
// ============================================
export const UNIFIED_REVIEWS = {
  total: 1_456,            // Avis totaux (30j)
  avgRating: 4.6,          // Note moyenne
  breakdown: {
    5: 892,                // 5 étoiles (61%)
    4: 437,                // 4 étoiles (30%)
    3: 98,                 // 3 étoiles (7%)
    2: 20,                 // 2 étoiles (1%)
    1: 9,                  // 1 étoile (1%)
  },
  
  // Par catégorie
  properties: 982,         // Avis annonces
  hosts: 474,              // Avis propriétaires
  
  // Croissance
  growth: {
    total: 8.5,
    avgRating: 2.1,
  },
};

// ============================================
// MESSAGES & SUPPORT
// ============================================
export const UNIFIED_MESSAGES = {
  total: 12_450,           // Messages totaux (30j)
  avgResponseTime: 24,     // Minutes
  responseRate: 87.5,      // %
  
  // Support tickets
  tickets: {
    total: 342,
    open: 28,
    inProgress: 45,
    resolved: 269,
    avgResolutionTime: 4.2, // Heures
  },
  
  // Croissance
  growth: {
    total: 11.2,
    responseRate: 3.4,
  },
};

// ============================================
// PAIEMENTS
// ============================================
export const UNIFIED_PAYMENTS = {
  // Montants totaux (30j)
  gmvTotal: UNIFIED_REVENUE.gmv.total,
  revenueTotal: UNIFIED_REVENUE.revenue.total,
  takeRate: calculateTakeRate(UNIFIED_REVENUE.revenue.total, UNIFIED_REVENUE.gmv.total),
  
  // Breakdown
  furnished: {
    amount: UNIFIED_REVENUE.gmv.furnished,
    commission: UNIFIED_REVENUE.revenue.furnishedCommission,
    commissionRate: 10, // %
  },
  unfurnished: {
    commission: UNIFIED_REVENUE.revenue.unfurnishedCommission,
    contracts: UNIFIED_CONTRACTS.total,
  },
  visits: {
    revenue: UNIFIED_REVENUE.revenue.visitFees,
    count: UNIFIED_VISITS.total,
    fee: 5_000,
  },
  
  // Statuts
  successful: 1_542,       // Paiements réussis
  pending: 38,             // En attente
  failed: 12,              // Échoués
  
  // Croissance
  growth: {
    gmv: 18.2,
    revenue: 15.8,
  },
};

// ============================================
// GÉOGRAPHIE (CAMEROUN)
// ============================================
export const UNIFIED_CITIES = [
  {
    name: 'Douala',
    country: 'Cameroun',
    properties: 1_027,
    users: 11_380,
    bookings: 289,
    visits: 672,
    gmv: 51_000_000,
    revenue: 9_180_000,
    percentage: 40,
    growth: 22.5,
  },
  {
    name: 'Yaoundé',
    country: 'Cameroun',
    properties: 872,
    users: 9_725,
    bookings: 245,
    visits: 571,
    gmv: 43_500_000,
    revenue: 7_830_000,
    percentage: 34,
    growth: 16.8,
  },
  {
    name: 'Bafoussam',
    country: 'Cameroun',
    properties: 359,
    users: 4_125,
    bookings: 103,
    visits: 235,
    gmv: 18_400_000,
    revenue: 3_312_000,
    percentage: 14,
    growth: 14.2,
  },
  {
    name: 'Bamenda',
    country: 'Cameroun',
    properties: 231,
    users: 2_583,
    bookings: 58,
    visits: 134,
    gmv: 10_300_000,
    revenue: 1_854_000,
    percentage: 8,
    growth: 11.5,
  },
  {
    name: 'Garoua',
    country: 'Cameroun',
    properties: 78,
    users: 637,
    bookings: 25,
    visits: 68,
    gmv: 4_900_000,
    revenue: 882_000,
    percentage: 4,
    growth: 8.9,
  },
];

// ============================================
// CONVERSION & FUNNEL
// ============================================
export const UNIFIED_FUNNEL = {
  // Funnel général (30j)
  visitors: 45_200,
  signups: 1_240,          // Taux: 2.7%
  verified: 1_085,         // Taux: 87.5%
  active: 5_847,           // Utilisateurs actifs
  bookings: 720,           // Taux: 12.3% des actifs
  
  // Funnel locataire
  tenant: {
    search: 22_100,
    viewProperty: 15_470,   // 70%
    contact: 4_641,         // 30% des vues
    book: 720,              // 15.5% des contacts
  },
  
  // Funnel propriétaire
  host: {
    signup: 485,
    createListing: 412,     // 85%
    published: 350,         // 85% des créées
    firstBooking: 189,      // 54% des publiées
  },
  
  // Conversion rates
  conversionRates: {
    visitorToSignup: 2.7,
    signupToVerified: 87.5,
    viewToContact: 30.0,
    contactToBooking: 15.5,
    listingToBooking: 54.0,
  },
};

// ============================================
// ENGAGEMENT
// ============================================
export const UNIFIED_ENGAGEMENT = {
  // Session
  avgSessionDuration: 8.4,   // Minutes
  avgPagesPerSession: 4.2,
  bounceRate: 34.5,          // %
  
  // Interactions
  totalLikes: 18_950,
  totalShares: 3_420,
  totalSaves: 7_680,
  
  // Rétention
  day1: 72.4,                // % retour J+1
  day7: 45.8,                // % retour J+7
  day30: 28.3,               // % retour J+30
  
  // Fréquence
  daily: 15.2,               // % utilisateurs quotidiens
  weekly: 42.7,              // % utilisateurs hebdomadaires
  monthly: 68.9,             // % utilisateurs mensuels
};

// ============================================
// CROISSANCE (COMPARAISON VS PÉRIODE PRÉCÉDENTE)
// ============================================
export const UNIFIED_GROWTH = {
  users: {
    active: { current: UNIFIED_USERS.active, previous: 5_204, change: 12.5 },
    new: { current: UNIFIED_USERS.new, previous: 1_127, change: 10.0 },
  },
  properties: {
    online: { current: UNIFIED_PROPERTIES.online, previous: 2_372, change: 8.2 },
  },
  bookings: {
    total: { current: UNIFIED_BOOKINGS.total, previous: 630, change: 14.3 },
  },
  visits: {
    total: { current: UNIFIED_VISITS.total, previous: 1_594, change: 5.4 },
  },
  revenue: {
    gmv: { current: UNIFIED_PAYMENTS.gmvTotal, previous: Math.round(UNIFIED_PAYMENTS.gmvTotal * 0.85), change: 18.2 },
    puol: { current: UNIFIED_PAYMENTS.revenueTotal, previous: Math.round(UNIFIED_PAYMENTS.revenueTotal * 0.88), change: 15.8 },
  },
};

// ============================================
// TEMPS RÉEL (DERNIÈRES 24H)
// ============================================
export const UNIFIED_REALTIME_24H = {
  activeUsers: 3_200,
  newUsers: 127,
  bookings: 25,
  visits: 60,
  messages: 456,
  
  // Revenus 24h
  gmv: 4_230_000,
  revenue: 761_400,
  
  // Devices
  mobile: 2_880,           // 90%
  desktop: 320,            // 10%
  
  // Croissance vs 24h précédentes
  growth: {
    activeUsers: 8.5,
    gmv: 12.3,
    revenue: 15.7,
  },
};

// ============================================
// HELPERS POUR AFFICHAGE
// ============================================

export function getUnifiedKPIs() {
  return [
    {
      id: 'active-users',
      title: 'Utilisateurs actifs',
      value: UNIFIED_USERS.active.toLocaleString('fr-FR'),
      change: UNIFIED_GROWTH.users.active.change,
      icon: '👤',
      color: 'bg-blue-500',
      route: 'users',
      definition: 'Comptes ayant au moins une action dans les 30 derniers jours',
      currentValue: UNIFIED_USERS.active,
      previousValue: UNIFIED_GROWTH.users.active.previous,
      visible: true,
    },
    {
      id: 'new-users',
      title: 'Nouveaux utilisateurs',
      value: UNIFIED_USERS.new.toLocaleString('fr-FR'),
      change: UNIFIED_GROWTH.users.new.change,
      icon: '👥',
      color: 'bg-green-500',
      route: 'users',
      definition: 'Nouveaux comptes créés dans les 30 derniers jours',
      currentValue: UNIFIED_USERS.new,
      previousValue: UNIFIED_GROWTH.users.new.previous,
      visible: true,
    },
    {
      id: 'properties',
      title: 'Annonces en ligne',
      value: UNIFIED_PROPERTIES.online.toLocaleString('fr-FR'),
      change: UNIFIED_GROWTH.properties.online.change,
      icon: '🏠',
      color: 'bg-[#2ECC71]',
      route: 'properties',
      definition: 'Annonces avec statut "Publiée" uniquement',
      currentValue: UNIFIED_PROPERTIES.online,
      previousValue: UNIFIED_GROWTH.properties.online.previous,
      visible: true,
    },
    {
      id: 'bookings',
      title: 'Réservations meublées',
      value: UNIFIED_BOOKINGS.total.toLocaleString('fr-FR'),
      change: UNIFIED_GROWTH.bookings.total.change,
      icon: '📅',
      color: 'bg-purple-500',
      route: 'reservations',
      definition: 'Réservations confirmées (commission 10%)',
      currentValue: UNIFIED_BOOKINGS.total,
      previousValue: UNIFIED_GROWTH.bookings.total.previous,
      visible: true,
    },
    {
      id: 'gmv',
      title: 'GMV (FCFA)',
      value: formatCurrency(UNIFIED_PAYMENTS.gmvTotal, true),
      change: UNIFIED_GROWTH.revenue.gmv.change,
      icon: '💰',
      color: 'bg-blue-500',
      route: 'analytics',
      definition: 'Valeur économique totale générée par PUOL',
      currentValue: UNIFIED_PAYMENTS.gmvTotal,
      previousValue: UNIFIED_GROWTH.revenue.gmv.previous,
      visible: true,
    },
    {
      id: 'revenue',
      title: 'CA PUOL (FCFA)',
      value: formatCurrency(UNIFIED_PAYMENTS.revenueTotal, true),
      change: UNIFIED_GROWTH.revenue.puol.change,
      icon: '💵',
      color: 'bg-[#2ECC71]',
      route: 'payments',
      definition: 'Ce que PUOL gagne réellement (commissions + frais)',
      currentValue: UNIFIED_PAYMENTS.revenueTotal,
      previousValue: UNIFIED_GROWTH.revenue.puol.previous,
      visible: true,
    },
    {
      id: 'unfurnished',
      title: 'Revenu non meublé (FCFA)',
      value: formatCurrency(UNIFIED_CONTRACTS.totalCommission, true),
      change: UNIFIED_CONTRACTS.growth.total,
      icon: '🏢',
      color: 'bg-orange-500',
      route: 'properties?type=unfurnished',
      definition: 'Commission sur contrats non-meublés (1 mois)',
      currentValue: UNIFIED_CONTRACTS.totalCommission,
      previousValue: Math.round(UNIFIED_CONTRACTS.totalCommission * 0.82),
      visible: true,
    },
    {
      id: 'visits',
      title: 'Visites programmées',
      value: UNIFIED_VISITS.total.toLocaleString('fr-FR'),
      change: UNIFIED_GROWTH.visits.total.change,
      icon: '📍',
      color: 'bg-pink-500',
      route: 'visits',
      definition: 'Visites programmées (frais 5000 FCFA)',
      currentValue: UNIFIED_VISITS.total,
      previousValue: UNIFIED_GROWTH.visits.total.previous,
      visible: true,
    },
    {
      id: 'reviews',
      title: 'Avis',
      value: `${UNIFIED_REVIEWS.avgRating} / 5`,
      change: UNIFIED_REVIEWS.growth.avgRating,
      icon: '⭐',
      color: 'bg-yellow-500',
      route: 'reviews',
      definition: 'Note moyenne des avis utilisateurs',
      currentValue: UNIFIED_REVIEWS.avgRating,
      previousValue: 4.5,
      visible: true,
    },
  ];
}

export function getUnifiedCities() {
  return UNIFIED_CITIES;
}

export function getUnifiedRevenue() {
  return UNIFIED_REVENUE;
}

// Export pour compatibilité
export default {
  USERS: UNIFIED_USERS,
  PROPERTIES: UNIFIED_PROPERTIES,
  BOOKINGS: UNIFIED_BOOKINGS,
  VISITS: UNIFIED_VISITS,
  CONTRACTS: UNIFIED_CONTRACTS,
  REVIEWS: UNIFIED_REVIEWS,
  MESSAGES: UNIFIED_MESSAGES,
  PAYMENTS: UNIFIED_PAYMENTS,
  CITIES: UNIFIED_CITIES,
  FUNNEL: UNIFIED_FUNNEL,
  ENGAGEMENT: UNIFIED_ENGAGEMENT,
  GROWTH: UNIFIED_GROWTH,
  REALTIME_24H: UNIFIED_REALTIME_24H,
};