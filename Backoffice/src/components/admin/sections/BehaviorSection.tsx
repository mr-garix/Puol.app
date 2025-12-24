import { Brain, RefreshCw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { DateRangePicker, type DateRange } from '../DateRangePicker';
import { KPICard } from '../KPICard';
import { TenantFunnelWidget } from '../behavior/TenantFunnelWidget';
import { HostFunnelWidget } from '../behavior/HostFunnelWidget';
import { AnonymousFunnelWidget } from '../behavior/AnonymousFunnelWidget';
import { EngagementBehaviorWidget } from '../behavior/EngagementBehaviorWidget';
import { MarketDynamicsWidget } from '../behavior/MarketDynamicsWidget';
import { UserProfilingWidget } from '../behavior/UserProfilingWidget';
import { SmartSegmentationWidget } from '../behavior/SmartSegmentationWidget';
import { MarketingPerformanceWidget } from '../behavior/MarketingPerformanceWidget';
import { getUnifiedKPIs, UNIFIED_PAYMENTS, UNIFIED_BOOKINGS, UNIFIED_VISITS, UNIFIED_CONTRACTS } from '../../../lib/mockDataUnified';
import { formatCurrency } from '../../../lib/revenueMetrics';

interface BehaviorSectionProps {
  onNavigateToSection?: (section: string) => void;
}

export function BehaviorSection({ onNavigateToSection }: BehaviorSectionProps) {
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
          <h1 className="text-3xl text-gray-900">Comportement</h1>
          <p className="text-gray-500 mt-1">Parcours utilisateur, marché immobilier, profilage et performances marketing</p>
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

      {/* Section Title: Parcours utilisateur */}
      <div className="flex items-center gap-3 pt-4">
        <div className="w-1 h-8 bg-purple-600 rounded-full"></div>
        <h2 className="text-2xl text-gray-900">Parcours utilisateur (Funnels avancés)</h2>
      </div>

      {/* 3 Funnels */}
      <div className="grid grid-cols-1 gap-6">
        <TenantFunnelWidget dateRange={dateRange} isLoading={isLoading} />
        <HostFunnelWidget dateRange={dateRange} isLoading={isLoading} />
        <AnonymousFunnelWidget dateRange={dateRange} isLoading={isLoading} />
      </div>

      {/* Section Title: Engagement & Comportement */}
      <div className="flex items-center gap-3 pt-8">
        <div className="w-1 h-8 bg-blue-600 rounded-full"></div>
        <h2 className="text-2xl text-gray-900">Engagement & Comportement utilisateur</h2>
      </div>

      {/* Engagement metrics */}
      <EngagementBehaviorWidget dateRange={dateRange} isLoading={isLoading} />

      {/* Section Title: Dynamique du marché */}
      <div className="flex items-center gap-3 pt-8">
        <div className="w-1 h-8 bg-green-600 rounded-full"></div>
        <h2 className="text-2xl text-gray-900">Dynamique du marché immobilier</h2>
      </div>

      {/* Market dynamics */}
      <MarketDynamicsWidget dateRange={dateRange} isLoading={isLoading} />

      {/* Section Title: Profils & Segmentation */}
      <div className="flex items-center gap-3 pt-8">
        <div className="w-1 h-8 bg-orange-600 rounded-full"></div>
        <h2 className="text-2xl text-gray-900">Profils utilisateurs & Segmentation</h2>
      </div>

      {/* User Profiling + Smart Segmentation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UserProfilingWidget 
          dateRange={dateRange} 
          isLoading={isLoading}
          onSegmentClick={(segment) => {
            if (onNavigateToSection) {
              onNavigateToSection(`users?segment=${segment}`);
            }
          }}
        />
        <SmartSegmentationWidget 
          dateRange={dateRange} 
          isLoading={isLoading}
          onSegmentClick={(segment) => {
            if (onNavigateToSection) {
              onNavigateToSection(`users?segment=${segment}`);
            }
          }}
        />
      </div>

      {/* Section Title: Performances Marketing */}
      <div className="flex items-center gap-3 pt-8">
        <div className="w-1 h-8 bg-pink-600 rounded-full"></div>
        <h2 className="text-2xl text-gray-900">Performances Marketing</h2>
      </div>

      {/* Marketing Performance */}
      <MarketingPerformanceWidget dateRange={dateRange} isLoading={isLoading} />

      {/* Métriques clés du comportement */}
      <Card className="bg-gradient-to-br from-gray-50 to-white border-gray-200">
        <CardContent className="p-6">
          <h3 className="text-lg text-gray-900 mb-4">Récapitulatif des métriques (30 jours)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">GMV Total</p>
              <p className="text-3xl text-blue-600">{formatCurrency(UNIFIED_PAYMENTS.gmvTotal, true)}</p>
              <p className="text-xs text-green-600 mt-1">+{UNIFIED_PAYMENTS.growth.gmv}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">CA PUOL Total</p>
              <p className="text-3xl text-[#2ECC71]">{formatCurrency(UNIFIED_PAYMENTS.revenueTotal, true)}</p>
              <p className="text-xs text-green-600 mt-1">+{UNIFIED_PAYMENTS.growth.revenue}%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Réservations meublées</p>
              <p className="text-3xl text-purple-600">{UNIFIED_BOOKINGS.total.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-green-600 mt-1">+14.3%</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Contrats non-meublés</p>
              <p className="text-3xl text-orange-600">{UNIFIED_CONTRACTS.total.toLocaleString('fr-FR')}</p>
              <p className="text-xs text-green-600 mt-1">+{UNIFIED_CONTRACTS.growth.total}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}