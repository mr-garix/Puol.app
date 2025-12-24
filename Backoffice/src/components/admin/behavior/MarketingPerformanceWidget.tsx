import { DollarSign, TrendingUp, TrendingDown, Target, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';
import { createComparisonMetric } from '../../../lib/mockDataComparison';

interface MarketingPerformanceWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
}

export function MarketingPerformanceWidget({ dateRange, isLoading }: MarketingPerformanceWidgetProps) {
  const isComparing = dateRange.compareEnabled && dateRange.compareStartDate && dateRange.compareEndDate;
  
  // Mock data - TODO: remplacer par API
  
  // CAC (Coût d'acquisition par utilisateur)
  const cacPerSignup = createComparisonMetric(2500, isComparing, -10.7);
  const cacPerBooking = createComparisonMetric(12500, isComparing, -12.0);
  const cacPerHost = createComparisonMetric(18000, isComparing, 9.1);

  // ROAS par ville
  const roasByCity = [
    {
      city: 'Douala',
      spent: 450000, // FCFA
      revenue: 2340000, // FCFA
      roas: 5.2,
      recommendation: 'increase',
      trend: 8.3,
    },
    {
      city: 'Yaoundé',
      spent: 380000,
      revenue: 1825000,
      roas: 4.8,
      recommendation: 'increase',
      trend: 6.2,
    },
    {
      city: 'Bafoussam',
      spent: 150000,
      revenue: 615000,
      roas: 4.1,
      recommendation: 'maintain',
      trend: 2.4,
    },
    {
      city: 'Garoua',
      spent: 120000,
      revenue: 385000,
      roas: 3.2,
      recommendation: 'maintain',
      trend: -1.2,
    },
    {
      city: 'Bamenda',
      spent: 95000,
      revenue: 175000,
      roas: 1.8,
      recommendation: 'reduce',
      trend: -5.7,
    },
  ].map(city => {
    if (isComparing) {
      const roasMetric = createComparisonMetric(city.roas, true, city.trend);
      return {
        ...city,
        previousRoas: roasMetric.previous,
      };
    }
    return city;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(value) + ' FCFA';
  };

  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return { 
      value: Math.abs(diff), 
      isPositive: diff < 0, // For CAC, lower is better
      percentage: Math.abs(percentage)
    };
  };

  const getROASColor = (roas: number) => {
    if (roas >= 4.5) return 'text-green-600 bg-green-100';
    if (roas >= 3.0) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getRecommendationBadge = (rec: string) => {
    if (rec === 'increase') return <Badge className="bg-green-600">📈 Augmenter budget</Badge>;
    if (rec === 'maintain') return <Badge className="bg-blue-600">⚖️ Maintenir</Badge>;
    return <Badge variant="destructive">📉 Réduire budget</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* CAC */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Coût d'acquisition par utilisateur (CAC)
          </CardTitle>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Par inscription */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-600">Par inscription</p>
                  {isComparing && (() => {
                    const change = calculateChange(cacPerSignup.current, cacPerSignup.previous);
                    return change && (
                      <Badge 
                        variant={change.isPositive ? 'default' : 'destructive'}
                        className={change.isPositive ? 'bg-green-600' : ''}
                      >
                        {change.isPositive ? (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        )}
                        {change.percentage.toFixed(1)}%
                      </Badge>
                    );
                  })()}
                </div>
                <p className="text-2xl text-purple-600">{formatCurrency(cacPerSignup.current)}</p>
                {isComparing && cacPerSignup.previous && (
                  <p className="text-xs text-gray-500 mt-1">vs {formatCurrency(cacPerSignup.previous)}</p>
                )}
              </div>

              {/* Par réservation */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-600">Par réservation</p>
                  {isComparing && (() => {
                    const change = calculateChange(cacPerBooking.current, cacPerBooking.previous);
                    return change && (
                      <Badge 
                        variant={change.isPositive ? 'default' : 'destructive'}
                        className={change.isPositive ? 'bg-green-600' : ''}
                      >
                        {change.isPositive ? (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        )}
                        {change.percentage.toFixed(1)}%
                      </Badge>
                    );
                  })()}
                </div>
                <p className="text-2xl text-purple-600">{formatCurrency(cacPerBooking.current)}</p>
                {isComparing && cacPerBooking.previous && (
                  <p className="text-xs text-gray-500 mt-1">vs {formatCurrency(cacPerBooking.previous)}</p>
                )}
              </div>

              {/* Par propriétaire */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-600">Par propriétaire</p>
                  {isComparing && (() => {
                    const change = calculateChange(cacPerHost.current, cacPerHost.previous);
                    return change && (
                      <Badge 
                        variant={!change.isPositive ? 'default' : 'destructive'}
                        className={!change.isPositive ? 'bg-red-600' : ''}
                      >
                        {!change.isPositive ? (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        )}
                        {change.percentage.toFixed(1)}%
                      </Badge>
                    );
                  })()}
                </div>
                <p className="text-2xl text-purple-600">{formatCurrency(cacPerHost.current)}</p>
                {isComparing && cacPerHost.previous && (
                  <p className="text-xs text-gray-500 mt-1">vs {formatCurrency(cacPerHost.previous)}</p>
                )}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="mt-4 p-3 bg-purple-100 rounded-lg border border-purple-200">
            <p className="text-xs text-purple-900">
              <strong>ℹ️ Note :</strong> Le CAC mesure combien coûte l'acquisition d'un nouveau client via les canaux marketing payants. Plus bas = mieux.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ROAS par ville */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-[#2ECC71]" />
            ROAS interne (Return On Ad Spend)
          </CardTitle>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">{dateRange.label} • ROAS = Revenus ÷ Dépenses publicitaires</p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {roasByCity.map((item, index) => {
                const roasChange = item.previousRoas 
                  ? ((item.roas - item.previousRoas) / item.previousRoas * 100)
                  : null;
                
                return (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-4 border border-gray-100 hover:border-green-400 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <MapPin className="w-5 h-5 text-[#2ECC71]" />
                        <div>
                          <h4 className="text-sm text-gray-900">{item.city}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                            <span>💸 Dépensé : {formatCurrency(item.spent)}</span>
                            <span>•</span>
                            <span>💰 Généré : {formatCurrency(item.revenue)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getROASColor(item.roas)}>
                            ROAS : {item.roas.toFixed(1)}x
                          </Badge>
                          {isComparing && item.previousRoas && roasChange !== null && (
                            <Badge variant={roasChange >= 0 ? 'default' : 'destructive'} className={roasChange >= 0 ? 'bg-green-600 text-xs' : 'text-xs'}>
                              {roasChange >= 0 ? '↑' : '↓'} {Math.abs(roasChange).toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                        {getRecommendationBadge(item.recommendation)}
                      </div>
                    </div>

                    {isComparing && item.previousRoas && (
                      <p className="text-xs text-gray-500 mb-2">
                        ROAS précédent : {item.previousRoas.toFixed(1)}x
                      </p>
                    )}

                    {/* ROAS Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          item.roas >= 4.5 ? 'bg-green-600' : 
                          item.roas >= 3.0 ? 'bg-orange-600' : 
                          'bg-red-600'
                        }`}
                        style={{ width: `${Math.min((item.roas / 6) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Summary */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-100 rounded-xl border border-green-200">
              <p className="text-xs text-green-700 mb-1">ROAS moyen global</p>
              <p className="text-3xl text-green-900">
                {(roasByCity.reduce((sum, item) => sum + item.roas, 0) / roasByCity.length).toFixed(1)}x
              </p>
            </div>
            <div className="p-4 bg-green-100 rounded-xl border border-green-200">
              <p className="text-xs text-green-700 mb-1">Revenus totaux générés</p>
              <p className="text-xl text-green-900">
                {formatCurrency(roasByCity.reduce((sum, item) => sum + item.revenue, 0))}
              </p>
            </div>
          </div>

          {/* Info */}
          <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
            <p className="text-xs text-green-900">
              <strong>💡 Insight :</strong> Un ROAS supérieur à 4x indique une excellente rentabilité. 
              Considérez augmenter le budget sur les villes avec ROAS élevé.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}