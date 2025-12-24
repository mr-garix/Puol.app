import { Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';
import { createComparisonMetric } from '../../../lib/mockDataComparison';

interface RetentionData {
  day: string;
  label: string;
  value: number;
  previousValue?: number;
  users: number;
  previousUsers?: number;
}

interface RetentionWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
}

export function RetentionWidget({ dateRange, isLoading }: RetentionWidgetProps) {
  const isComparing = dateRange.compareEnabled && dateRange.compareStartDate && dateRange.compareEndDate;
  
  // Mock data - TODO: remplacer par API
  const baseRetentionData = [
    {
      day: 'D+1',
      label: 'Jour 1',
      value: 42.5,
      users: 674,
      variation: 11.3,
    },
    {
      day: 'D+7',
      label: 'Jour 7',
      value: 28.3,
      users: 448,
      variation: -9.0,
    },
    {
      day: 'D+30',
      label: 'Jour 30',
      value: 15.7,
      users: 249,
      variation: 5.4,
    },
  ];

  const retentionData: RetentionData[] = baseRetentionData.map(d => {
    const metricValue = createComparisonMetric(d.value, isComparing, d.variation);
    const metricUsers = createComparisonMetric(d.users, isComparing, d.variation);
    return {
      day: d.day,
      label: d.label,
      value: metricValue.current,
      previousValue: metricValue.previous,
      users: metricUsers.current,
      previousUsers: metricUsers.previous,
    };
  });

  const calculateChange = (current: number, previous?: number) => {
    if (!previous || previous === 0) return null;
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return { 
      value: Math.abs(percentage), 
      isPositive: diff >= 0
    };
  };

  const getStatusColor = (value: number) => {
    if (value >= 40) return 'bg-green-100 text-green-700 border-green-200';
    if (value >= 25) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          Rétention utilisateur
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
                <div className="h-28 bg-gray-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {retentionData.map((data, index) => {
              const change = calculateChange(data.value, data.previousValue);
              return (
                <div key={index} className={`rounded-xl p-4 border-2 ${getStatusColor(data.value)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">{data.day}</Badge>
                        <h4 className="text-sm">{data.label}</h4>
                      </div>
                      <p className="text-xs opacity-70">{data.users.toLocaleString()} utilisateurs</p>
                      {isComparing && data.previousUsers && (
                        <p className="text-xs opacity-60 mt-0.5">vs {data.previousUsers.toLocaleString()}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-3xl mb-1">{data.value.toFixed(1)}%</p>
                      {isComparing && data.previousValue && (
                        <p className="text-xs opacity-70 mb-1">vs {data.previousValue.toFixed(1)}%</p>
                      )}
                      {isComparing && change && (
                        <Badge variant={change.isPositive ? 'default' : 'secondary'} className={`text-xs ${change.isPositive ? 'bg-green-600' : 'bg-red-600'}`}>
                          {change.isPositive ? (
                            <TrendingUp className="w-3 h-3 mr-1" />
                          ) : (
                            <TrendingDown className="w-3 h-3 mr-1" />
                          )}
                          {change.value.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ 
                        width: `${data.value}%`,
                        backgroundColor: data.value >= 40 ? '#16a34a' : data.value >= 25 ? '#ea580c' : '#dc2626'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-900">
            <strong>Rétention =</strong> % d'utilisateurs qui reviennent X jours après leur première utilisation
          </p>
        </div>
      </CardContent>
    </Card>
  );
}