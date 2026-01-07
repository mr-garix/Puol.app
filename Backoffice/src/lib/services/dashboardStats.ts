import type { PostgrestFilterBuilder } from '@supabase/postgrest-js';
import type { SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '../supabaseClient';
import type { Database } from '../../types/supabase.generated';
// Nombre d'annonces à afficher dans les widgets "Top annonces"
const DEFAULT_TOP_LIMIT = 5;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

export type DateRangeInput = {
  startDate: Date;
  endDate: Date;
};

export type DashboardUserStats = {
  totalUsers: number;
  activeUsers30d: number;
  newUsers30d: number;
};

export type DashboardVisitorStats = {
  totalVisitors: number;
  authenticatedVisitors: number;
  anonymousVisitors: number;
};

export type DailySummaryStat = {
  key: 'visitors' | 'signups' | 'bookings' | 'visits';
  label: string;
  value: number;
  previousValue: number;
};

export type KPIItem = {
  id: string;
  title: string;
  value: string;
  icon: string;
  color: string;
  route: string;
  definition: string;
  currentValue: number;
  previousValue: number;
  visible: boolean;
  secondaryValue?: string;
  secondaryLabel?: string;
};

export type TopProperty = {
  id: string;
  title: string;
  city: string;
  stat: number;
  statLabel: string;
  image: string;
  priceLabel: string;
  isFurnished: boolean;
};

export type TopPropertiesData = {
  furnished: {
    viewed: TopProperty[];
    booked: TopProperty[];
  };
  unfurnished: {
    viewed: TopProperty[];
    visited: TopProperty[];
  };
};

const EMPTY_TOP_PROPERTIES: TopPropertiesData = {
  furnished: {
    viewed: [],
    booked: [],
  },
  unfurnished: {
    viewed: [],
    visited: [],
  },
};
type ListingViewRow = Database['public']['Tables']['listing_views']['Row'];
type ListingViewProfileRow = Pick<ListingViewRow, 'profile_id'>;

export type DashboardOverview = {
  userStats: DashboardUserStats;
  visitorStats: DashboardVisitorStats;
  dailySummary: DailySummaryStat[];
  kpis: KPIItem[];
  topProperties: TopPropertiesData;
  propertyStats: PropertyStatusStats;
};

export type PropertyStatusStats = {
  total: number;
  online: number;
  paused: number;
  draft: number;
};

type KPIResult = {
  items: KPIItem[];
  propertyStats: PropertyStatusStats;
};

const FALLBACK_SUMMARY: DailySummaryStat[] = [
  { key: 'visitors', label: 'Visiteurs', value: 0, previousValue: 0 },
  { key: 'signups', label: 'Inscriptions', value: 0, previousValue: 0 },
  { key: 'bookings', label: 'Réservations', value: 0, previousValue: 0 },
  { key: 'visits', label: 'Visites du jour', value: 0, previousValue: 0 },
];

type CountQuery = PostgrestFilterBuilder<any, any, any, any, any, any, 'GET'>;

async function countRows(query: CountQuery, fallback = 0) {
  try {
    const { count, error } = await query;
    if (error) {
      console.warn('[dashboardStats] countRows error', error);
      return fallback;
    }
    return count ?? fallback;
  } catch (error) {
    console.warn('[dashboardStats] countRows unexpected error', error);
    return fallback;
  }
}

function toISO(date: Date) {
  return date.toISOString();
}

function shiftDate(date: Date, days: number) {
  return new Date(date.getTime() + days * MS_IN_DAY);
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addOneDay(date: Date) {
  return shiftDate(date, 1);
}

function clampRangeEnd(start: Date, end: Date) {
  if (end.getTime() < start.getTime()) {
    return start;
  }
  return end;
}

function computeRangeDurationDays(range: DateRangeInput) {
  const durationMs = Math.max(0, clampRangeEnd(range.startDate, range.endDate).getTime() - range.startDate.getTime());
  return Math.max(1, Math.ceil(durationMs / MS_IN_DAY));
}

function buildPreviousRange(range: DateRangeInput): DateRangeInput {
  const duration = computeRangeDurationDays(range);
  const prevEnd = shiftDate(range.startDate, -1);
  const prevStart = shiftDate(prevEnd, -duration + 1);
  return { startDate: prevStart, endDate: prevEnd };
}

async function fetchUserStats(): Promise<DashboardUserStats> {
  if (!supabase) {
    return { totalUsers: 0, activeUsers30d: 0, newUsers30d: 0 };
  }
  const client = supabase;
  const now = new Date();
  const since = shiftDate(now, -30);
  const sinceIso = toISO(since);

  const [totalUsers, activeUsers30d, newUsers30d] = await Promise.all([
    countRows(client.from('profiles').select('id', { count: 'exact', head: true })),
    countRows(
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('updated_at', sinceIso),
    ),
    countRows(
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', sinceIso),
    ),
  ]);

  return {
    totalUsers,
    activeUsers30d,
    newUsers30d,
  };
}

async function fetchVisitorStats(dateRange: DateRangeInput): Promise<DashboardVisitorStats> {
  if (!supabase) {
    return { totalVisitors: 0, authenticatedVisitors: 0, anonymousVisitors: 0 };
  }
  const client = supabase;
  const normalizedEnd = clampRangeEnd(dateRange.startDate, dateRange.endDate);
  const startIso = toISO(dateRange.startDate);
  const endIso = toISO(addOneDay(normalizedEnd));

  const [authenticatedVisitors, anonymousVisitors] = await Promise.all([
    // Authentifiés : listing_views avec profile_id (inchangé)
    countDistinctListingViewProfiles(client, startIso, endIso),
    // Anonymes : visitor_activity_heartbeat sans linked_user_id
    countRows(
      (client as any)
        .from('visitor_activity_heartbeat')
        .select('visitor_id', { count: 'exact', head: true })
        .gte('last_activity_at', startIso)
        .lt('last_activity_at', endIso)
        .is('linked_user_id', null),
    ),
  ]);

  return {
    totalVisitors: authenticatedVisitors + anonymousVisitors,
    authenticatedVisitors,
    anonymousVisitors,
  };
}

async function countDistinctListingViewProfiles(
  client: typeof supabase,
  startIso: string,
  endIso: string,
): Promise<number> {
  if (!client) {
    return 0;
  }

  const uniqueProfiles = new Set<string>();
  const PAGE_SIZE = 1000;
  let page = 0;
  let totalFetched = 0;

  try {
    while (true) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await client
        .from('listing_views')
        .select('profile_id')
        .not('profile_id', 'is', null)
        .gte('viewed_at', startIso)
        .lt('viewed_at', endIso)
        .order('viewed_at', { ascending: true })
        .range(from, to);

      if (error) {
        console.warn('[dashboardStats] countDistinctListingViewProfiles error', error, { page });
        break;
      }

      const rows = data ?? [];
      totalFetched += rows.length;
      rows
        .map((row: ListingViewProfileRow) => row.profile_id)
        .filter((id): id is string => Boolean(id))
        .forEach((id) => uniqueProfiles.add(id));

      if (rows.length < PAGE_SIZE) {
        break;
      }

      page += 1;
    }
  } catch (error) {
    console.warn('[dashboardStats] countDistinctListingViewProfiles unexpected error', error);
  }

  console.log('[dashboardStats] Auth visitors debug', {
    startIso,
    endIso,
    rowsFetched: totalFetched,
    uniqueProfiles: uniqueProfiles.size,
    sampleProfiles: Array.from(uniqueProfiles).slice(0, 10),
  });

  return uniqueProfiles.size;
}

async function fetchDailySummary(): Promise<DailySummaryStat[]> {
  if (!supabase) {
    return FALLBACK_SUMMARY;
  }
  const client = supabase;
  const today = startOfDay(new Date());
  const yesterday = shiftDate(today, -1);
  const tomorrow = addOneDay(today);

  const [visitorsToday, visitorsYesterday] = await Promise.all([
    countDailyVisitors(client, today, tomorrow),
    countDailyVisitors(client, yesterday, today),
  ]);

  const [signupsToday, signupsYesterday] = await Promise.all([
    countRows(
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', toISO(today))
        .lt('created_at', toISO(tomorrow)),
    ),
    countRows(
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', toISO(yesterday))
        .lt('created_at', toISO(today)),
    ),
  ]);

  const [bookingsToday, bookingsYesterday] = await Promise.all([
    countRows(
      client
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', toISO(today))
        .lt('created_at', toISO(tomorrow)),
    ),
    countRows(
      client
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', toISO(yesterday))
        .lt('created_at', toISO(today)),
    ),
  ]);

  const [visitsToday, visitsYesterday] = await Promise.all([
    countRows(
      client
        .from('rental_visits')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', toISO(today))
        .lt('created_at', toISO(tomorrow)),
    ),
    countRows(
      client
        .from('rental_visits')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', toISO(yesterday))
        .lt('created_at', toISO(today)),
    ),
  ]);
  
  console.log('[dashboardStats] Daily summary visits', {
    today: toISO(today),
    tomorrow: toISO(tomorrow),
    yesterday: toISO(yesterday),
    visitsToday,
    visitsYesterday,
  });

  return [
    {
      key: 'visitors',
      label: 'Visiteurs',
      value: visitorsToday,
      previousValue: visitorsYesterday,
    },
    {
      key: 'signups',
      label: 'Inscriptions',
      value: signupsToday,
      previousValue: signupsYesterday,
    },
    {
      key: 'bookings',
      label: 'Réservations',
      value: bookingsToday,
      previousValue: bookingsYesterday,
    },
    {
      key: 'visits',
      label: 'Visites du jour',
      value: visitsToday,
      previousValue: visitsYesterday,
    },
  ];
}

async function countDailyVisitors(client: typeof supabase, startDate: Date, endDate: Date) {
  if (!client) {
    return 0;
  }
  const startIso = toISO(startDate);
  const endIso = toISO(endDate);
  const [authenticated, anonymous] = await Promise.all([
    // Authentifiés : listing_views avec profile_id (inchangé)
    countDistinctListingViewProfiles(client, startIso, endIso),
    // Anonymes : visitor_activity_heartbeat sans linked_user_id
    countRows(
      (client as any)
        .from('visitor_activity_heartbeat')
        .select('visitor_id', { count: 'exact', head: true })
        .gte('last_activity_at', startIso)
        .lt('last_activity_at', endIso)
        .is('linked_user_id', null),
    ),
  ]);
  return authenticated + anonymous;
}

async function fetchRefundsTotals(startIso: string, endIso: string): Promise<{ total: number; count: number; byStatus: Record<string, number> }> {
  if (!supabase) {
    console.warn('[dashboardStats] fetchRefundsTotals skipped: supabase client absent');
    return { total: 0, count: 0, byStatus: {} };
  }

  try {
    const { data: refundsData, error: refundsError } = await (supabase as any)
      .from('refunds')
      .select('refund_amount, status')
      .gte('requested_at', startIso)
      .lt('requested_at', endIso);

    if (refundsError) {
      console.warn('[dashboardStats] fetchRefundsTotals error', refundsError);
      return { total: 0, count: 0, byStatus: {} };
    }

    const refundsRows = (refundsData ?? []) as { refund_amount?: number | null; status?: string | null }[];
    const total = refundsRows.reduce((acc, row) => acc + (row.refund_amount ?? 0), 0);
    const count = refundsRows.length;

    // Compter par statut
    const byStatus: Record<string, number> = {};
    refundsRows.forEach((row) => {
      const status = row.status ?? 'unknown';
      byStatus[status] = (byStatus[status] ?? 0) + 1;
    });

    console.log('[dashboardStats] fetchRefundsTotals breakdown', {
      startIso,
      endIso,
      total,
      count,
      byStatus,
    });

    return { total, count, byStatus };
  } catch (error) {
    console.warn('[dashboardStats] fetchRefundsTotals unexpected error', error);
    return { total: 0, count: 0, byStatus: {} };
  }
}

async function fetchPaymentTotals(startIso: string, endIso: string): Promise<{ gmv: number; revenue: number; refundsTotal: number }> {
  if (!supabase) {
    console.warn('[dashboardStats] fetchPaymentTotals skipped: supabase client absent');
    return { gmv: 0, revenue: 0, refundsTotal: 0 };
  }

  try {
    const [paymentsRes, visitPaymentsRes, earningsRes, refundsRes] = await Promise.all([
      supabase
        .from('payments')
        .select('amount')
        .gte('created_at', startIso)
        .lt('created_at', endIso),
      supabase
        .from('payments')
        .select('amount')
        .eq('purpose', 'visit')
        .gte('created_at', startIso)
        .lt('created_at', endIso),
      supabase
        .from('host_earnings')
        .select('platform_fee')
        .gte('created_at', startIso)
        .lt('created_at', endIso),
      fetchRefundsTotals(startIso, endIso),
    ]);

    if (paymentsRes.error) {
      console.warn('[dashboardStats] fetchPaymentTotals payments error', paymentsRes.error);
    }
    if (visitPaymentsRes.error) {
      console.warn('[dashboardStats] fetchPaymentTotals visit payments error', visitPaymentsRes.error);
    }
    if (earningsRes.error) {
      console.warn('[dashboardStats] fetchPaymentTotals host_earnings error', earningsRes.error);
    }

    const paymentsRows = (paymentsRes.data ?? []) as { amount?: number | null }[];
    const visitPaymentsRows = (visitPaymentsRes.data ?? []) as { amount?: number | null }[];
    const earningsRows = (earningsRes.data ?? []) as { platform_fee?: number | null }[];

    // GMV brut = somme de tous les amounts (réservations + visites)
    const gmvBrut = paymentsRows.reduce((acc, row) => acc + (row.amount ?? 0), 0);

    // CA brut = platform_fee (réservations) + amounts des visites
    const reservationRevenue = earningsRows.reduce((acc, row) => acc + (row.platform_fee ?? 0), 0);
    const visitRevenue = visitPaymentsRows.reduce((acc, row) => acc + (row.amount ?? 0), 0);
    const revenueBrut = reservationRevenue + visitRevenue;

    // Déduction des remboursements
    const refundsTotal = refundsRes.total;
    const commissionRemboursee = refundsTotal * 0.10; // 10% de commission sur chaque remboursement

    // GMV net = GMV brut - remboursements
    const gmv = gmvBrut - refundsTotal;

    // CA net = (CA_meublé - commission_remboursée) + CA_non_meublé + CA_visites
    // Ici on soustrait la commission remboursée du revenue total
    const revenue = revenueBrut - commissionRemboursee;

    console.log('[dashboardStats] fetchPaymentTotals breakdown', {
      startIso,
      endIso,
      gmvBrut,
      refundsTotal,
      gmv,
      reservationRevenue,
      commissionRemboursee,
      visitRevenue,
      revenueBrut,
      revenue,
    });

    return { gmv, revenue, refundsTotal };
  } catch (error) {
    console.warn('[dashboardStats] fetchPaymentTotals unexpected error', error);
    return { gmv: 0, revenue: 0, refundsTotal: 0 };
  }
}

async function fetchRentalLeasesMetrics(dateRange: DateRangeInput): Promise<{
  gmvCurrent: number;
  gmvPrevious: number;
  platformFeeCurrent: number;
  platformFeePrevious: number;
  unfurnishedRevenueCurrent: number;
  unfurnishedRevenuePrevious: number;
}> {
  if (!supabase) {
    return {
      gmvCurrent: 0,
      gmvPrevious: 0,
      platformFeeCurrent: 0,
      platformFeePrevious: 0,
      unfurnishedRevenueCurrent: 0,
      unfurnishedRevenuePrevious: 0,
    };
  }

  try {
    const normalizedEnd = clampRangeEnd(dateRange.startDate, dateRange.endDate);
    const previousRange = buildPreviousRange({ startDate: dateRange.startDate, endDate: normalizedEnd });

    const periodStart = toISO(dateRange.startDate);
    const periodEnd = toISO(addOneDay(normalizedEnd));
    const prevStart = toISO(previousRange.startDate);
    const prevEnd = toISO(addOneDay(previousRange.endDate));

    // Fetch current period
    const { data: currentLeases, error: currentError } = await supabase
      .from('rental_leases')
      .select('total_rent, platform_fee_total')
      .gte('created_at', periodStart)
      .lt('created_at', periodEnd);

    // Fetch previous period
    const { data: previousLeases, error: previousError } = await supabase
      .from('rental_leases')
      .select('total_rent, platform_fee_total')
      .gte('created_at', prevStart)
      .lt('created_at', prevEnd);

    if (currentError || previousError) {
      console.warn('[fetchRentalLeasesMetrics] Error fetching rental leases', currentError || previousError);
      return {
        gmvCurrent: 0,
        gmvPrevious: 0,
        platformFeeCurrent: 0,
        platformFeePrevious: 0,
        unfurnishedRevenueCurrent: 0,
        unfurnishedRevenuePrevious: 0,
      };
    }

    const gmvCurrent = (currentLeases ?? []).reduce((sum, lease: any) => sum + (lease.total_rent || 0), 0);
    const gmvPrevious = (previousLeases ?? []).reduce((sum, lease: any) => sum + (lease.total_rent || 0), 0);
    const platformFeeCurrent = (currentLeases ?? []).reduce((sum, lease: any) => sum + (lease.platform_fee_total || 0), 0);
    const platformFeePrevious = (previousLeases ?? []).reduce((sum, lease: any) => sum + (lease.platform_fee_total || 0), 0);

    return {
      gmvCurrent,
      gmvPrevious,
      platformFeeCurrent,
      platformFeePrevious,
      unfurnishedRevenueCurrent: platformFeeCurrent,
      unfurnishedRevenuePrevious: platformFeePrevious,
    };
  } catch (error) {
    console.error('[fetchRentalLeasesMetrics] Exception', error);
    return {
      gmvCurrent: 0,
      gmvPrevious: 0,
      platformFeeCurrent: 0,
      platformFeePrevious: 0,
      unfurnishedRevenueCurrent: 0,
      unfurnishedRevenuePrevious: 0,
    };
  }
}

async function fetchKpiData(dateRange: DateRangeInput): Promise<KPIResult> {
  if (!supabase) {
    return {
      items: [],
      propertyStats: { total: 0, online: 0, paused: 0, draft: 0 },
    };
  }
  const client = supabase;
  const normalizedEnd = clampRangeEnd(dateRange.startDate, dateRange.endDate);
  const previousRange = buildPreviousRange({ startDate: dateRange.startDate, endDate: normalizedEnd });

  const periodStart = toISO(dateRange.startDate);
  const periodEnd = toISO(addOneDay(normalizedEnd));
  const prevStart = toISO(previousRange.startDate);
  const prevEnd = toISO(addOneDay(previousRange.endDate));

  const [
    activeCurrent,
    activePrevious,
    newCurrent,
    newPrevious,
    totalListings,
    listingsOnline,
    listingsPaused,
    listingsDraft,
    bookingsCurrent,
    bookingsPrevious,
    paymentsCurrent,
    paymentsPrevious,
    visitsCurrent,
    visitsPrevious,
    reviewsCurrent,
    reviewsPrevious,
    likesCurrent,
    likesPrevious,
    viewsCurrent,
    viewsPrevious,
    rentalLeasesMetrics,
  ] = await Promise.all([
    countDistinctListingViewProfiles(client, periodStart, periodEnd),
    countDistinctListingViewProfiles(client, prevStart, prevEnd),
    countRows(
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', periodStart)
        .lt('created_at', periodEnd),
    ),
    countRows(
      client
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevStart)
        .lt('created_at', prevEnd),
    ),
    countRows(
      client
        .from('listings')
        .select('id', { count: 'exact', head: true }),
    ),
    countRows(
      client
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'published'),
    ),
    countRows(
      client
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'paused'),
    ),
    countRows(
      client
        .from('listings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'draft'),
    ),
    countRows(
      client
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', periodStart)
        .lt('created_at', periodEnd),
    ),
    countRows(
      client
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevStart)
        .lt('created_at', prevEnd),
    ),
    fetchPaymentTotals(periodStart, periodEnd),
    fetchPaymentTotals(prevStart, prevEnd),
    countRows(
      supabase
        .from('rental_visits')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', periodStart)
        .lt('created_at', periodEnd),
    ),
    countRows(
      supabase
        .from('rental_visits')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevStart)
        .lt('created_at', prevEnd),
    ),
    countRows(
      supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', periodStart)
        .lt('created_at', periodEnd),
    ),
    countRows(
      supabase
        .from('reviews')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevStart)
        .lt('created_at', prevEnd),
    ),
    countRows(
      client
        .from('listing_likes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', periodStart)
        .lt('created_at', periodEnd),
    ),
    countRows(
      client
        .from('listing_likes')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', prevStart)
        .lt('created_at', prevEnd),
    ),
    countRows(
      client
        .from('listing_views')
        .select('id', { count: 'exact', head: true })
        .gte('viewed_at', periodStart)
        .lt('viewed_at', periodEnd),
    ),
    countRows(
      client
        .from('listing_views')
        .select('id', { count: 'exact', head: true })
        .gte('viewed_at', prevStart)
        .lt('viewed_at', prevEnd),
    ),
    fetchRentalLeasesMetrics(dateRange),
  ]);

  const averageReviewRating = await fetchAverageReviewRating();
  const averageReviewLabel =
    typeof averageReviewRating === 'number'
      ? `${averageReviewRating.toFixed(2)} / 5`
      : undefined;

  const propertyStats: PropertyStatusStats = {
    total: totalListings,
    online: listingsOnline,
    paused: listingsPaused,
    draft: listingsDraft,
  };

  return {
    items: [
      {
        id: 'active-users',
        title: 'Utilisateurs actifs',
        value: activeCurrent.toLocaleString('fr-FR'),
        icon: '👤',
        color: 'bg-blue-500',
        route: 'users',
        definition: 'Profils ayant interagi avec la plateforme sur la période',
        currentValue: activeCurrent,
        previousValue: activePrevious,
        visible: true,
      },
      {
        id: 'new-users',
        title: 'Nouveaux utilisateurs',
        value: newCurrent.toLocaleString('fr-FR'),
        icon: '👥',
        color: 'bg-green-500',
        route: 'users',
        definition: 'Profils créés sur la période',
        currentValue: newCurrent,
        previousValue: newPrevious,
        visible: true,
      },
      {
        id: 'properties',
        title: 'Annonces en ligne',
        value: listingsOnline.toLocaleString('fr-FR'),
        icon: '🏠',
        color: 'bg-[#2ECC71]',
        route: 'properties',
        definition: 'Annonces avec statut publié',
        currentValue: listingsOnline,
        previousValue: listingsOnline,
        visible: true,
      },
      {
        id: 'properties-draft',
        title: 'Annonces en brouillon',
        value: listingsDraft.toLocaleString('fr-FR'),
        icon: '📝',
        color: 'bg-amber-400',
        route: 'properties?status=draft',
        definition: 'Annonces sauvegardées en brouillon',
        currentValue: listingsDraft,
        previousValue: listingsDraft,
        visible: true,
      },
      {
        id: 'bookings',
        title: 'Réservations',
        value: bookingsCurrent.toLocaleString('fr-FR'),
        icon: '📅',
        color: 'bg-purple-500',
        route: 'reservations',
        definition: 'Réservations confirmées',
        currentValue: bookingsCurrent,
        previousValue: bookingsPrevious,
        visible: true,
      },
      {
        id: 'visits',
        title: 'Visites programmées',
        value: visitsCurrent.toLocaleString('fr-FR'),
        icon: '📍',
        color: 'bg-pink-500',
        route: 'visits',
        definition: 'Visites planifiées sur la période',
        currentValue: visitsCurrent,
        previousValue: visitsPrevious,
        visible: true,
      },
      {
        id: 'gmv',
        title: 'GMV (FCFA)',
        value: (paymentsCurrent.gmv + rentalLeasesMetrics.gmvCurrent).toLocaleString('fr-FR'),
        icon: '💰',
        color: 'bg-blue-500',
        route: 'analytics',
        definition: 'Volume brut (réservations meublées + baux non-meublés)',
        currentValue: paymentsCurrent.gmv + rentalLeasesMetrics.gmvCurrent,
        previousValue: paymentsPrevious.gmv + rentalLeasesMetrics.gmvPrevious,
        visible: true,
      },
      {
        id: 'revenue',
        title: 'CA PUOL (FCFA)',
        value: (paymentsCurrent.revenue + rentalLeasesMetrics.platformFeeCurrent).toLocaleString('fr-FR'),
        icon: '💵',
        color: 'bg-[#2ECC71]',
        route: 'payments',
        definition: 'Revenus plateforme (meublés + non-meublés)',
        currentValue: paymentsCurrent.revenue + rentalLeasesMetrics.platformFeeCurrent,
        previousValue: paymentsPrevious.revenue + rentalLeasesMetrics.platformFeePrevious,
        visible: true,
      },
      {
        id: 'unfurnished-revenue',
        title: 'Revenu non meublé (FCFA)',
        value: rentalLeasesMetrics.unfurnishedRevenueCurrent.toLocaleString('fr-FR'),
        icon: '🏢',
        color: 'bg-orange-500',
        route: 'landlords',
        definition: 'Revenus non-meublés (somme des platform_fee_total de rental_leases)',
        currentValue: rentalLeasesMetrics.unfurnishedRevenueCurrent,
        previousValue: rentalLeasesMetrics.unfurnishedRevenuePrevious,
        visible: true,
      },
      {
        id: 'reviews',
        title: 'Avis reçus',
        value: reviewsCurrent.toLocaleString('fr-FR'),
        icon: '⭐',
        color: 'bg-yellow-500',
        route: 'reviews',
        definition: 'Avis ajoutés par les utilisateurs',
        currentValue: reviewsCurrent,
        previousValue: reviewsPrevious,
        visible: true,
        secondaryLabel: 'Note moyenne globale',
        secondaryValue: averageReviewLabel,
      },
      {
        id: 'likes',
        title: 'Nombre de likes',
        value: likesCurrent.toLocaleString('fr-FR'),
        icon: '❤️',
        color: 'bg-rose-500',
        route: 'engagement?metric=likes',
        definition: 'Likes cumulés sur la période sélectionnée',
        currentValue: likesCurrent,
        previousValue: likesPrevious,
        visible: true,
      },
      {
        id: 'views',
        title: 'Nombre de vues',
        value: viewsCurrent.toLocaleString('fr-FR'),
        icon: '👁️',
        color: 'bg-indigo-500',
        route: 'analytics?metric=views',
        definition: 'Vues cumulées sur la période sélectionnée',
        currentValue: viewsCurrent,
        previousValue: viewsPrevious,
        visible: true,
      },
    ],
    propertyStats,
  };
}

