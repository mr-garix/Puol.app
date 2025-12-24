import { Award, Home, Calendar, TrendingUp, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import type { DateRange } from '../DateRangePicker';

interface Host {
  id: string;
  name: string;
  avatar: string;
  city: string;
  propertiesCount: number;
  bookingsCount: number;
  averageBookingRate: number;
  performanceScore: number;
  rating: number;
}

interface TopHostsWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
  onHostClick?: (id: string) => void;
}

export function TopHostsWidget({ dateRange, isLoading, onHostClick }: TopHostsWidgetProps) {
  // Mock data - TODO: remplacer par API
  const topHosts: Host[] = [
    {
      id: '1',
      name: 'Marie Kouam',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
      city: 'Douala',
      propertiesCount: 12,
      bookingsCount: 87,
      averageBookingRate: 68.5,
      performanceScore: 94,
      rating: 4.8,
    },
    {
      id: '2',
      name: 'Jean-Pierre Nkoulou',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
      city: 'Yaoundé',
      propertiesCount: 9,
      bookingsCount: 72,
      averageBookingRate: 71.2,
      performanceScore: 91,
      rating: 4.9,
    },
    {
      id: '3',
      name: 'Aïssatou Bello',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
      city: 'Douala',
      propertiesCount: 8,
      bookingsCount: 64,
      averageBookingRate: 65.8,
      performanceScore: 88,
      rating: 4.7,
    },
    {
      id: '4',
      name: 'Paul Essomba',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
      city: 'Bafoussam',
      propertiesCount: 7,
      bookingsCount: 58,
      averageBookingRate: 69.4,
      performanceScore: 86,
      rating: 4.6,
    },
    {
      id: '5',
      name: 'Fatima Njoya',
      avatar: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200',
      city: 'Yaoundé',
      propertiesCount: 6,
      bookingsCount: 51,
      averageBookingRate: 72.1,
      performanceScore: 85,
      rating: 4.8,
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 80) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getScoreRing = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-orange-600';
    return 'text-gray-600';
  };

  return (
    <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-600" />
          Propriétaires les plus performants
        </CardTitle>
        {dateRange && (
          <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-28 bg-gray-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {topHosts.map((host, index) => (
              <div
                key={host.id}
                onClick={() => onHostClick && onHostClick(host.id)}
                className={`group bg-white rounded-xl p-4 border-2 hover:border-yellow-400 hover:shadow-md transition-all cursor-pointer ${getScoreColor(host.performanceScore)}`}
              >
                <div className="flex items-center gap-4">
                  {/* Rank + Avatar */}
                  <div className="flex-shrink-0 relative">
                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-yellow-500 text-white flex items-center justify-center text-xs z-10">
                      #{index + 1}
                    </div>
                    <Avatar className="w-16 h-16 border-2 border-white">
                      <AvatarImage src={host.avatar} alt={host.name} />
                      <AvatarFallback>{host.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm text-gray-900">{host.name}</h4>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                        <span className="text-xs text-gray-600">{host.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">{host.city}</p>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Home className="w-3 h-3" />
                        <span>{host.propertiesCount} annonces</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{host.bookingsCount} réservations</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>{host.averageBookingRate.toFixed(1)}% taux</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Score */}
                  <div className="flex-shrink-0 text-center">
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          className="stroke-current text-gray-200"
                          strokeWidth="3"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="16"
                          fill="none"
                          className={`stroke-current ${getScoreRing(host.performanceScore)}`}
                          strokeWidth="3"
                          strokeDasharray={`${host.performanceScore}, 100`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className={`text-sm ${getScoreRing(host.performanceScore)}`}>
                          {host.performanceScore}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Score</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-4 p-3 bg-yellow-100 rounded-lg border border-yellow-200">
          <p className="text-xs text-yellow-900">
            <strong>Score de performance :</strong> Calculé selon nombre d'annonces, réservations, taux de réservation et note moyenne
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
