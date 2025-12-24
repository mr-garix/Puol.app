import { DollarSign, TrendingUp, TrendingDown, Building2, Calendar, MapPin, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';
import { createComparisonMetric } from '../../../lib/mockDataComparison';
import { REVENUE_COLORS, formatCurrency, getMockRevenueData, calculateTakeRate } from '../../../lib/revenueMetrics';

interface GMVWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
}

export function GMVWidget({ dateRange, isLoading }: GMVWidgetProps) {
  const isComparing = dateRange.compareEnabled && dateRange.compareStartDate && dateRange.compareEndDate;
  
  // Mock data - TODO: remplacer par API
  
  // GMV total
  const gmvTotal = createComparisonMetric(19141000, isComparing, 18.2);
  const gmvBookings = createComparisonMetric(18696000, isComparing, 18.5);
  const gmvVisits = createComparisonMetric(445000, isComparing, 12.4);
  
  // GMV par type
  const gmvFurnished = createComparisonMetric(14957000, isComparing, 20.3); // 80% des réservations
  const gmvUnfurnished = createComparisonMetric(3739000, isComparing, 12.1); // 20% des réservations
  
  // GMV par ville (Top 4)
  const gmvByCity = [
    {
      name: 'Douala',
      gmv: createComparisonMetric(7656000, isComparing, 22.5),
      bookings: 234,
      avgValue: 32718,
      percentage: 40,
    },
    {
      name: 'Yaoundé',
      gmv: createComparisonMetric(6526000, isComparing, 16.8),
      bookings: 189,
      avgValue: 34524,
      percentage: 34,
    },
    {
      name: 'Bafoussam',
      gmv: createComparisonMetric(2748000, isComparing, 14.2),
      bookings: 67,
      avgValue: 41015,
      percentage: 14,
    },
    {
      name: 'Bamenda',
      gmv: createComparisonMetric(1845000, isComparing, 11.5),
      bookings: 45,
      avgValue: 41000,
      percentage: 10,
    },
  ];
  
  // Take rate = Revenue / GMV
  const takeRate = calculateTakeRate(3439380, 19141000).toFixed(1); // ~18%

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

  return (
    <div className="space-y-6">
      {/* Header avec définition */}
      <Card className={`${REVENUE_COLORS.gmv.border} bg-gradient-to-br ${REVENUE_COLORS.gmv.bgLight} to-white`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`${REVENUE_COLORS.gmv.bg} w-12 h-12 rounded-xl flex items-center justify-center`}>
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className={REVENUE_COLORS.gmv.text}>GMV (Gross Merchandise Value)</CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Montant total payé par les utilisateurs (réservations + visites)
                </p>
              </div>
            </div>
          </div>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-2">{dateRange.label}</p>
          )}
        </CardHeader>
      </Card>

      {/* GMV Total + Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GMV Total */}
        <Card className={`${REVENUE_COLORS.gmv.border} border-2`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">GMV Total</CardTitle>
              {isComparing && (() => {
                const change = calculateChange(gmvTotal.current, gmvTotal.previous);
                return change && (
                  <Badge 
                    variant={change.isPositive ? 'default' : 'destructive'}
                    className={change.isPositive ? 'bg-green-600' : ''}
                  >
                    {change.isPositive ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {change.percentage.toFixed(1)}%
                  </Badge>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-12 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ) : (
              <>
                <p className={`text-4xl ${REVENUE_COLORS.gmv.text}`}>
                  {formatCurrency(gmvTotal.current, true)}
                </p>
                {isComparing && gmvTotal.previous && (
                  <p className="text-sm text-gray-500 mt-1">
                    vs {formatCurrency(gmvTotal.previous, true)}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-600 mb-1">Take Rate (CA PUOL / GMV)</p>
                  <p className={`text-xl ${REVENUE_COLORS.revenue.text}`}>{takeRate}%</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* GMV Réservations */}
        <Card className={REVENUE_COLORS.gmv.border}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                GMV Réservations
              </CardTitle>
              {isComparing && (() => {
                const change = calculateChange(gmvBookings.current, gmvBookings.previous);
                return change && (
                  <Badge 
                    variant={change.isPositive ? 'default' : 'destructive'}
                    className={change.isPositive ? 'bg-green-600 text-xs' : 'text-xs'}
                  >
                    {change.isPositive ? '↑' : '↓'} {change.percentage.toFixed(1)}%
                  </Badge>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl text-purple-600">{formatCurrency(gmvBookings.current, true)}</p>
                {isComparing && gmvBookings.previous && (
                  <p className="text-sm text-gray-500 mt-1">
                    vs {formatCurrency(gmvBookings.previous, true)}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {((gmvBookings.current / gmvTotal.current) * 100).toFixed(1)}% du GMV total
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* GMV Visites */}
        <Card className={REVENUE_COLORS.gmv.border}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                GMV Visites
              </CardTitle>
              {isComparing && (() => {
                const change = calculateChange(gmvVisits.current, gmvVisits.previous);
                return change && (
                  <Badge 
                    variant={change.isPositive ? 'default' : 'destructive'}
                    className={change.isPositive ? 'bg-green-600 text-xs' : 'text-xs'}
                  >
                    {change.isPositive ? '↑' : '↓'} {change.percentage.toFixed(1)}%
                  </Badge>
                );
              })()}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse">
                <div className="h-10 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : (
              <>
                <p className="text-3xl text-pink-600">{formatCurrency(gmvVisits.current, true)}</p>
                {isComparing && gmvVisits.previous && (
                  <p className="text-sm text-gray-500 mt-1">
                    vs {formatCurrency(gmvVisits.previous, true)}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  {((gmvVisits.current / gmvTotal.current) * 100).toFixed(1)}% du GMV total
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* GMV par type de logement */}
      <Card className={REVENUE_COLORS.gmv.border}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-blue-600" />
            GMV par type de logement
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2].map(i => (
                <div key={i}>
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded-full"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Meublé */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-700">Logements meublés</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-purple-600">{formatCurrency(gmvFurnished.current, true)}</span>
                    {isComparing && (() => {
                      const change = calculateChange(gmvFurnished.current, gmvFurnished.previous);
                      return change && (
                        <Badge variant={change.isPositive ? 'default' : 'secondary'} className={change.isPositive ? 'bg-green-600 text-xs' : 'text-xs'}>
                          {change.isPositive ? '↑' : '↓'} {change.percentage.toFixed(1)}%
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-purple-600 h-3 rounded-full" style={{ width: '80%' }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">80% du GMV réservations</p>
              </div>

              {/* Non meublé */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-gray-700">Logements non meublés</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg text-orange-600">{formatCurrency(gmvUnfurnished.current, true)}</span>
                    {isComparing && (() => {
                      const change = calculateChange(gmvUnfurnished.current, gmvUnfurnished.previous);
                      return change && (
                        <Badge variant={change.isPositive ? 'default' : 'secondary'} className={change.isPositive ? 'bg-green-600 text-xs' : 'text-xs'}>
                          {change.isPositive ? '↑' : '↓'} {change.percentage.toFixed(1)}%
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-orange-600 h-3 rounded-full" style={{ width: '20%' }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">20% du GMV réservations</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GMV par ville */}
      <Card className={REVENUE_COLORS.gmv.border}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-600" />
            GMV par ville (Top 4)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {gmvByCity.map((city, index) => {
                const change = calculateChange(city.gmv.current, city.gmv.previous);
                return (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm text-gray-900">{city.name}</h4>
                        <p className="text-xs text-gray-500">{city.bookings} réservations • Moy: {formatCurrency(city.avgValue)}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <p className={`text-xl ${REVENUE_COLORS.gmv.text}`}>{formatCurrency(city.gmv.current, true)}</p>
                          {isComparing && change && (
                            <Badge variant={change.isPositive ? 'default' : 'secondary'} className={change.isPositive ? 'bg-green-600 text-xs' : 'text-xs'}>
                              {change.isPositive ? '↑' : '↓'} {change.percentage.toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                        {isComparing && city.gmv.previous && (
                          <p className="text-xs text-gray-500">vs {formatCurrency(city.gmv.previous, true)}</p>
                        )}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`${REVENUE_COLORS.gmv.bg} h-2 rounded-full transition-all duration-500`}
                        style={{ width: `${city.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info box */}
      <div className={`${REVENUE_COLORS.gmv.bgLight} rounded-xl p-4 border ${REVENUE_COLORS.gmv.border}`}>
        <p className="text-sm text-gray-900">
          <strong>💡 GMV vs Chiffre d'affaires :</strong> Le GMV représente le montant total payé par les utilisateurs. 
          PUOL gagne réellement {takeRate}% de ce montant (commission + frais), soit {formatCurrency(3439380, true)} de chiffre d'affaires.
        </p>
      </div>
    </div>
  );
}