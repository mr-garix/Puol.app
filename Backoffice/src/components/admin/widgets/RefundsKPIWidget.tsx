import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { TrendingDown, AlertCircle } from 'lucide-react';
import type { DateRange } from '../DateRangePicker';
import { ComparisonBadge } from '../ComparisonBadge';
import { supabase } from '../../../lib/supabaseClient';

interface RefundData {
  id: string;
  refund_amount: number;
  status: string;
  requested_at: string;
}

interface RefundsKPIWidgetProps {
  dateRange: DateRange;
  isLoading?: boolean;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'XAF',
});

const statusVariants = {
  pending: { label: 'En attente', className: 'bg-orange-100 text-orange-700' },
  processing: { label: 'En cours', className: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Complété', className: 'bg-green-100 text-green-700' },
  failed: { label: 'Échoué', className: 'bg-red-100 text-red-700' },
};

export function RefundsKPIWidget({ dateRange, isLoading = false }: RefundsKPIWidgetProps) {
  const [refunds, setRefunds] = useState<RefundData[]>([]);
  const [previousRefunds, setPreviousRefunds] = useState<RefundData[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  useEffect(() => {
    const loadRefunds = async () => {
      if (!supabase) {
        setIsLoadingData(false);
        return;
      }

      setIsLoadingData(true);

      try {
        // Normalize date range
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);

        const startIso = startDate.toISOString();
        const endIso = endDate.toISOString();

        // Calculate previous period
        const periodLength = endDate.getTime() - startDate.getTime();
        const prevEndDate = new Date(startDate.getTime() - 1);
        const prevStartDate = new Date(prevEndDate.getTime() - periodLength);

        const prevStartIso = prevStartDate.toISOString();
        const prevEndIso = prevEndDate.toISOString();

        // Fetch current period
        const { data: currentData, error: currentError } = await (supabase as any)
          .from('refunds')
          .select('id, refund_amount, status, requested_at')
          .gte('requested_at', startIso)
          .lte('requested_at', endIso)
          .order('requested_at', { ascending: false });

        // Fetch previous period
        const { data: previousData, error: previousError } = await (supabase as any)
          .from('refunds')
          .select('id, refund_amount, status, requested_at')
          .gte('requested_at', prevStartIso)
          .lte('requested_at', prevEndIso)
          .order('requested_at', { ascending: false });

        if (!currentError) {
          setRefunds((currentData ?? []) as RefundData[]);
        }
        if (!previousError) {
          setPreviousRefunds((previousData ?? []) as RefundData[]);
        }
      } catch (error) {
        console.error('[RefundsKPIWidget] Error loading refunds:', error);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadRefunds();
  }, [dateRange]);

  const stats = useMemo(() => {
    const currentTotal = refunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0);
    const currentCount = refunds.length;
    const previousTotal = previousRefunds.reduce((sum, r) => sum + (r.refund_amount || 0), 0);
    const previousCount = previousRefunds.length;

    const byStatus: Record<string, number> = {};
    refunds.forEach((r) => {
      const status = r.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    return {
      currentTotal,
      currentCount,
      previousTotal,
      previousCount,
      byStatus,
    };
  }, [refunds, previousRefunds]);

  if (isLoading || isLoadingData) {
    return (
      <Card className="rounded-3xl border border-gray-100 overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            Remboursements
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border border-gray-100 overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="p-3 bg-red-100 rounded-xl">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span>Remboursements</span>
              <span className="text-xs text-gray-500 font-normal">
                Montant total et détails des remboursements
              </span>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Total amount */}
          <div className="p-4 bg-red-50 rounded-xl">
            <p className="text-xs uppercase tracking-wide text-gray-600 mb-2">Montant total</p>
            <div className="flex items-baseline gap-3">
              <p className="text-2xl md:text-3xl font-semibold text-gray-900">
                {currencyFormatter.format(stats.currentTotal)}
              </p>
              {stats.previousTotal > 0 && (
                <ComparisonBadge
                  currentValue={stats.currentTotal}
                  previousValue={stats.previousTotal}
                  showPercentage={true}
                />
              )}
            </div>
          </div>

          {/* Count */}
          <div className="p-4 bg-orange-50 rounded-xl">
            <p className="text-xs uppercase tracking-wide text-gray-600 mb-2">Nombre de remboursements</p>
            <div className="flex items-baseline gap-3">
              <p className="text-2xl md:text-3xl font-semibold text-gray-900">
                {stats.currentCount}
              </p>
              {stats.previousCount > 0 && (
                <ComparisonBadge
                  currentValue={stats.currentCount}
                  previousValue={stats.previousCount}
                  showPercentage={true}
                />
              )}
            </div>
          </div>

          {/* Average */}
          <div className="p-4 bg-yellow-50 rounded-xl">
            <p className="text-xs uppercase tracking-wide text-gray-600 mb-2">Montant moyen</p>
            <p className="text-2xl md:text-3xl font-semibold text-gray-900">
              {stats.currentCount > 0
                ? currencyFormatter.format(stats.currentTotal / stats.currentCount)
                : currencyFormatter.format(0)}
            </p>
          </div>
        </div>

        {/* Status breakdown */}
        {Object.keys(stats.byStatus).length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">Répartition par statut</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.byStatus).map(([status, count]) => {
                const variant = statusVariants[status as keyof typeof statusVariants] || {
                  label: status,
                  className: 'bg-gray-100 text-gray-700',
                };
                return (
                  <Badge key={status} className={`${variant.className} px-3 py-1 text-xs rounded-full`}>
                    {variant.label}: {count}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty state */}
        {stats.currentCount === 0 && (
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">Aucun remboursement</p>
              <p className="text-xs text-blue-700">Aucun remboursement pour cette période</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
