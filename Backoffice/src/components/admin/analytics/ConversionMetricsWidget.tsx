import { Target, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';
import { createComparisonMetric } from '../../../lib/mockDataComparison';

interface ConversionMetric {
  label: string;
  value: number;
  previousValue?: number;
  color: string;
}

interface ConversionMetricsWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
}

export function ConversionMetricsWidget({ dateRange, isLoading }: ConversionMetricsWidgetProps) {
  const isComparing = dateRange.compareEnabled && dateRange.compareStartDate && dateRange.compareEndDate;
  
  // Mock data - TODO: remplacer par API
  const baseMetrics = [
    {
      label: 'Conversion globale',
      value: 3.54,
      color: 'text-[#2ECC71]',
      variation: 11.3,
    },
    {
      label: 'Conversion inscription',
      value: 2.64,
      color: 'text-blue-600',
      variation: 6.0,
    },
    {
      label: 'Conversion annonce publiée',
      value: 1.87,
      color: 'text-purple-600',
      variation: 15.4,
    },
  ];

  const metrics: ConversionMetric[] = baseMetrics.map(m => {
    const metric = createComparisonMetric(m.value, isComparing, m.variation);
    return {
      label: m.label,
      value: metric.current,
      previousValue: metric.previous,
      color: m.color,
    };
  });

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
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#2ECC71]" />
          Taux de conversion détaillés
        </CardTitle>
        {dateRange && (
          <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.map((metric, index) => {
              const change = calculateChange(metric.value, metric.previousValue);
              return (
                <div key={index} className="bg-white rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm text-gray-700">{metric.label}</h4>
                    {isComparing && change && (
                      <Badge variant={change.isPositive ? 'default' : 'destructive'} className={change.isPositive ? 'bg-green-600' : ''}>
                        {change.isPositive ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {change.percentage.toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className={`text-3xl ${metric.color}`}>{metric.value.toFixed(2)}%</p>
                      {isComparing && metric.previousValue && (
                        <p className="text-xs text-gray-500 mt-1">
                          vs {metric.previousValue.toFixed(2)}%
                        </p>
                      )}
                    </div>
                    {isComparing && change && (
                      <p className={`text-xs ${change.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {change.isPositive ? '+' : '-'}{change.value.toFixed(2)}pp
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}