type MetricType = 'views' | 'bookings' | 'visits';

const METRIC_CONFIG: Record<
  MetricType,
  {
    table: 'listing_views' | 'bookings' | 'rental_visits';
    idColumn: 'listing_id' | 'rental_listing_id';
    dateColumn: 'viewed_at' | 'created_at';
    statLabel: string;
  }
> = {
  views: { table: 'listing_views', idColumn: 'listing_id', dateColumn: 'viewed_at', statLabel: 'vues' },
  bookings: { table: 'bookings', idColumn: 'listing_id', dateColumn: 'created_at', statLabel: 'réservations' },
  visits: { table: 'rental_visits', idColumn: 'rental_listing_id', dateColumn: 'created_at', statLabel: 'visites' },
};

async function fetchTopProperties(dateRange: DateRangeInput): Promise<TopPropertiesData> {
  const normalizedEnd = clampRangeEnd(dateRange.startDate, dateRange.endDate);
  const rangeStart = startOfDay(dateRange.startDate);
  const rangeEnd = addOneDay(startOfDay(normalizedEnd));
  const startIso = toISO(rangeStart);
  const endIso = toISO(rangeEnd);

  const client = supabase;
  if (!client) {
    console.warn('[dashboardStats] fetchTopProperties skipped: supabase client absent');
    return EMPTY_TOP_PROPERTIES;
  }

  const [viewCounts, bookingCounts, visitCounts] = await Promise.all([
    aggregateListingCounts(client, METRIC_CONFIG.views, startIso, endIso),
    aggregateListingCounts(client, METRIC_CONFIG.bookings, startIso, endIso),
    aggregateListingCounts(client, METRIC_CONFIG.visits, startIso, endIso),
  ]);

  console.log('[dashboardStats] Top properties counts', {
    startIso,
    endIso,
    viewEntries: Object.keys(viewCounts).length,
    bookingEntries: Object.keys(bookingCounts).length,
    visitEntries: Object.keys(visitCounts).length,
    bookingSamples: Object.entries(bookingCounts)
      .slice(0, 5)
      .map(([listingId, stat]) => ({ listingId, stat })),
    visitSamples: Object.entries(visitCounts)
      .slice(0, 5)
      .map(([listingId, stat]) => ({ listingId, stat })),
  });

  const uniqueListingIds = Array.from(
    new Set([...Object.keys(viewCounts), ...Object.keys(bookingCounts), ...Object.keys(visitCounts)].filter(Boolean)),
  );

  const listingsDetails = uniqueListingIds.length ? await fetchListingsDetails(uniqueListingIds) : [];

  const resolveListing = (id?: string | null) => listingsDetails.find(listing => listing.id === id) ?? null;
  const formatProperty = (listing: ListingDetailsRow, stat: number, statLabel: string): TopProperty => ({
    id: listing.id,
    title: listing.title ?? 'Annonce PUOL',
    city: listing.city ?? 'Ville inconnue',
    stat,
    statLabel,
    image: listing.cover_photo_url ?? FALLBACK_IMAGE_URL,
    priceLabel: buildPriceLabel(listing),
    isFurnished: Boolean(listing.is_furnished),
  });

  const buildTopList = (
    counts: Record<string, number>,
    predicate: (listing: ListingDetailsRow) => boolean = () => true,
    statLabel: string,
  ): TopProperty[] => {
    if (!counts || !Object.keys(counts).length) {
      return [];
    }
    const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const result: TopProperty[] = [];
    for (const [id, stat] of sortedEntries) {
      const listing = resolveListing(id);
      if (!listing) {
        console.warn('[dashboardStats] buildTopList - listing introuvable', { statLabel, id, stat });
        continue;
      }
      if (!predicate(listing)) {
        continue;
      }
      result.push(formatProperty(listing, stat, statLabel));
      if (result.length >= DEFAULT_TOP_LIMIT) {
        break;
      }
    }
    return result;
  };

  const isFurnishedListing = (listing: ListingDetailsRow) => Boolean(listing.is_furnished);
  const isUnfurnishedListing = (listing: ListingDetailsRow) => !listing.is_furnished;

  return {
    furnished: {
      viewed: buildTopList(viewCounts, isFurnishedListing, METRIC_CONFIG.views.statLabel),
      booked: buildTopList(bookingCounts, () => true, METRIC_CONFIG.bookings.statLabel),
    },
    unfurnished: {
      viewed: buildTopList(viewCounts, isUnfurnishedListing, METRIC_CONFIG.views.statLabel),
      visited: buildTopList(visitCounts, isUnfurnishedListing, METRIC_CONFIG.visits.statLabel),
    },
  };
}

