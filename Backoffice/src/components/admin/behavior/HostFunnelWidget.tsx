import { ChevronDown, Home, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';
import { createComparisonMetric } from '../../../lib/mockDataComparison';

interface FunnelStep {
  label: string;
  value: number;
  percentage: number;
  dropoff?: number;
  icon: string;
  previousValue?: number;
}

interface HostFunnelWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
}

export function HostFunnelWidget({ dateRange, isLoading }: HostFunnelWidgetProps) {
  const isComparing = dateRange.compareEnabled && dateRange.compareStartDate && dateRange.compareEndDate;
  
  // Mock data - TODO: remplacer par API
  const baseFunnelSteps = [
    { label: 'Ouverture app', value: 2847, percentage: 100, icon: '📱', variation: 14.2 },
    { label: 'Tableau de bord hôte', value: 1923, percentage: 67.5, dropoff: 32.5, icon: '📊', variation: 18.5 },
    { label: 'Création annonce', value: 1247, percentage: 43.8, dropoff: 23.7, icon: '✏️', variation: 22.3 },
    { label: 'Publication', value: 856, percentage: 30.1, dropoff: 13.7, icon: '🚀', variation: 16.8 },
    { label: 'Réservations reçues', value: 412, percentage: 14.5, dropoff: 15.6, icon: '💰', variation: 24.5 },
  ];

  const funnelSteps: FunnelStep[] = baseFunnelSteps.map(step => {
    if (isComparing) {
      const metric = createComparisonMetric(step.value, true, step.variation);
      return {
        ...step,
        previousValue: metric.previous,
      };
    }
    return step;
  });

  const globalConversion = ((funnelSteps[4].value / funnelSteps[0].value) * 100).toFixed(2);
  const previousGlobalConversion = isComparing && funnelSteps[4].previousValue && funnelSteps[0].previousValue
    ? ((funnelSteps[4].previousValue / funnelSteps[0].previousValue) * 100).toFixed(2)
    : null;
  
  const conversionChange = previousGlobalConversion 
    ? ((parseFloat(globalConversion) - parseFloat(previousGlobalConversion)) / parseFloat(previousGlobalConversion) * 100)
    : null;

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Home className="w-5 h-5 text-[#2ECC71]" />
            Funnel 2 : Propriétaire
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-[#2ECC71] text-white">
              Conversion : {globalConversion}%
            </Badge>
            {isComparing && conversionChange !== null && (
              <Badge variant={conversionChange >= 0 ? 'default' : 'destructive'} className={conversionChange >= 0 ? 'bg-green-600' : ''}>
                {conversionChange >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {Math.abs(conversionChange).toFixed(1)}%
              </Badge>
            )}
          </div>
        </div>
        {dateRange && (
          <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-gray-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {funnelSteps.map((step, index) => {
              const changePercent = step.previousValue 
                ? ((step.value - step.previousValue) / step.previousValue * 100)
                : null;
              
              return (
                <div key={index}>
                  <div 
                    className="relative bg-white rounded-xl p-4 border-2 border-green-200 hover:border-green-400 transition-all"
                    style={{
                      marginLeft: `${index * 2}%`,
                      marginRight: `${index * 2}%`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{step.icon}</span>
                        <div>
                          <h4 className="text-sm text-gray-900">{step.label}</h4>
                          <p className="text-xs text-gray-500">Étape {index + 1}/5</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-2xl text-[#2ECC71]">{step.value.toLocaleString()}</p>
                            {isComparing && step.previousValue && (
                              <p className="text-xs text-gray-500">vs {step.previousValue.toLocaleString()}</p>
                            )}
                          </div>
                          {isComparing && changePercent !== null && (
                            <Badge variant={changePercent >= 0 ? 'default' : 'secondary'} className={changePercent >= 0 ? 'bg-green-600 text-xs' : 'bg-red-600 text-xs'}>
                              {changePercent >= 0 ? '↑' : '↓'} {Math.abs(changePercent).toFixed(1)}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-[#2ECC71] h-2 rounded-full transition-all duration-500"
                            style={{ width: `${step.percentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm text-[#2ECC71] ml-4">{step.percentage.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* Dropoff indicator */}
                  {step.dropoff !== undefined && index < funnelSteps.length - 1 && (
                    <div className="flex items-center justify-center py-2">
                      <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full">
                        <ChevronDown className="w-3 h-3" />
                        <span>-{step.dropoff.toFixed(1)}% de perte</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        <div className="mt-6 p-4 bg-green-100 rounded-xl border border-green-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-green-700 mb-1">Entrées</p>
              <p className="text-xl text-green-900">{funnelSteps[0].value.toLocaleString()}</p>
              {isComparing && funnelSteps[0].previousValue && (
                <p className="text-xs text-green-600">vs {funnelSteps[0].previousValue.toLocaleString()}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-green-700 mb-1">Propriétaires actifs</p>
              <p className="text-xl text-green-900">{funnelSteps[4].value.toLocaleString()}</p>
              {isComparing && funnelSteps[4].previousValue && (
                <p className="text-xs text-green-600">vs {funnelSteps[4].previousValue.toLocaleString()}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-green-700 mb-1">Taux global</p>
              <p className="text-xl text-green-900">{globalConversion}%</p>
              {isComparing && previousGlobalConversion && (
                <p className="text-xs text-green-600">vs {previousGlobalConversion}%</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}