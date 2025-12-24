import { Download, RefreshCw, ExternalLink, ChevronRight, AlertTriangle } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { DateRangePicker, type DateRange } from '../DateRangePicker';
import { KPICard } from '../KPICard';
import { RealtimeWidget } from '../RealtimeWidget';
import { DailySummaryWidget } from '../widgets/DailySummaryWidget';
import { ConversionRateWidget } from '../widgets/ConversionRateWidget';
import { TopPropertiesWidget } from '../widgets/TopPropertiesWidget';
import { SmartAlertsWidget } from '../widgets/SmartAlertsWidget';
import { useAdminRole } from '../../../contexts/AdminRoleContext';
import { exportPendingActionsToCSV, exportTopCitiesToCSV } from '../utils/exportUtils';
import { getUnifiedCities, UNIFIED_PROPERTIES, UNIFIED_VISITS, UNIFIED_MESSAGES } from '../../../lib/mockDataUnified';
import {
  fetchDashboardOverview,
  type DashboardOverview,
  type KPIItem,
} from '../../../lib/services/dashboardStats';

interface PendingAction {
  label: string;
  count: number;
  type: 'warning' | 'info' | 'error';
  route: string;
}

interface CityStats {
  name: string;
  properties: number;
  bookings: number;
  percentage: number;
}

interface DashboardSectionNewProps {
  onNavigateToRealtime?: () => void;
  onNavigateToSection?: (section: string) => void;
}

