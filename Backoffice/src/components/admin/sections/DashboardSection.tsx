import type { ReactNode } from 'react';
import { TrendingUp, TrendingDown, Users, Home, Calendar, DollarSign, MapPin, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';
import { ComparisonBadge } from '../ComparisonBadge';

interface StatCard {
  title: string;
  value: string;
  change: number;
  icon: ReactNode;
  color: string;
  emoji: string;
  currentValue: number;
  previousValue?: number;
}

interface DashboardSectionProps {
  dateRange: DateRange;
}

export function DashboardSection({ dateRange }: DashboardSectionProps) {
  const stats: StatCard[] = [
    {
      title: 'Utilisateurs actifs',
      value: '2,847',
      change: 12.5,
      icon: <Users className="w-5 h-5" />,
      color: 'bg-blue-500',
      emoji: '👤',
      currentValue: 2847,
      previousValue: 2534,
    },
    {
      title: 'Annonces en ligne',
      value: '1,234',
      change: 8.2,
      icon: <Home className="w-5 h-5" />,
      color: 'bg-[#2ECC71]',
      emoji: '🏠',
      currentValue: 1234,
      previousValue: 1140,
    },
    {
      title: 'Réservations',
      value: '456',
      change: -3.1,
      icon: <Calendar className="w-5 h-5" />,
      color: 'bg-purple-500',
      emoji: '📅',
      currentValue: 456,
      previousValue: 471,
    },
    {
      title: 'Revenus (FCFA)',
      value: '12,5M',
      change: 15.8,
      icon: <DollarSign className="w-5 h-5" />,
      color: 'bg-orange-500',
      emoji: '💵',
      currentValue: 12500000,
      previousValue: 10800000,
    },
    {
      title: 'Visites programmées',
      value: '89',
      change: 5.4,
      icon: <MapPin className="w-5 h-5" />,
      color: 'bg-pink-500',
      emoji: '📍',
      currentValue: 89,
      previousValue: 84,
    },
    {
      title: 'Note moyenne',
      value: '4.8',
      change: 0.2,
      icon: <Star className="w-5 h-5" />,
      color: 'bg-yellow-500',
      emoji: '⭐',
      currentValue: 4.8,
      previousValue: 4.6,
    }
  ];

  const pendingActions = [
    { label: 'Annonces en attente', count: 5, type: 'warning' },
    { label: 'Visites à confirmer', count: 3, type: 'info' },
    { label: 'Tickets support', count: 12, type: 'error' },
    { label: 'Paiements en échec', count: 2, type: 'error' },
  ];

  const topCities = [
    { name: 'Douala', properties: 456, bookings: 234 },
    { name: 'Yaoundé', properties: 389, bookings: 189 },
    { name: 'Bafoussam', properties: 123, bookings: 67 },
    { name: 'Bamenda', properties: 98, bookings: 45 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* En-tête */}
      <div>
        <h1 className="text-3xl text-gray-900">Tableau de bord</h1>
        <p className="text-gray-500 mt-1">Vue d'ensemble de la plateforme PUOL</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{stat.emoji}</span>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                  </div>
                  <p className="text-3xl mt-2 text-gray-900">{stat.value}</p>
                  
                  {/* Période actuelle */}
                  <div className="flex items-center gap-2 mt-3">
                    {stat.change >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`text-sm ${stat.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {stat.change >= 0 ? '+' : ''}{stat.change}%
                    </span>
                    <span className="text-sm text-gray-500">vs période précédente</span>
                  </div>

                  {/* Comparaison de périodes */}
                  {dateRange.compareEnabled && stat.previousValue && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500">Période de comparaison :</span>
                        <ComparisonBadge 
                          currentValue={stat.currentValue} 
                          previousValue={stat.previousValue} 
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {dateRange.compareStartDate?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          {' - '}
                          {dateRange.compareEndDate?.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${stat.color} bg-opacity-10`}>
                  <div className={`${stat.color.replace('bg-', 'text-')}`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions en attente */}
        <Card>
          <CardHeader>
            <CardTitle>Actions en attente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingActions.map((action, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
                <span className="text-sm text-gray-700">{action.label}</span>
                <Badge 
                  variant={action.type === 'error' ? 'destructive' : action.type === 'warning' ? 'default' : 'secondary'}
                  className={action.type === 'warning' ? 'bg-orange-100 text-orange-700' : ''}
                >
                  {action.count}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top villes */}
        <Card>
          <CardHeader>
            <CardTitle>Top villes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {topCities.map((city, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900">{city.name}</span>
                  <span className="text-sm text-gray-500">{city.properties} annonces</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-[#2ECC71] h-2 rounded-full"
                    style={{ width: `${(city.bookings / city.properties) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{city.bookings} réservations</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Alertes système */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-900">Alertes système</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5" />
            <div>
              <p className="text-sm text-orange-900">Intégration Orange Money : 2 paiements en échec</p>
              <p className="text-xs text-orange-700">Il y a 15 minutes</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5" />
            <div>
              <p className="text-sm text-orange-900">File de modération : 5 annonces en attente depuis +24h</p>
              <p className="text-xs text-orange-700">Il y a 2 heures</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}