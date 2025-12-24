import { MapPin, Search, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

interface City {
  name: string;
  properties: number;
  bookings: number;
  activeUsers: number;
  revenue: number;
  trend: number;
  region: string;
}

interface CitiesSectionProps {
  onNavigateToProperties?: (city: string) => void;
}

export function CitiesSection({ onNavigateToProperties }: CitiesSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock data - TODO: remplacer par API
  const cities: City[] = [
    { name: 'Douala', properties: 456, bookings: 234, activeUsers: 1247, revenue: 5600000, trend: 15.3, region: 'Littoral' },
    { name: 'Yaoundé', properties: 389, bookings: 189, activeUsers: 1089, revenue: 4200000, trend: 12.8, region: 'Centre' },
    { name: 'Bafoussam', properties: 123, bookings: 67, activeUsers: 342, revenue: 1400000, trend: 8.5, region: 'Ouest' },
    { name: 'Bamenda', properties: 98, bookings: 45, activeUsers: 278, revenue: 980000, trend: -2.1, region: 'Nord-Ouest' },
    { name: 'Garoua', properties: 87, bookings: 38, activeUsers: 234, revenue: 850000, trend: 5.2, region: 'Nord' },
    { name: 'Kribi', properties: 76, bookings: 42, activeUsers: 189, revenue: 920000, trend: 18.7, region: 'Sud' },
    { name: 'Limbé', properties: 65, bookings: 34, activeUsers: 156, revenue: 780000, trend: 7.4, region: 'Sud-Ouest' },
    { name: 'Ngaoundéré', properties: 54, bookings: 28, activeUsers: 143, revenue: 650000, trend: 4.1, region: 'Adamaoua' },
    { name: 'Bertoua', properties: 43, bookings: 21, activeUsers: 112, revenue: 520000, trend: -1.5, region: 'Est' },
    { name: 'Maroua', properties: 38, bookings: 19, activeUsers: 98, revenue: 480000, trend: 3.2, region: 'Extrême-Nord' },
  ];

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    city.region.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProperties = cities.reduce((sum, city) => sum + city.properties, 0);
  const totalBookings = cities.reduce((sum, city) => sum + city.bookings, 0);
  const totalRevenue = cities.reduce((sum, city) => sum + city.revenue, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' FCFA';
  };

  const exportToCSV = () => {
    const headers = ['Ville', 'Région', 'Annonces', 'Réservations', 'Utilisateurs', 'Revenus', 'Tendance'];
    const rows = filteredCities.map(city => [
      city.name,
      city.region,
      city.properties,
      city.bookings,
      city.activeUsers,
      city.revenue,
      `${city.trend}%`,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `puol_villes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl text-gray-900">Villes</h1>
          <p className="text-gray-500 mt-1">Vue d'ensemble des villes actives sur PUOL</p>
        </div>
        <Button
          variant="outline"
          onClick={exportToCSV}
          className="rounded-xl"
        >
          <Download className="w-4 h-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      {/* Statistiques globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total annonces</p>
                <p className="text-2xl text-gray-900 mt-1">{totalProperties.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🏠</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total réservations</p>
                <p className="text-2xl text-gray-900 mt-1">{totalBookings.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📅</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total revenus</p>
                <p className="text-2xl text-gray-900 mt-1">{(totalRevenue / 1000000).toFixed(1)}M</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💵</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recherche */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des villes ({filteredCities.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Rechercher par ville ou région..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
            />
          </div>

          {/* Tableau des villes */}
          <div className="space-y-3">
            {filteredCities.map((city, index) => (
              <div
                key={index}
                onClick={() => onNavigateToProperties && onNavigateToProperties(city.name)}
                className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-gray-200">
                      <MapPin className="w-6 h-6 text-[#2ECC71]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base text-gray-900">{city.name}</h3>
                        <Badge variant="secondary" className="text-xs">{city.region}</Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {city.properties} annonces · {city.bookings} réservations · {city.activeUsers} utilisateurs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Revenus</p>
                      <p className="text-base text-gray-900">{formatCurrency(city.revenue)}</p>
                    </div>
                    <div className={`flex items-center gap-1 ${city.trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {city.trend >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                      ) : (
                        <TrendingDown className="w-4 h-4" />
                      )}
                      <span className="text-sm">{Math.abs(city.trend)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredCities.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune ville trouvée</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
