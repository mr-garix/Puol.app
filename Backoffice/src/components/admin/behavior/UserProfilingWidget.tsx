import { Users, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';

interface UserProfile {
  id: string;
  name: string;
  description: string;
  percentage: number;
  count: number;
  change: number;
  icon: string;
  color: string;
  recommendation?: string;
}

interface UserProfilingWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
  onSegmentClick?: (segment: string) => void;
}

export function UserProfilingWidget({ dateRange, isLoading, onSegmentClick }: UserProfilingWidgetProps) {
  // Mock data - TODO: remplacer par API
  const profiles: UserProfile[] = [
    {
      id: 'curious',
      name: 'Le Curieux',
      description: 'Beaucoup de vues, peu de réservations',
      percentage: 34.5,
      count: 5468,
      change: 5.2,
      icon: '🔍',
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      recommendation: 'Pousser des incitations à la réservation',
    },
    {
      id: 'decisive',
      name: 'Le Décidé',
      description: 'Réserve rapidement après consultation',
      percentage: 12.3,
      count: 1948,
      change: 8.7,
      icon: '⚡',
      color: 'bg-green-100 text-green-700 border-green-200',
      recommendation: 'VIP : Proposer des offres premium',
    },
    {
      id: 'loyal',
      name: 'Le Fidèle',
      description: 'Revient régulièrement, multi-réservations',
      percentage: 8.7,
      count: 1378,
      change: 12.4,
      icon: '⭐',
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      recommendation: 'Programme de fidélité',
    },
    {
      id: 'active-host',
      name: 'Propriétaire Actif',
      description: 'Annonces performantes, réactif',
      percentage: 6.2,
      count: 982,
      change: 15.3,
      icon: '🏆',
      color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      recommendation: 'Ambassadeur potentiel',
    },
    {
      id: 'dormant-host',
      name: 'Propriétaire Dormant',
      description: 'Compte inactif, pas d\'engagement',
      percentage: 18.4,
      count: 2914,
      change: -6.8,
      icon: '😴',
      color: 'bg-gray-100 text-gray-700 border-gray-200',
      recommendation: 'Campagne de réactivation urgente',
    },
    {
      id: 'browser',
      name: 'Le Flâneur',
      description: 'Sessions longues mais aucune action',
      percentage: 19.9,
      count: 3152,
      change: -3.2,
      icon: '🚶',
      color: 'bg-orange-100 text-orange-700 border-orange-200',
      recommendation: 'Simplifier le parcours de réservation',
    },
  ];

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Profils comportementaux automatiques
        </CardTitle>
        {dateRange && (
          <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {profiles.map((profile) => (
              <div
                key={profile.id}
                onClick={() => onSegmentClick && onSegmentClick(profile.id)}
                className={`group rounded-xl p-4 border-2 hover:shadow-md transition-all cursor-pointer ${profile.color}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{profile.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm">{profile.name}</h4>
                      <Badge variant={profile.change >= 0 ? 'default' : 'destructive'} className={profile.change >= 0 ? 'bg-green-600' : ''}>
                        {profile.change >= 0 ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {Math.abs(profile.change).toFixed(1)}%
                      </Badge>
                    </div>
                    <p className="text-xs opacity-80 mb-2">{profile.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{profile.percentage.toFixed(1)}%</span>
                        <span className="text-xs opacity-70">{profile.count.toLocaleString()} users</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-white/50 rounded-full h-2 mb-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{ 
                      width: `${profile.percentage}%`,
                      backgroundColor: 'currentColor'
                    }}
                  />
                </div>

                {/* Recommendation */}
                {profile.recommendation && (
                  <div className="mt-2 pt-2 border-t border-current/20">
                    <p className="text-xs opacity-80">
                      <strong>💡 Action :</strong> {profile.recommendation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary */}
        <div className="mt-4 p-4 bg-indigo-100 rounded-xl border border-indigo-200">
          <p className="text-xs text-indigo-900">
            <strong>ℹ️ Info :</strong> Les profils sont calculés automatiquement en fonction du comportement observé sur la période sélectionnée
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
