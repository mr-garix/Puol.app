import { Activity, TrendingUp, Smartphone, Monitor } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface RealtimeData {
  activeUsers: number;
  topPages: Array<{ path: string; users: number }>;
  topCities: Array<{ city: string; users: number }>;
  devices: { mobile: number; desktop: number };
}

interface RealtimeWidgetProps {
  onViewDetails?: () => void;
}

export function RealtimeWidget({ onViewDetails }: RealtimeWidgetProps) {
  const [data, setData] = useState<RealtimeData>({
    activeUsers: 0,
    topPages: [],
    topCities: [],
    devices: { mobile: 0, desktop: 0 },
  });
  const [isLoading, setIsLoading] = useState(true);

  // Mock realtime data with updates every 5 seconds
  useEffect(() => {
    const fetchRealtimeData = () => {
      // Mock API call - TODO: replace with Google Analytics Realtime API
      const mockData: RealtimeData = {
        activeUsers: Math.floor(Math.random() * 50) + 20,
        topPages: [
          { path: '/annonces', users: Math.floor(Math.random() * 15) + 5 },
          { path: '/annonce/123', users: Math.floor(Math.random() * 10) + 3 },
          { path: '/recherche', users: Math.floor(Math.random() * 8) + 2 },
          { path: '/profil', users: Math.floor(Math.random() * 5) + 1 },
          { path: '/messagerie', users: Math.floor(Math.random() * 4) + 1 },
        ],
        topCities: [
          { city: 'Douala', users: Math.floor(Math.random() * 12) + 4 },
          { city: 'Yaoundé', users: Math.floor(Math.random() * 10) + 3 },
          { city: 'Bafoussam', users: Math.floor(Math.random() * 6) + 2 },
          { city: 'Bamenda', users: Math.floor(Math.random() * 4) + 1 },
          { city: 'Garoua', users: Math.floor(Math.random() * 3) + 1 },
        ],
        devices: {
          mobile: Math.floor(Math.random() * 45) + 10,
          desktop: 0, // Filtrer uniquement mobile
        },
      };
      setData(mockData);
      setIsLoading(false);
    };

    fetchRealtimeData();
    const interval = setInterval(fetchRealtimeData, 5000);

    return () => clearInterval(interval);
  }, []);

  const totalDevices = data.devices.mobile + data.devices.desktop;
  const mobilePercentage = 100; // Toujours 100% car on filtre uniquement mobile

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-[#2ECC71]" />
          <CardTitle>Activité temps réel</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-xs text-gray-500">En direct</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-12 bg-gray-200 rounded-xl"></div>
            <div className="h-20 bg-gray-200 rounded-xl"></div>
            <div className="h-20 bg-gray-200 rounded-xl"></div>
          </div>
        ) : (
          <>
            {/* Active Users */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Utilisateurs actifs</p>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl text-gray-900">{data.activeUsers}</p>
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                </div>
                <div className="text-center">
                  <Smartphone className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                  <p className="text-xs text-gray-500">{data.devices.mobile} mobile</p>
                </div>
              </div>
              <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-blue-500 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${mobilePercentage}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                100% mobile (Android, iOS)
              </p>
            </div>

            {/* Top Pages */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-sm text-gray-600 mb-3">Top 5 pages</p>
              <div className="space-y-2">
                {data.topPages.map((page, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 truncate flex-1 mr-2">{page.path}</span>
                    <Badge variant="secondary" className="text-xs">
                      {page.users}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Cities */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-sm text-gray-600 mb-3">Top 5 villes</p>
              <div className="space-y-2">
                {data.topCities.map((city, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{city.city}</span>
                    <Badge variant="secondary" className="text-xs">
                      {city.users}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {onViewDetails && (
              <Button
                variant="outline"
                className="w-full rounded-xl text-[#2ECC71] border-[#2ECC71] hover:bg-green-50"
                onClick={onViewDetails}
              >
                Voir les détails complets
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}