import { UserX, Banknote, TrendingUp, TrendingDown, Calendar, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';
import { createComparisonMetric } from '../../../lib/mockDataComparison';

interface ChurnLTVWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
}

export function ChurnLTVWidget({ dateRange, isLoading }: ChurnLTVWidgetProps) {
  const isComparing = dateRange.compareEnabled && dateRange.compareStartDate && dateRange.compareEndDate;
  
  // Mock data - TODO: remplacer par API
  
  // Churn
  const churnMetric = createComparisonMetric(22.4, isComparing, -10.8); // Churn baisse = bon
  
  // LTV décomposé
  const ltvGlobalMetric = createComparisonMetric(42500, isComparing, 11.3); // LTV global
  const ltvReservationsMetric = createComparisonMetric(87300, isComparing, 15.8); // LTV pour utilisateurs qui réservent
  const ltvVisitsMetric = createComparisonMetric(34200, isComparing, 8.4); // LTV pour utilisateurs qui visitent
  
  // Données de support pour le LTV
  const totalRevenue = createComparisonMetric(18750000, isComparing, 14.2);
  const revenueFromBookings = createComparisonMetric(12840000, isComparing, 17.3); // 68% du total
  const revenueFromVisits = createComparisonMetric(5910000, isComparing, 9.1); // 32% du total
  
  const totalUsers = createComparisonMetric(441, isComparing, 2.5);
  const usersWithBookings = createComparisonMetric(147, isComparing, 1.4); // ~33% convertissent en réservation
  const usersWithVisits = createComparisonMetric(173, isComparing, 6.9); // ~39% demandent une visite

  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return { 
      value: Math.abs(diff), 
      isPositive: diff >= 0,
      percentage: Math.abs(percentage)
    };
  };

  const churnChange = calculateChange(churnMetric.current, churnMetric.previous);
  const ltvGlobalChange = calculateChange(ltvGlobalMetric.current, ltvGlobalMetric.previous);
  const ltvReservationsChange = calculateChange(ltvReservationsMetric.current, ltvReservationsMetric.previous);
  const ltvVisitsChange = calculateChange(ltvVisitsMetric.current, ltvVisitsMetric.previous);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(value) + ' FCFA';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Churn */}
      <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-600" />
            Churn (utilisateurs perdus)
          </CardTitle>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-200 rounded-xl"></div>
              <div className="h-20 bg-gray-200 rounded-xl"></div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-6 border border-gray-100 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Churn 30 jours</p>
                    <p className="text-5xl text-red-600">{churnMetric.current.toFixed(1)}%</p>
                    {isComparing && churnMetric.previous && (
                      <p className="text-sm text-gray-500 mt-1">vs {churnMetric.previous.toFixed(1)}%</p>
                    )}
                  </div>
                  {isComparing && churnChange && (
                    <Badge 
                      variant={churnChange.isPositive ? 'destructive' : 'default'}
                      className={!churnChange.isPositive ? 'bg-green-600' : ''}
                    >
                      {churnChange.isPositive ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {churnChange.percentage.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-red-600 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${churnMetric.current}%` }}
                  />
                </div>
              </div>

              <div className="bg-red-100 rounded-xl p-4 border border-red-200">
                <p className="text-xs text-red-900">
                  <strong>Churn =</strong> % d'utilisateurs qui ne reviennent plus après 30 jours
                </p>
                {isComparing && churnMetric.previous && (
                  <p className="text-xs text-red-800 mt-1">
                    Période précédente : {churnMetric.previous.toFixed(1)}%
                  </p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* LTV décomposé */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-[#2ECC71]" />
            LTV (Valeur par utilisateur)
          </CardTitle>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-200 rounded-xl"></div>
              <div className="h-24 bg-gray-200 rounded-xl"></div>
              <div className="h-24 bg-gray-200 rounded-xl"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* LTV Global */}
              <div className="bg-white rounded-xl p-5 border-2 border-green-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-[#2ECC71]" />
                    <div>
                      <p className="text-sm text-gray-900">LTV Global</p>
                      <p className="text-xs text-gray-500">Tous utilisateurs confondus</p>
                    </div>
                  </div>
                  {isComparing && ltvGlobalChange && (
                    <Badge 
                      variant={ltvGlobalChange.isPositive ? 'default' : 'destructive'}
                      className={ltvGlobalChange.isPositive ? 'bg-green-600' : ''}
                    >
                      {ltvGlobalChange.isPositive ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {ltvGlobalChange.percentage.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-4xl text-[#2ECC71]">{formatCurrency(ltvGlobalMetric.current)}</p>
                {isComparing && ltvGlobalMetric.previous && (
                  <p className="text-sm text-gray-500 mt-1">vs {formatCurrency(ltvGlobalMetric.previous)}</p>
                )}
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Revenus totaux</p>
                    <p className="text-sm text-gray-900">{formatCurrency(totalRevenue.current)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Utilisateurs</p>
                    <p className="text-sm text-gray-900">{totalUsers.current.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* LTV Réservations */}
              <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-green-300 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-900">LTV Réservations</p>
                      <p className="text-xs text-gray-500">Utilisateurs ayant réservé</p>
                    </div>
                  </div>
                  {isComparing && ltvReservationsChange && (
                    <Badge 
                      variant={ltvReservationsChange.isPositive ? 'default' : 'destructive'}
                      className={ltvReservationsChange.isPositive ? 'bg-green-600 text-xs' : 'text-xs'}
                    >
                      {ltvReservationsChange.isPositive ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {ltvReservationsChange.percentage.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-3xl text-blue-600">{formatCurrency(ltvReservationsMetric.current)}</p>
                {isComparing && ltvReservationsMetric.previous && (
                  <p className="text-sm text-gray-500 mt-1">vs {formatCurrency(ltvReservationsMetric.previous)}</p>
                )}
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Revenus réservations</p>
                    <p className="text-sm text-gray-900">{formatCurrency(revenueFromBookings.current)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Utilisateurs</p>
                    <p className="text-sm text-gray-900">{usersWithBookings.current.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                      {((usersWithBookings.current / totalUsers.current) * 100).toFixed(1)}% du total
                    </p>
                  </div>
                </div>
              </div>

              {/* LTV Visites */}
              <div className="bg-white rounded-xl p-5 border border-gray-100 hover:border-green-300 transition-all">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Home className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-900">LTV Visites</p>
                      <p className="text-xs text-gray-500">Utilisateurs ayant visité</p>
                    </div>
                  </div>
                  {isComparing && ltvVisitsChange && (
                    <Badge 
                      variant={ltvVisitsChange.isPositive ? 'default' : 'destructive'}
                      className={ltvVisitsChange.isPositive ? 'bg-green-600 text-xs' : 'text-xs'}
                    >
                      {ltvVisitsChange.isPositive ? (
                        <TrendingUp className="w-3 h-3 mr-1" />
                      ) : (
                        <TrendingDown className="w-3 h-3 mr-1" />
                      )}
                      {ltvVisitsChange.percentage.toFixed(1)}%
                    </Badge>
                  )}
                </div>
                <p className="text-3xl text-purple-600">{formatCurrency(ltvVisitsMetric.current)}</p>
                {isComparing && ltvVisitsMetric.previous && (
                  <p className="text-sm text-gray-500 mt-1">vs {formatCurrency(ltvVisitsMetric.previous)}</p>
                )}
                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-gray-200">
                  <div>
                    <p className="text-xs text-gray-500">Revenus visites</p>
                    <p className="text-sm text-gray-900">{formatCurrency(revenueFromVisits.current)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Utilisateurs</p>
                    <p className="text-sm text-gray-900">{usersWithVisits.current.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">
                      {((usersWithVisits.current / totalUsers.current) * 100).toFixed(1)}% du total
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
            <p className="text-xs text-green-900">
              <strong>💡 Insight :</strong> Le LTV Réservations est {((ltvReservationsMetric.current / ltvGlobalMetric.current) * 100).toFixed(0)}% 
              supérieur au LTV global, montrant la forte valeur des utilisateurs convertis.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}