export function DashboardSectionNew({ onNavigateToRealtime, onNavigateToSection }: DashboardSectionNewProps = {}) {
  const { hasPermission } = useAdminRole();
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: '30days',
    label: '30 derniers jours',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const latestRequestRef = useRef(0);

  const loadDashboard = useCallback(
    async (range: DateRange, options: { silent?: boolean } = {}) => {
      const requestId = ++latestRequestRef.current;
      if (!options.silent) {
        setIsLoading(true);
      }
      setFetchError(null);
      try {
        const data = await fetchDashboardOverview({
          startDate: range.startDate,
          endDate: range.endDate,
        });
        if (latestRequestRef.current === requestId) {
          setOverview(data);
          setLastUpdate(new Date());
          console.log('[DashboardSectionNew] Overview loaded', {
            range,
            topProperties: {
              furnishedViewed: data.topProperties.furnished.viewed.map(item => ({
                id: item.id,
                stat: item.stat,
              })),
              furnishedBooked: data.topProperties.furnished.booked.map(item => ({
                id: item.id,
                stat: item.stat,
              })),
              unfurnishedViewed: data.topProperties.unfurnished.viewed.map(item => ({
                id: item.id,
                stat: item.stat,
              })),
              unfurnishedVisited: data.topProperties.unfurnished.visited.map(item => ({
                id: item.id,
                stat: item.stat,
              })),
            },
          });
        }
      } catch (error) {
        console.error('[DashboardSectionNew] Failed to load dashboard overview', error);
        if (latestRequestRef.current === requestId) {
          setFetchError("Impossible de charger les statistiques. Réessayez plus tard.");
        }
      } finally {
        if (!options.silent && latestRequestRef.current === requestId) {
          setIsLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadDashboard(dateRange);
  }, [dateRange, loadDashboard]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadDashboard(dateRange, { silent: true }).finally(() => setIsRefreshing(false));
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
    setLastUpdate(new Date());
  };

  const kpiData: KPIItem[] = overview?.kpis ?? [];
  const userStats = overview?.userStats;
  const visitorStats = overview?.visitorStats;
  const topProperties = overview?.topProperties;
  const dailySummary = overview?.dailySummary ?? [];

  const totalUsers = userStats?.totalUsers ?? 0;
  const activeUsers = userStats?.activeUsers30d ?? 0;
  const newUsers = userStats?.newUsers30d ?? 0;
  const totalVisitors = visitorStats?.totalVisitors ?? 0;
  const authenticatedVisitors = visitorStats?.authenticatedVisitors ?? 0;
  const anonymousVisitors = visitorStats?.anonymousVisitors ?? 0;

  // Mock pending actions - TODO: remplacer par API
  const pendingActionsSeed: PendingAction[] = [
    { label: 'Annonces en attente', count: UNIFIED_PROPERTIES.pending, type: 'warning', route: 'properties?status=pending' },
    { label: 'Visites à confirmer', count: UNIFIED_VISITS.pending, type: 'info', route: 'visits?status=pending' },
    { label: 'Tickets support', count: UNIFIED_MESSAGES.tickets.open, type: 'error', route: 'support' },
    { label: 'Paiements en échec', count: 12, type: 'error', route: 'payments?status=failed' },
  ];

  const pendingActions = pendingActionsSeed.filter(action => {
    // Support voit Tickets et Paiements
    if (action.route.includes('support') || action.route.includes('payments')) {
      return hasPermission('view_support') || hasPermission('view_finance');
    }
    return true;
  });

  // Mock top cities - TODO: remplacer par API
  const topCities: CityStats[] = getUnifiedCities();

  const handleKPIClick = (route: string) => {
    console.log(`Navigate to ${route} with date range filter`);
    // TODO: Navigation vers la section avec filtre date
    if (onNavigateToSection) {
      onNavigateToSection(route);
    }
  };

  const handlePendingActionClick = (route: string) => {
    console.log(`Navigate to ${route}`);
    // TODO: Navigation vers la section filtrée
    if (onNavigateToSection) {
      onNavigateToSection(route);
    }
  };

  const handleCityClick = (cityName: string) => {
    console.log(`Navigate to properties filtered by ${cityName}`);
    // TODO: Navigation vers annonces filtrées par ville
    if (onNavigateToSection) {
      onNavigateToSection(`properties?city=${cityName}`);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête avec filtres */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gray-900">Tableau de bord</h1>
          <p className="text-gray-500 mt-1">Vue d'ensemble de la plateforme PUOL</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Dernière mise à jour : {formatTime(lastUpdate)}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
        </div>
      </div>

      {/* Alertes de chargement */}
      {fetchError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 text-red-700 text-sm py-4">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{fetchError}</span>
          </CardContent>
        </Card>
      )}

      {/* 1. Stat global utilisateurs */}
      <Card className="bg-gradient-to-r from-gray-900 to-gray-700 text-white rounded-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-white">
            Utilisateurs totaux
            <Badge className="bg-white/10 text-white border-white/20 rounded-full">
              Base PUOL
            </Badge>
            <span className="text-sm text-white/70 ml-auto">
              Derniers comptes vérifiés inclus
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-5xl font-semibold leading-none">
              {isLoading ? <span className="inline-block h-10 w-32 rounded bg-white/20 animate-pulse" /> : totalUsers.toLocaleString('fr-FR')}
            </p>
            <p className="text-sm text-white/70 mt-2">
              Comptes enregistrés (locataires & propriétaires)
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-white/60 uppercase tracking-[0.3em] text-xs mb-1">
                Actifs 30j
              </p>
              <p className="text-2xl font-semibold">
                {isLoading ? <span className="inline-block h-6 w-16 rounded bg-white/20 animate-pulse" /> : activeUsers.toLocaleString('fr-FR')}
              </p>
            </div>
            <div>
              <p className="text-white/60 uppercase tracking-[0.3em] text-xs mb-1">
                Nouveaux 30j
              </p>
              <p className="text-2xl font-semibold">
                {isLoading ? <span className="inline-block h-6 w-16 rounded bg-white/20 animate-pulse" /> : newUsers.toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 1bis. Stat global visiteurs */}
      <Card className="bg-gradient-to-r from-violet-900 to-indigo-700 text-white rounded-3xl">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-white">Visiteurs totaux</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-5xl font-semibold leading-none">
              {isLoading ? (
                <span className="inline-block h-10 w-32 rounded bg-white/20 animate-pulse" />
              ) : (
                totalVisitors.toLocaleString('fr-FR')
              )}
            </p>
          </div>
          <div className="flex gap-6 text-sm">
            <div>
              <p className="text-white/60 uppercase tracking-[0.3em] text-xs mb-1">Authentifiés</p>
              <p className="text-2xl font-semibold">
                {isLoading ? (
                  <span className="inline-block h-6 w-16 rounded bg-white/20 animate-pulse" />
                ) : (
                  authenticatedVisitors.toLocaleString('fr-FR')
                )}
              </p>
            </div>
            <div>
              <p className="text-white/60 uppercase tracking-[0.3em] text-xs mb-1">Anonymes</p>
              <p className="text-2xl font-semibold">
                {isLoading ? (
                  <span className="inline-block h-6 w-16 rounded bg-white/20 animate-pulse" />
                ) : (
                  anonymousVisitors.toLocaleString('fr-FR')
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Résumé du jour */}
      <DailySummaryWidget stats={dailySummary} isLoading={isLoading} />

      {/* 3. KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiData
          .filter((kpi: KPIItem) => kpi.visible)
          .map((kpi: KPIItem, index: number) => (
            <KPICard
              key={index}
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              color={kpi.color}
              definition={kpi.definition}
              onClick={() => handleKPIClick(kpi.route)}
              isLoading={isLoading}
              dateRange={dateRange}
              currentValue={kpi.currentValue}
              previousValue={kpi.previousValue}
              secondaryLabel={kpi.secondaryLabel}
              secondaryValue={kpi.secondaryValue}
            />
          ))}
      </div>

      {/* 4. Top annonces segmentées (meublés / non-meublés) */}
      <TopPropertiesWidget 
        data={topProperties}
        isLoading={isLoading}
        onPropertyClick={(id) => {
          console.log(`Navigate to property ${id}`);
          if (onNavigateToSection) {
            onNavigateToSection(`properties?id=${id}`);
          }
        }} 
      />

      {/* 5. Taux de conversion */}
      <ConversionRateWidget dateRange={dateRange} />

      {/* 6. Alertes intelligentes (nouveau) */}
      <SmartAlertsWidget 
        onAlertClick={(route) => {
          console.log(`Navigate to ${route}`);
          if (onNavigateToSection) {
            onNavigateToSection(route);
          }
        }}
      />

      {/* 7. Actions en attente + Top villes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions en attente */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Actions en attente</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportPendingActionsToCSV(pendingActions)}
              className="rounded-xl text-gray-600 hover:text-gray-900"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-6 w-12 bg-gray-200 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </>
            ) : pendingActions.length > 0 ? (
              pendingActions.map((action, index) => (
                <div
                  key={index}
                  onClick={() => handlePendingActionClick(action.route)}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">{action.label}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <Badge
                    variant={action.type === 'error' ? 'destructive' : action.type === 'warning' ? 'default' : 'secondary'}
                    className={action.type === 'warning' ? 'bg-orange-100 text-orange-700' : ''}
                  >
                    {action.count}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Aucune action en attente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top villes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>Top villes</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => exportTopCitiesToCSV(topCities)}
              className="rounded-xl text-gray-600 hover:text-gray-900"
            >
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="animate-pulse space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    </div>
                    <div className="w-full h-2 bg-gray-200 rounded-full"></div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {topCities.map((city, index) => (
                  <div
                    key={index}
                    className="space-y-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg -m-2 transition-colors group"
                    onClick={() => handleCityClick(city.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-900">{city.name}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <span className="text-sm text-gray-500">{city.properties} annonces</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#2ECC71] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${city.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">{city.bookings} réservations</span>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  className="w-full mt-2 rounded-xl text-[#2ECC71] hover:bg-green-50"
                  onClick={() => {
                    if (onNavigateToSection) {
                      onNavigateToSection('cities');
                    }
                  }}
                >
                  Voir toutes les villes
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 8. Widget temps réel */}
      <RealtimeWidget onViewDetails={onNavigateToRealtime} />

      {/* 9. Alertes système */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-900">Alertes système</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <>
              {[1, 2].map(i => (
                <div key={i} className="flex items-start gap-3 animate-pulse">
                  <div className="w-2 h-2 bg-gray-300 rounded-full mt-1.5" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-300 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5" />
                <div>
                  <p className="text-sm text-orange-900">Intégration Orange Money : 2 paiements en échec</p>
                  <p className="text-xs text-orange-700">Il y a 15 minutes</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5" />
                <div>
                  <p className="text-sm text-orange-900">File de modération : 5 annonces en attente depuis +24h</p>
                  <p className="text-xs text-orange-700">Il y a 2 heures</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}