const FALLBACK_IMAGE_URL =
  'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80';

type AggregateConfig = {
  table: 'listing_views' | 'bookings' | 'rental_visits';
  idColumn: 'listing_id' | 'rental_listing_id';
  dateColumn: 'viewed_at' | 'created_at';
};

async function aggregateListingCounts(
  client: SupabaseClient<Database>,
  config: AggregateConfig,
  startIso: string,
  endIso: string,
): Promise<Record<string, number>> {
  const { table, idColumn, dateColumn } = config;
  const PAGE_SIZE = 1000;
  const counts: Record<string, number> = {};
  let page = 0;
  let totalRows = 0;

  while (true) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const query = client
      .from(table)
      .select(`${idColumn}`)
      .gte(dateColumn, startIso)
      .lt(dateColumn, endIso)
      .order(dateColumn, { ascending: true });

    const { data, error } = await query.range(from, to);

    if (error) {
      console.warn('[dashboardStats] aggregateListingCounts error', { table, page, error });
      break;
    }

    const rows = data ?? [];
    totalRows += rows.length;
    rows.forEach((row: Record<string, any>) => {
      const id = row[idColumn];
      if (typeof id !== 'string') {
        return;
      }
      counts[id] = (counts[id] ?? 0) + 1;
    });

    if (rows.length < PAGE_SIZE) {
      break;
    }

    page += 1;
  }

  if (table === 'bookings' || table === 'rental_visits') {
    console.log('[dashboardStats] aggregateListingCounts summary', {
      table,
      startIso,
      endIso,
      uniqueListings: Object.keys(counts).length,
      totalRows,
    });
  }

  return counts;
}

