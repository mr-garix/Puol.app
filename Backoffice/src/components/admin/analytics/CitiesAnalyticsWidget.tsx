import { MapPin, TrendingUp, Users, Eye, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';
import { createComparisonMetric } from '../../../lib/mockDataComparison';

interface CityData {
  name: string;
  activeUsers: number;
  previousUsers?: number;
  views: number;
  previousViews?: number;
  bookings: number;
  previousBookings?: number;
  growth: number;
  isGrowing: boolean;
}

interface CitiesAnalyticsWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
  onCityClick?: (city: string) => void;
}

export function CitiesAnalyticsWidget({ dateRange, isLoading, onCityClick }: CitiesAnalyticsWidgetProps) {
  const isComparing = dateRange.compareEnabled && dateRange.compareStartDate && dateRange.compareEndDate;
  
  // Mock data - TODO: remplacer par API
  const baseCities = [
    { name: 'Douala', activeUsers: 3847, views: 18234, bookings: 289, growth: 12.5, isGrowing: true },
    { name: 'Yaoundé', activeUsers: 3124, views: 14567, bookings: 234, growth: 8.3, isGrowing: true },
    { name: 'Bafoussam', activeUsers: 856, views: 4123, bookings: 67, growth: 18.7, isGrowing: true },
    { name: 'Garoua', activeUsers: 634, views: 2847, bookings: 42, growth: 24.3, isGrowing: true },
    { name: 'Bamenda', activeUsers: 512, views: 2341, bookings: 38, growth: -3.2, isGrowing: false },
  ];

  const cities: CityData[] = baseCities.map(city => {
    if (isComparing) {
      const usersMetric = createComparisonMetric(city.activeUsers, true, city.growth);
      const viewsMetric = createComparisonMetric(city.views, true, city.growth);
      const bookingsMetric = createComparisonMetric(city.bookings, true, city.growth);
      return {
        ...city,
        previousUsers: usersMetric.previous,
        previousViews: viewsMetric.previous,
        previousBookings: bookingsMetric.previous,
      };
    }
    return city;
  });

  return (
    <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-teal-600" />
          Villes et zones les plus actives
        </CardTitle>
        {dateRange && (
          <p className="text-xs text-gray-500 mt-1">{dateRange.label} • 🇨🇲 Cameroun uniquement</p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {cities.map((city, index) => (
              <div
                key={index}
                onClick={() => onCityClick && onCityClick(city.name)}
                className="group bg-white rounded-xl p-4 border border-gray-100 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm text-gray-900">{city.name}</h4>
                      <div className="flex items-center gap-2 text-xs">
                        {city.isGrowing ? (
                          <Badge className="bg-green-100 text-green-700">
                            <TrendingUp className="w-3 h-3 mr-1" />
                            +{city.growth.toFixed(1)}%
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700">
                            {city.growth.toFixed(1)}%
                          </Badge>
                        )}
                        {city.growth >= 20 && (
                          <Badge variant="secondary" className="text-xs">🔥 En croissance</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-gray-100">
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Users className="w-3 h-3" />
                      <span>Utilisateurs</span>
                    </div>
                    <p className="text-sm text-gray-900">{city.activeUsers.toLocaleString()}</p>
                    {isComparing && city.previousUsers && (
                      <p className="text-xs text-gray-500">vs {city.previousUsers.toLocaleString()}</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Eye className="w-3 h-3" />
                      <span>Vues</span>
                    </div>
                    <p className="text-sm text-gray-900">{city.views.toLocaleString()}</p>
                    {isComparing && city.previousViews && (
                      <p className="text-xs text-gray-500">vs {city.previousViews.toLocaleString()}</p>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                      <Calendar className="w-3 h-3" />
                      <span>Réservations</span>
                    </div>
                    <p className="text-sm text-gray-900">{city.bookings}</p>
                    {isComparing && city.previousBookings && (
                      <p className="text-xs text-gray-500">vs {city.previousBookings}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}