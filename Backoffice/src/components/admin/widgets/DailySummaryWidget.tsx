import { TrendingUp, TrendingDown, Users, UserPlus, Calendar, MapPin } from 'lucide-react';
import type { DailySummaryStat } from '../../../lib/services/dashboardStats';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';

type StatIconKey = DailySummaryStat['key'];

const ICONS: Record<StatIconKey, { icon: React.ReactNode; color: string }> = {
  visitors: {
    icon: <Users className="w-5 h-5" />,
    color: 'bg-blue-100 text-blue-600',
  },
  signups: {
    icon: <UserPlus className="w-5 h-5" />,
    color: 'bg-green-100 text-green-600',
  },
  bookings: {
    icon: <Calendar className="w-5 h-5" />,
    color: 'bg-purple-100 text-purple-600',
  },
  visits: {
    icon: <MapPin className="w-5 h-5" />,
    color: 'bg-amber-100 text-amber-600',
  },
};

const FALLBACK_STATS: DailySummaryStat[] = [
  { key: 'visitors', label: 'Visiteurs', value: 0, previousValue: 0 },
  { key: 'signups', label: 'Inscriptions', value: 0, previousValue: 0 },
  { key: 'bookings', label: 'Réservations', value: 0, previousValue: 0 },
  { key: 'visits', label: 'Visites du jour', value: 0, previousValue: 0 },
];

interface DailySummaryWidgetProps {
  stats?: DailySummaryStat[] | null;
  isLoading?: boolean;
}

const calculateChange = (current: number, previous: number) => {
  if (previous === 0) {
    return { value: current === 0 ? 0 : 100, isPositive: current >= previous };
  }
  const change = ((current - previous) / previous) * 100;
  return { value: Math.abs(change), isPositive: change >= 0 };
};

export function DailySummaryWidget({ stats, isLoading = false }: DailySummaryWidgetProps) {
  const dataset = stats && stats.length > 0 ? stats : FALLBACK_STATS;

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          📊 Résumé du jour
          <span className="text-xs text-gray-500 font-normal ml-auto">
            {new Date().toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {dataset.map((stat, index) => {
            const change = calculateChange(stat.value, stat.previousValue);
            const meta = ICONS[stat.key];
            return (
              <div key={`${stat.key}-${index}`} className="bg-white rounded-xl p-4 border border-gray-100">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${
                    meta?.color ?? 'bg-gray-100 text-gray-600'
                  } ${isLoading ? 'animate-pulse' : ''}`}
                >
                  {meta?.icon ?? <Users className="w-5 h-5" />}
                </div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl text-gray-900 mb-2">
                  {isLoading ? (
                    <span className="inline-block h-6 w-16 rounded bg-gray-200 animate-pulse" />
                  ) : (
                    stat.value.toLocaleString('fr-FR')
                  )}
                </p>
                <div className="flex items-center gap-1 text-xs">
                  {change.isPositive ? (
                    <TrendingUp className="w-3 h-3 text-green-600" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-red-600" />
                  )}
                  <span className={change.isPositive ? 'text-green-600' : 'text-red-600'}>
                    {isLoading ? '...' : `${change.value.toFixed(1)}%`}
                  </span>
                  <span className="text-gray-500">vs hier</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