type ListingDetailsRow = Pick<
  Database['public']['Tables']['listings']['Row'],
  'id' | 'title' | 'city' | 'price_per_month' | 'price_per_night' | 'cover_photo_url' | 'is_furnished'
>;

async function fetchListingsDetails(ids: string[]): Promise<ListingDetailsRow[]> {
  try {
    if (!supabase) {
      console.warn('[dashboardStats] fetchListingsDetails skipped: supabase client absent');
      return [];
    }

    console.log('[dashboardStats] fetchListingsDetails - Recherche des détails pour les IDs:', ids);
    
    if (ids.length === 0) {
      console.log('[dashboardStats] fetchListingsDetails - Aucun ID fourni, retourne un tableau vide');
      return [];
    }

    const { data, error } = await supabase
      .from('listings')
      .select('id, title, city, price_per_month, price_per_night, cover_photo_url, is_furnished')
      .in('id', ids);

    if (error) {
      console.warn('[dashboardStats] fetchListingsDetails error', error);
      return [];
    }

    const result = data ?? [];
    const idsTrouves = result.map(item => item.id);
    const idsNonTrouves = ids.filter(id => !idsTrouves.includes(id));
    
    if (idsNonTrouves.length > 0) {
      console.warn('[dashboardStats] fetchListingsDetails - Certains IDs n\'ont pas été trouvés:', {
        idsRecherches: ids,
        idsTrouves,
        idsNonTrouves
      });
    } else {
      console.log('[dashboardStats] fetchListingsDetails - Tous les IDs ont été trouvés avec succès');
    }

    return result;
  } catch (error) {
    console.warn('[dashboardStats] fetchListingsDetails unexpected error', error);
    return [];
  }
}

