import { Activity, Users, Smartphone, TrendingUp, Clock, ChevronRight, RefreshCw, Download, Monitor, MapPin, Globe, DollarSign, Banknote } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { REVENUE_COLORS, formatCurrency } from '../../../lib/revenueMetrics';
import { UNIFIED_REALTIME_24H, UNIFIED_CITIES } from '../../../lib/mockDataUnified';

type TimePeriod = 'now' | '5min' | '15min' | 'custom';

export function RealtimeSection() {
  const [period, setPeriod] = useState<TimePeriod>('now');
  const [activeUsers, setActiveUsers] = useState(0);
  const [devices, setDevices] = useState({ mobile: 0, desktop: 0 });
  const [chartData, setChartData] = useState<{ time: string; users: number }[]>([]);
  const [events, setEvents] = useState<{ type: string; user: string; action: string; time: string }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Initialize chart with last 5 minutes
  useEffect(() => {
    const now = new Date();
    const initialData: { time: string; users: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000);
      initialData.push({
        time: time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        users: Math.floor(Math.random() * 30) + 10,
      });
    }
    setChartData(initialData);
  }, []);

  // Mock realtime updates
  useEffect(() => {
    const updateRealtimeData = () => {
      // Update active users
      const newActiveUsers = Math.floor(Math.random() * 50) + 20;
      setActiveUsers(newActiveUsers);

      // Update chart data
      setChartData(prev => {
        const now = new Date();
        const newPoint = {
          time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
          users: newActiveUsers,
        };
        return [...prev.slice(-4), newPoint];
      });

      // Update devices - Filtrer uniquement mobile (Android, iOS)
      const mobile = Math.floor(Math.random() * 45) + 15;
      setDevices({ mobile, desktop: 0 });

      // Add new event
      const mockActions = ['viewed', 'clicked', 'searched', 'booked'];
      const mockUsers = ['User1', 'User2', 'User3', 'User4', 'User5'];
      const newEvent = {
        type: mockActions[Math.floor(Math.random() * mockActions.length)],
        user: mockUsers[Math.floor(Math.random() * mockUsers.length)],
        action: 'property',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      setEvents(prev => [newEvent, ...prev.slice(0, 19)]);
      setLastUpdate(new Date());
    };

    updateRealtimeData();
    const interval = setInterval(updateRealtimeData, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExport = () => {
    const csvContent = events.map(e => 
      `${e.time},${e.user},${e.type},${e.action}`
    ).join('\n');
    const blob = new Blob([`Time,User,Type,Action\n${csvContent}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `puol_realtime_${Date.now()}.csv`;
    a.click();
  };

  const totalDevices = devices.mobile + devices.desktop;
  const mobilePercentage = totalDevices > 0 ? (devices.mobile / totalDevices) * 100 : 0;

  // Mock data for top pages
  const topPages = [
    { path: '/properties', users: 15 },
    { path: '/property/123', users: 10 },
    { path: '/search', users: 8 },
    { path: '/profile', users: 5 },
    { path: '/messages', users: 4 },
  ];

  // Mock data for top cities (Cameroun uniquement)
  const topCities = [
    { city: 'Douala', country: 'Cameroun', users: 12 },
    { city: 'Yaoundé', country: 'Cameroun', users: 10 },
    { city: 'Bafoussam', country: 'Cameroun', users: 6 },
    { city: 'Bamenda', country: 'Cameroun', users: 4 },
    { city: 'Garoua', country: 'Cameroun', users: 3 },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl text-gray-900">Temps réel</h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-green-100 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-700">En direct</span>
            </div>
          </div>
          <p className="text-gray-500 mt-1">
            Activité des utilisateurs en temps réel • Mise à jour toutes les 5 secondes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-500">
            Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="rounded-xl"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-[#2ECC71]" />
              <p className="text-sm text-gray-600">Utilisateurs actifs</p>
            </div>
            <p className="text-4xl text-gray-900">{activeUsers}</p>
            <p className="text-xs text-gray-500 mt-2">En ligne maintenant</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              <p className="text-sm text-gray-600">Mobile uniquement</p>
            </div>
            <p className="text-4xl text-gray-900">{devices.mobile}</p>
            <p className="text-xs text-gray-500 mt-2">Android, iOS, PWA</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-purple-500" />
              <p className="text-sm text-gray-600">Période</p>
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              <Button
                variant={period === 'now' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('now')}
                className="rounded-xl text-xs"
              >
                Maintenant
              </Button>
              <Button
                variant={period === '5min' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('5min')}
                className="rounded-xl text-xs"
              >
                5 min
              </Button>
              <Button
                variant={period === '15min' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod('15min')}
                className="rounded-xl text-xs"
              >
                15 min
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GMV & Revenue temps réel (dernières 24h) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={`${REVENUE_COLORS.gmv.border} bg-gradient-to-br ${REVENUE_COLORS.gmv.bgLight} to-white`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`w-5 h-5 ${REVENUE_COLORS.gmv.text}`} />
              <p className="text-sm text-gray-600">GMV dernières 24h</p>
            </div>
            <p className={`text-4xl ${REVENUE_COLORS.gmv.text}`}>
              {formatCurrency(847000, true)}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">+12.3%</span>
              </div>
              <p className="text-xs text-gray-500">vs 24h précédentes</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">Montant total payé par les utilisateurs</p>
          </CardContent>
        </Card>

        <Card className={`${REVENUE_COLORS.revenue.border} bg-gradient-to-br ${REVENUE_COLORS.revenue.bgLight} to-white`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-2">
              <Banknote className={`w-5 h-5 ${REVENUE_COLORS.revenue.text}`} />
              <p className="text-sm text-gray-600">CA PUOL dernières 24h</p>
            </div>
            <p className={`text-4xl ${REVENUE_COLORS.revenue.text}`}>
              {formatCurrency(152460, true)}
            </p>
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm">+15.7%</span>
              </div>
              <p className="text-xs text-gray-500">vs 24h précédentes</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">Commission + frais (Take rate: 18%)</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Activité des 5 dernières minutes</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="time" 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                stroke="#E5E7EB"
              />
              <YAxis 
                tick={{ fill: '#6B7280', fontSize: 12 }}
                stroke="#E5E7EB"
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="users" 
                stroke="#2ECC71" 
                strokeWidth={2}
                dot={{ fill: '#2ECC71', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Event Stream */}
        <Card>
          <CardHeader>
            <CardTitle>Flux d'événements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.map((event, idx) => (
                <div
                  key={`${event.time}-${idx}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${
                    event.type === 'viewed' ? 'bg-blue-100' : 'bg-purple-100'
                  }`}>
                    {event.type === 'viewed' ? (
                      <Smartphone className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Monitor className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{event.action}</p>
                    <p className="text-xs text-gray-500">
                      {event.user} • {event.time}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {event.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Stats */}
        <div className="space-y-6">
          {/* Top Pages */}
          <Card>
            <CardHeader>
              <CardTitle>Pages les plus visitées</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPages.map((page, index) => {
                  const maxUsers = Math.max(...topPages.map(p => p.users));
                  const percentage = (page.users / maxUsers) * 100;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 truncate flex-1 mr-2">{page.path}</span>
                        <Badge variant="secondary" className="text-xs">
                          {page.users}
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-[#2ECC71] h-1.5 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Cities */}
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              <CardTitle>Villes les plus actives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topCities.map((city, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-900">{city.city}</p>
                        <p className="text-xs text-gray-500">{city.country}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {city.users}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Google Analytics Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">Connexion Google Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800 mb-3">
            Les données actuelles sont simulées. Pour voir les vraies données temps réel :
          </p>
          <ul className="text-sm text-blue-800 space-y-2 mb-4">
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Configurez votre clé API Google Analytics dans les variables d'environnement</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Activez l'API Realtime Reporting dans votre projet Google Cloud</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500">•</span>
              <span>Remplacez les endpoints mockés par les appels API réels</span>
            </li>
          </ul>
          <Button variant="outline" className="rounded-xl text-blue-700 border-blue-300 hover:bg-blue-100">
            Documentation de configuration
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}