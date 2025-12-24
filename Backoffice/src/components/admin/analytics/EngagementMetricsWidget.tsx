import { Clock, Eye, MousePointer, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';
import { createComparisonMetric } from '../../../lib/mockDataComparison';

interface EngagementMetricsWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
}

export function EngagementMetricsWidget({ dateRange, isLoading }: EngagementMetricsWidgetProps) {
  const isComparing = dateRange.compareEnabled && dateRange.compareStartDate && dateRange.compareEndDate;
  
  // Mock data - TODO: remplacer par API
  const timePerListingMetric = createComparisonMetric(47, isComparing, 15.2); // seconds
  const timePerSessionMetric = createComparisonMetric(284, isComparing, 10.9); // seconds
  const listingsViewedMetric = createComparisonMetric(5.3, isComparing, 8.5);
  const bounceRateMetric = createComparisonMetric(34.2, isComparing, -12.3); // % - baisse = bon

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}min ${remainingSeconds}s`
  };

  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return { 
      value: Math.abs(percentage), 
      isPositive: diff >= 0
    };
  };

  return (
    <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-pink-600" />
          Métriques d'engagement
        </CardTitle>
        {dateRange && (
          <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Temps moyen par annonce */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pink-100 text-pink-600 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Temps moyen par annonce</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl text-gray-900">{formatTime(timePerListingMetric.current)}</p>
                      {isComparing && timePerListingMetric.previous && (
                        <span className="text-xs text-gray-500">vs {formatTime(timePerListingMetric.previous)}</span>
                      )}
                    </div>
                  </div>
                </div>
                {isComparing && (() => {
                  const change = calculateChange(timePerListingMetric.current, timePerListingMetric.previous);
                  return change && (
                    <Badge variant={change.isPositive ? 'default' : 'secondary'} className={change.isPositive ? 'bg-green-600 text-xs' : 'bg-gray-600 text-xs'}>
                      {change.isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {change.value.toFixed(1)}%
                    </Badge>
                  );
                })()}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-pink-600 h-2 rounded-full"
                  style={{ width: `${(timePerListingMetric.current / 60) * 100}%` }}
                />
              </div>
            </div>

            {/* Temps moyen par session */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Temps moyen par session</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl text-gray-900">{formatTime(timePerSessionMetric.current)}</p>
                      {isComparing && timePerSessionMetric.previous && (
                        <span className="text-xs text-gray-500">vs {formatTime(timePerSessionMetric.previous)}</span>
                      )}
                    </div>
                  </div>
                </div>
                {isComparing && (() => {
                  const change = calculateChange(timePerSessionMetric.current, timePerSessionMetric.previous);
                  return change && (
                    <Badge variant={change.isPositive ? 'default' : 'secondary'} className={change.isPositive ? 'bg-green-600 text-xs' : 'bg-gray-600 text-xs'}>
                      {change.isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {change.value.toFixed(1)}%
                    </Badge>
                  );
                })()}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${(timePerSessionMetric.current / 600) * 100}%` }}
                />
              </div>
            </div>

            {/* Annonces vues par session */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Annonces vues par session</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl text-gray-900">{listingsViewedMetric.current.toFixed(1)}</p>
                      {isComparing && listingsViewedMetric.previous && (
                        <span className="text-xs text-gray-500">vs {listingsViewedMetric.previous.toFixed(1)}</span>
                      )}
                    </div>
                  </div>
                </div>
                {isComparing && (() => {
                  const change = calculateChange(listingsViewedMetric.current, listingsViewedMetric.previous);
                  return change && (
                    <Badge variant={change.isPositive ? 'default' : 'secondary'} className={change.isPositive ? 'bg-green-600 text-xs' : 'bg-gray-600 text-xs'}>
                      {change.isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {change.value.toFixed(1)}%
                    </Badge>
                  );
                })()}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{ width: `${(listingsViewedMetric.current / 10) * 100}%` }}
                />
              </div>
            </div>

            {/* Taux de rebond */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center">
                    <MousePointer className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-600">Taux de rebond</p>
                    <div className="flex items-center gap-2">
                      <p className="text-2xl text-gray-900">{bounceRateMetric.current.toFixed(1)}%</p>
                      {isComparing && bounceRateMetric.previous && (
                        <span className="text-xs text-gray-500">vs {bounceRateMetric.previous.toFixed(1)}%</span>
                      )}
                    </div>
                  </div>
                </div>
                {isComparing && (() => {
                  const change = calculateChange(bounceRateMetric.current, bounceRateMetric.previous);
                  return change && (
                    <Badge variant={!change.isPositive ? 'default' : 'secondary'} className={!change.isPositive ? 'bg-green-600 text-xs' : 'bg-red-600 text-xs'}>
                      {change.isPositive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {change.value.toFixed(1)}%
                    </Badge>
                  );
                })()}
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-orange-600 h-2 rounded-full"
                  style={{ width: `${bounceRateMetric.current}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-pink-100 rounded-lg border border-pink-200">
          <p className="text-xs text-pink-900">
            <strong>💡 Insight :</strong> Les utilisateurs passent en moyenne {formatTime(timePerListingMetric.current)} sur chaque annonce, 
            ce qui indique un bon niveau d'engagement.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}