function buildPriceLabel(listing: ListingDetailsRow) {
  if (listing.price_per_month) {
    return `${listing.price_per_month.toLocaleString('fr-FR')} FCFA / mois`;
  }
  if (listing.price_per_night) {
    return `${listing.price_per_night.toLocaleString('fr-FR')} FCFA / nuit`;
  }
  return 'Tarif non renseigné';
}

async function fetchAverageReviewRating(): Promise<number | null> {
  try {
    if (!supabase) {
      return null;
    }

    const { data, error } = await supabase
      .from('reviews')
      .select('rating')
      .not('rating', 'is', null);

    if (error) {
      console.warn('[dashboardStats] fetchAverageReviewRating error', error);
      return null;
    }

    const ratings = data?.map(row => row.rating).filter((value): value is number => typeof value === 'number') ?? [];

    if (!ratings.length) {
      return null;
    }

    const sum = ratings.reduce((total, value) => total + value, 0);
    return sum / ratings.length;
  } catch (error) {
    console.warn('[dashboardStats] fetchAverageReviewRating unexpected error', error);
    return null;
  }
}

export async function fetchDashboardOverview(
  dateRange: DateRangeInput,
): Promise<DashboardOverview> {
  if (!supabase) {
    console.warn('[dashboardStats] Supabase client unavailable, returning fallback overview');
    return {
      userStats: { totalUsers: 0, activeUsers30d: 0, newUsers30d: 0 },
      visitorStats: { totalVisitors: 0, authenticatedVisitors: 0, anonymousVisitors: 0 },
      dailySummary: FALLBACK_SUMMARY,
      kpis: [],
      topProperties: EMPTY_TOP_PROPERTIES,
      propertyStats: { total: 0, online: 0, paused: 0, draft: 0 },
    };
  }

  const [userStats, visitorStats, dailySummary, kpiResult, topProperties] = await Promise.all([
    fetchUserStats(),
    fetchVisitorStats(dateRange),
    fetchDailySummary(),
    fetchKpiData(dateRange),
    fetchTopProperties(dateRange),
  ]);

  return {
    userStats,
    visitorStats,
    dailySummary,
    kpis: kpiResult.items,
    topProperties,
    propertyStats: kpiResult.propertyStats,
  };
}
