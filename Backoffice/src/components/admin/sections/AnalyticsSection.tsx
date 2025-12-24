import { TrendingUp, Users, Target, Clock, MapPin, Award, AlertTriangle, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { DateRangePicker, type DateRange } from '../DateRangePicker';
import { UserFunnelWidget } from '../analytics/UserFunnelWidget';
import { ConversionMetricsWidget } from '../analytics/ConversionMetricsWidget';
import { RetentionWidget } from '../analytics/RetentionWidget';
import { ChurnLTVWidget } from '../analytics/ChurnLTVWidget';
import { GMVWidget } from '../analytics/GMVWidget';
import { RevenueOverviewWidget } from '../analytics/RevenueOverviewWidget';
import { TopPropertiesAnalyticsWidget } from '../analytics/TopPropertiesAnalyticsWidget';
import { TopHostsWidget } from '../analytics/TopHostsWidget';
import { ActivityHeatmapWidget } from '../analytics/ActivityHeatmapWidget';
import { CitiesAnalyticsWidget } from '../analytics/CitiesAnalyticsWidget';
import { EngagementMetricsWidget } from '../analytics/EngagementMetricsWidget';
import { SmartSignalsWidget } from '../analytics/SmartSignalsWidget';

interface AnalyticsSectionProps {
  onNavigateToSection?: (section: string) => void;
}

export function AnalyticsSection({ onNavigateToSection }: AnalyticsSectionProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    preset: '30days',
    label: '30 derniers jours',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    endDate: new Date(),
  });
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial loading
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, [dateRange]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdate(new Date());
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Analyse avancée des performances et comportements utilisateurs</p>
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

      {/* Funnel complet */}
      <UserFunnelWidget dateRange={dateRange} isLoading={isLoading} />

      {/* Conversion + Rétention + Churn/LTV */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversionMetricsWidget dateRange={dateRange} isLoading={isLoading} />
        <RetentionWidget dateRange={dateRange} isLoading={isLoading} />
      </div>

      {/* Churn + LTV */}
      <ChurnLTVWidget dateRange={dateRange} isLoading={isLoading} />

      {/* GMV */}
      <GMVWidget dateRange={dateRange} isLoading={isLoading} />

      {/* Top annonces (performance détaillée) */}
      <TopPropertiesAnalyticsWidget 
        dateRange={dateRange} 
        isLoading={isLoading}
        onPropertyClick={(id) => {
          if (onNavigateToSection) {
            onNavigateToSection(`properties?id=${id}`);
          }
        }}
      />

      {/* Propriétaires les plus performants */}
      <TopHostsWidget 
        dateRange={dateRange} 
        isLoading={isLoading}
        onHostClick={(id) => {
          if (onNavigateToSection) {
            onNavigateToSection(`users?id=${id}&tab=properties`);
          }
        }}
      />

      {/* Heatmap d'activité */}
      <ActivityHeatmapWidget dateRange={dateRange} isLoading={isLoading} />

      {/* Villes + Engagement + Alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CitiesAnalyticsWidget 
          dateRange={dateRange} 
          isLoading={isLoading}
          onCityClick={(city) => {
            if (onNavigateToSection) {
              onNavigateToSection(`cities?highlight=${city}`);
            }
          }}
        />
        <EngagementMetricsWidget dateRange={dateRange} isLoading={isLoading} />
      </div>

      {/* Signaux & alertes */}
      <SmartSignalsWidget 
        onSignalClick={(route) => {
          if (onNavigateToSection) {
            onNavigateToSection(route);
          }
        }}
      />
    </div>
  );
}