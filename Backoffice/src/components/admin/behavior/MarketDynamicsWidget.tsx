import { TrendingUp, Clock, Target, BarChart3, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';

interface MarketDynamicsWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
}

export function MarketDynamicsWidget({ dateRange, isLoading }: MarketDynamicsWidgetProps) {
  // Mock data - TODO: remplacer par API
  
  // Prix moyen par ville
  const pricesByCity = [
    { city: 'Douala - Bonapriso', avgPrice: 285000, trend: 8.3, expensive: true },
    { city: 'Yaoundé - Bastos', avgPrice: 265000, trend: 6.2, expensive: true },
    { city: 'Douala - Akwa', avgPrice: 245000, trend: 4.7, expensive: true },
    { city: 'Yaoundé - Melen', avgPrice: 135000, trend: -2.1, expensive: false },
    { city: 'Bafoussam - Centre', avgPrice: 95000, trend: 3.4, expensive: false },
  ];

  // Disponibilité moyenne
  const availability = {
    averageDaysAvailable: 18.4,
    highRotationCities: ['Douala', 'Yaoundé'],
    lowRotationCities: ['Garoua', 'Bamenda'],
    hotZones: [
      { zone: 'Bonapriso', status: 'hot', daysAvailable: 8.2 },
      { zone: 'Akwa', status: 'hot', daysAvailable: 9.7 },
      { zone: 'Bastos', status: 'warm', daysAvailable: 14.3 },
      { zone: 'Melen', status: 'warm', daysAvailable: 22.8 },
    ],
  };

  // Vitesse de réservation
  const bookingSpeed = [
    { city: 'Douala', avgDays: 6.2, demand: 'high' },
    { city: 'Yaoundé', avgDays: 8.7, demand: 'high' },
    { city: 'Bafoussam', avgDays: 14.3, demand: 'medium' },
    { city: 'Garoua', avgDays: 21.6, demand: 'low' },
  ];

  // Opportunity Score (Demande vs Offre)
  const opportunityScores = [
    { city: 'Garoua', score: 87, searches: 2847, listings: 42, status: 'high-opportunity' },
    { city: 'Bamenda', score: 72, searches: 1923, listings: 38, status: 'high-opportunity' },
    { city: 'Bafoussam', score: 58, searches: 4123, listings: 124, status: 'medium-opportunity' },
    { city: 'Yaoundé', score: 34, searches: 14567, listings: 856, status: 'balanced' },
    { city: 'Douala', score: 28, searches: 18234, listings: 1247, status: 'balanced' },
  ];

  // Tendances et prévisions
  const trends = {
    growingCities: ['Garoua', 'Bamenda'],
    decliningCities: [],
    seasonality: 'Pic d\'activité attendu en décembre-janvier',
    nextMonthPrediction: { city: 'Garoua', expectedGrowth: 32 },
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
    }).format(value) + ' FCFA';
  };

  const getZoneColor = (status: string) => {
    if (status === 'hot') return 'bg-red-100 text-red-700 border-red-200';
    if (status === 'warm') return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getDemandColor = (demand: string) => {
    if (demand === 'high') return 'text-green-600';
    if (demand === 'medium') return 'text-orange-600';
    return 'text-red-600';
  };

  const getOpportunityColor = (status: string) => {
    if (status === 'high-opportunity') return 'bg-green-100 text-green-700 border-green-200';
    if (status === 'medium-opportunity') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Prix moyen par ville */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Prix moyen par ville/quartier
          </CardTitle>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {pricesByCity.map((item, index) => (
                <div key={index} className="bg-white rounded-xl p-4 border border-gray-100 hover:border-blue-400 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <div>
                        <h4 className="text-sm text-gray-900">{item.city}</h4>
                        <p className="text-xs text-gray-500">
                          {item.expensive ? '💰 Zone premium' : '💵 Zone abordable'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl text-blue-600">{formatCurrency(item.avgPrice)}</p>
                      <Badge variant={item.trend >= 0 ? 'default' : 'destructive'} className={item.trend >= 0 ? 'bg-green-600' : ''}>
                        {item.trend >= 0 ? '↑' : '↓'} {Math.abs(item.trend).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Disponibilité + Vitesse de réservation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Disponibilité */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-purple-600" />
              Disponibilité des annonces
            </CardTitle>
            {dateRange && (
              <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-24 bg-gray-200 rounded-xl"></div>
                <div className="h-32 bg-gray-200 rounded-xl"></div>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
                  <p className="text-xs text-gray-600 mb-1">Durée moyenne disponible</p>
                  <p className="text-4xl text-purple-600">{availability.averageDaysAvailable} jours</p>
                </div>

                <div className="space-y-2">
                  {availability.hotZones.map((zone, index) => (
                    <div key={index} className={`rounded-xl p-3 border ${getZoneColor(zone.status)}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm">{zone.zone}</h4>
                          <p className="text-xs opacity-70">
                            {zone.status === 'hot' ? '🔥 Zone chaude' : '🌡️ Zone tiède'}
                          </p>
                        </div>
                        <p className="text-xl">{zone.daysAvailable.toFixed(1)}j</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Vitesse de réservation */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[#2ECC71]" />
              Vitesse de réservation
            </CardTitle>
            {dateRange && (
              <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {bookingSpeed.map((item, index) => (
                  <div key={index} className="bg-white rounded-xl p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm text-gray-900">{item.city}</h4>
                      <Badge variant="secondary" className={getDemandColor(item.demand)}>
                        {item.demand === 'high' ? '🔥 Forte' : item.demand === 'medium' ? '📊 Moyenne' : '❄️ Faible'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-600">Temps moyen de réservation</p>
                      <p className="text-xl text-[#2ECC71]">{item.avgDays.toFixed(1)} jours</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Opportunity Score */}
      <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-yellow-600" />
            Demande vs Offre (Opportunity Score)
          </CardTitle>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">{dateRange.label} • Score calculé : Recherches ÷ Annonces × 100</p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {opportunityScores.map((item, index) => (
                <div key={index} className={`rounded-xl p-4 border ${getOpportunityColor(item.status)}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-sm mb-1">{item.city}</h4>
                      <div className="flex items-center gap-3 text-xs opacity-80">
                        <span>🔍 {item.searches.toLocaleString()} recherches</span>
                        <span>•</span>
                        <span>🏠 {item.listings} annonces</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl mb-1">{item.score}</p>
                      <p className="text-xs opacity-70">
                        {item.status === 'high-opportunity' ? '🎯 Forte opportunité' : 
                         item.status === 'medium-opportunity' ? '📊 Opportunité moyenne' : 
                         '⚖️ Équilibré'}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-white/50 rounded-full h-2">
                    <div
                      className="h-2 rounded-full"
                      style={{ 
                        width: `${Math.min(item.score, 100)}%`,
                        backgroundColor: item.score >= 70 ? '#16a34a' : item.score >= 50 ? '#ea580c' : '#6b7280'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prévisions & Tendances */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            Prévisions & Tendances
          </CardTitle>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">Basé sur l'analyse des données historiques</p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Villes en croissance */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-600 mb-2">🚀 Villes en forte croissance</p>
                <div className="flex gap-2">
                  {trends.growingCities.map((city, index) => (
                    <Badge key={index} className="bg-green-600">{city}</Badge>
                  ))}
                </div>
              </div>

              {/* Saisonnalité */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-600 mb-2">📅 Saisonnalité</p>
                <p className="text-sm text-gray-900">{trends.seasonality}</p>
              </div>

              {/* Prévision mois prochain */}
              <div className="bg-indigo-100 rounded-xl p-4 border border-indigo-200">
                <p className="text-xs text-indigo-700 mb-2">🔮 Prévision mois prochain</p>
                <p className="text-sm text-indigo-900">
                  <strong>{trends.nextMonthPrediction.city}</strong> devrait connaître une croissance de{' '}
                  <strong>+{trends.nextMonthPrediction.expectedGrowth}%</strong> du trafic
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
