import { Activity, Smartphone, RefreshCw, Download, MapPin, Globe, Banknote } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { REVENUE_COLORS, formatCurrency } from '../../../lib/revenueMetrics';
import { supabase } from '../../../lib/supabaseClient';

export function RealtimeSection() {
  const [activeUsers, setActiveUsers] = useState(0);
  const [activeVisitors, setActiveVisitors] = useState(0);
  const [totalActive, setTotalActive] = useState(0);
  const [devices, setDevices] = useState({ android: 0, ios: 0 });
  const [chartData, setChartData] = useState<{ time: string; users: number; visitors: number; total: number }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLoaded, setIsLoaded] = useState(false);
  const [gmvToday, setGmvToday] = useState(0);
  const [caToday, setCaToday] = useState(0);

  // Initialize chart with last 5 minutes
  useEffect(() => {
    const now = new Date();
    const initialData: { time: string; users: number; visitors: number; total: number }[] = [];
    for (let i = 4; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000);
      const users = Math.floor(Math.random() * 20) + 5;
      const visitors = Math.floor(Math.random() * 30) + 10;
      initialData.push({
        time: time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        users,
        visitors,
        total: users + visitors,
      });
    }
    setChartData(initialData);
  }, []);

  // Fetch and subscribe to realtime data from Supabase
  useEffect(() => {
    if (!supabase) {
      console.warn('[RealtimeSection] Supabase client not configured');
      return;
    }

    // Fonction pour récupérer GMV et CA d'aujourd'hui (minuit à minuit)
    const fetchTodayRevenue = async () => {
      try {
        const today = new Date();
        // Minuit d'aujourd'hui (UTC)
        const startOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0)).toISOString();
        // Minuit de demain (UTC)
        const endOfDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + 1, 0, 0, 0)).toISOString();

        console.log('[RealtimeSection] Fetching revenue for:', { startOfDay, endOfDay });

        // Récupérer les paiements d'aujourd'hui
        const [paymentsRes, earningsRes, visitPaymentsRes] = await Promise.all([
          (supabase as any)
            .from('payments')
            .select('amount')
            .gte('created_at', startOfDay)
            .lt('created_at', endOfDay),
          (supabase as any)
            .from('host_earnings')
            .select('platform_fee')
            .gte('created_at', startOfDay)
            .lt('created_at', endOfDay),
          (supabase as any)
            .from('payments')
            .select('amount')
            .eq('purpose', 'visit')
            .gte('created_at', startOfDay)
            .lt('created_at', endOfDay),
        ]);

        console.log('[RealtimeSection] Raw data:', {
          payments: paymentsRes.data?.length,
          earnings: earningsRes.data?.length,
          visits: visitPaymentsRes.data?.length,
          paymentsError: paymentsRes.error,
          earningsError: earningsRes.error,
          visitsError: visitPaymentsRes.error
        });

        // Calculer GMV = somme de tous les amounts
        const gmv = (paymentsRes.data || []).reduce((acc: number, row: any) => acc + (row.amount ?? 0), 0);

        // Calculer CA = platform_fee + visit amounts
        const reservationRevenue = (earningsRes.data || []).reduce((acc: number, row: any) => acc + (row.platform_fee ?? 0), 0);
        const visitRevenue = (visitPaymentsRes.data || []).reduce((acc: number, row: any) => acc + (row.amount ?? 0), 0);
        const ca = reservationRevenue + visitRevenue;

        console.log('[RealtimeSection] Today revenue calculated:', { gmv, ca, reservationRevenue, visitRevenue });

        setGmvToday(gmv);
        setCaToday(ca);
      } catch (err) {
        console.error('[RealtimeSection] Error fetching today revenue:', err);
      }
    };

    // Fonction pour calculer et mettre à jour les stats
    const updateStats = (usersData: any[], visitorsData: any[]) => {
      try {
        // Récupérer les utilisateurs actifs des 2 dernières minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        
        // Filtrer les utilisateurs connectés actifs
        const activeUsersData = usersData.filter((u: any) => u.last_activity_at >= twoMinutesAgo);
        const totalUsers = activeUsersData.length;

        // Filtrer les visiteurs actifs (non-merged uniquement)
        const activeVisitorsData = visitorsData.filter((v: any) => 
          v.last_activity_at >= twoMinutesAgo && v.merged_at === null
        );
        const totalVisitors = activeVisitorsData.length;

        const totalCombined = totalUsers + totalVisitors;

        // Calculer les plateformes pour les utilisateurs connectés ET les visiteurs
        const allActiveData = [...activeUsersData, ...activeVisitorsData];
        const androidUsers = allActiveData.filter((d: any) => d.platform === 'android').length;
        const iosUsers = allActiveData.filter((d: any) => d.platform === 'ios').length;

        console.log('[RealtimeSection] Combined stats (last 2 min):', { 
          totalUsers, 
          totalVisitors,
          totalCombined,
          androidUsers, 
          iosUsers,
          threshold: twoMinutesAgo,
          activeUsers: activeUsersData.map((u: any) => ({ id: u.user_id, platform: u.platform, lastActivity: u.last_activity_at })),
          activeVisitors: activeVisitorsData.map((v: any) => ({ id: v.visitor_id, platform: v.platform, lastActivity: v.last_activity_at }))
        });

        setActiveUsers(totalUsers);
        setActiveVisitors(totalVisitors);
        setTotalActive(totalCombined);
        setDevices({ android: androidUsers, ios: iosUsers });

        // Mettre à jour le graphique
        setChartData(prev => {
          const now = new Date();
          const newPoint = {
            time: now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
            users: totalUsers,
            visitors: totalVisitors,
            total: totalCombined,
          };
          return [...prev.slice(-4), newPoint];
        });

        setLastUpdate(new Date());
      } catch (err) {
        console.error('[RealtimeSection] Error updating stats:', err);
      }
    };

    // Charger les données initiales
    const loadInitialData = async () => {
      try {
        // Récupérer les heartbeats des utilisateurs connectés
        const { data: userHeartbeats, error: userError } = await (supabase as any)
          .from('user_activity_heartbeat')
          .select('user_id, platform, last_activity_at, city');

        // Récupérer les heartbeats des visiteurs anonymes
        const { data: visitorHeartbeats, error: visitorError } = await (supabase as any)
          .from('visitor_activity_heartbeat')
          .select('visitor_id, platform, last_activity_at, city, merged_at');

        if (userError) {
          console.error('[RealtimeSection] Error loading user heartbeats:', userError);
          return;
        }

        if (visitorError) {
          console.error('[RealtimeSection] Error loading visitor heartbeats:', visitorError);
          return;
        }

        console.log('[RealtimeSection] Data loaded:', {
          users: userHeartbeats?.length,
          visitors: visitorHeartbeats?.length,
          totalHeartbeats: (userHeartbeats?.length || 0) + (visitorHeartbeats?.length || 0)
        });
        
        updateStats(userHeartbeats || [], visitorHeartbeats || []);
        setIsLoaded(true);
      } catch (err) {
        console.error('[RealtimeSection] Error loading initial data:', err);
        setIsLoaded(true);
      }
    };

    // Charger les données initiales immédiatement
    loadInitialData();
    fetchTodayRevenue();

    // S'abonner aux changements en temps réel
    console.log('[RealtimeSection] Setting up Realtime subscription...');
    
    let userHeartbeatChannel: any = null;
    let visitorHeartbeatChannel: any = null;
    let paymentsChannel: any = null;
    let recalculateInterval: ReturnType<typeof setInterval> | null = null;

    try {
      // Écouter les changements de heartbeat des utilisateurs connectés
      userHeartbeatChannel = (supabase as any)
        .channel('user_activity_heartbeat_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_activity_heartbeat',
          },
          (_payload: any) => {
            console.log('[RealtimeSection] 👤 USER HEARTBEAT EVENT DETECTED');
            loadInitialData();
          }
        )
        .subscribe();

      // Écouter les changements de heartbeat des visiteurs anonymes
      visitorHeartbeatChannel = (supabase as any)
        .channel('visitor_activity_heartbeat_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'visitor_activity_heartbeat',
          },
          (_payload: any) => {
            console.log('[RealtimeSection] 👁️ VISITOR HEARTBEAT EVENT DETECTED');
            loadInitialData();
          }
        )
        .subscribe();

      // Écouter les changements de paiements pour GMV/CA en temps réel
      paymentsChannel = (supabase as any)
        .channel('payments_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'payments',
          },
          (payload: any) => {
            console.log('[RealtimeSection] 💰 PAYMENT EVENT DETECTED:', payload?.new);
            fetchTodayRevenue();
          }
        )
        .subscribe();

      console.log('[RealtimeSection] ✅ Realtime subscriptions created (users + visitors + payments)');

      // Ajouter un interval pour recalculer les stats toutes les 5 secondes
      recalculateInterval = setInterval(() => {
        console.log('[RealtimeSection] ⏱️ Checking for inactive users/visitors...');
        loadInitialData();
        fetchTodayRevenue();
      }, 5 * 1000); // 5 secondes

      console.log('[RealtimeSection] ✅ Inactivity check interval started (5s)');
    } catch (err) {
      console.error('[RealtimeSection] Error setting up Realtime:', err);
    }

    return () => {
      console.log('[RealtimeSection] Cleaning up...');
      if (userHeartbeatChannel) {
        (supabase as any).removeChannel(userHeartbeatChannel);
      }
      if (visitorHeartbeatChannel) {
        (supabase as any).removeChannel(visitorHeartbeatChannel);
      }
      if (paymentsChannel) {
        (supabase as any).removeChannel(paymentsChannel);
      }
      if (recalculateInterval) {
        clearInterval(recalculateInterval);
      }
    };
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleExport = () => {
    const csvContent = `user_id,platform,last_activity_at\n`;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `puol_realtime_${Date.now()}.csv`;
    a.click();
  };

  const totalDevices = devices.android + devices.ios;
  const androidPercentage = totalDevices > 0 ? (devices.android / totalDevices) * 100 : 0;
  const iosPercentage = totalDevices > 0 ? (devices.ios / totalDevices) * 100 : 0;

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

  console.log('[RealtimeSection] Rendering with state:', { activeUsers, devices, lastUpdate, isLoaded });

  if (!isLoaded) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">Chargement des données en temps réel...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  try {
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
            Utilisateurs actifs dans les 2 dernières minutes • Mise à jour en temps réel
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
      <div className="space-y-6">
        {/* Row 1: Total Active, Connected Users, Visitors, Android, iOS */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-purple-600" />
                <p className="text-sm text-gray-600">Total actif</p>
              </div>
              <p className="text-4xl text-gray-900">{totalActive}</p>
              <p className="text-xs text-gray-500 mt-2">Connectés + Visiteurs</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-[#2ECC71]" />
                <p className="text-sm text-gray-600">Utilisateurs</p>
              </div>
              <p className="text-4xl text-gray-900">{activeUsers}</p>
              <p className="text-xs text-gray-500 mt-2">Connectés</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <p className="text-sm text-gray-600">Visiteurs</p>
              </div>
              <p className="text-4xl text-gray-900">{activeVisitors}</p>
              <p className="text-xs text-gray-500 mt-2">Anonymes</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-5 h-5 text-blue-500" />
                <p className="text-sm text-gray-600">Android</p>
              </div>
              <p className="text-4xl text-gray-900">{devices.android}</p>
              <p className="text-xs text-gray-500 mt-2">{androidPercentage.toFixed(1)}% des utilisateurs</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Smartphone className="w-5 h-5 text-green-500" />
                <p className="text-sm text-gray-600">iOS</p>
              </div>
              <p className="text-4xl text-gray-900">{devices.ios}</p>
              <p className="text-xs text-gray-500 mt-2">{iosPercentage.toFixed(1)}% des utilisateurs</p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2: GMV and CA (Full Width) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className={`${REVENUE_COLORS.gmv.border} bg-gradient-to-br ${REVENUE_COLORS.gmv.bgLight} to-white`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className={`w-5 h-5 ${REVENUE_COLORS.gmv.text}`} />
                <p className="text-sm text-gray-600">GMV aujourd'hui</p>
              </div>
              <p className={`text-4xl ${REVENUE_COLORS.gmv.text}`}>{formatCurrency(gmvToday, true)}</p>
              <p className="text-xs text-gray-500 mt-2">En temps réel</p>
            </CardContent>
          </Card>

          <Card className={`${REVENUE_COLORS.revenue.border} bg-gradient-to-br ${REVENUE_COLORS.revenue.bgLight} to-white`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className={`w-5 h-5 ${REVENUE_COLORS.revenue.text}`} />
                <p className="text-sm text-gray-600">CA aujourd'hui</p>
              </div>
              <p className={`text-4xl ${REVENUE_COLORS.revenue.text}`}>{formatCurrency(caToday, true)}</p>
              <p className="text-xs text-gray-500 mt-2">En temps réel</p>
            </CardContent>
          </Card>
        </div>
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
                name="Utilisateurs connectés"
              />
              <Line 
                type="monotone" 
                dataKey="visitors" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
                name="Visiteurs anonymes"
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#A855F7" 
                strokeWidth={2}
                dot={{ fill: '#A855F7', r: 4 }}
                activeDot={{ r: 6 }}
                name="Total"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
  } catch (err) {
    console.error('[RealtimeSection] Error rendering component:', err);
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-red-600">Erreur lors du rendu de la section Temps réel</p>
            <p className="text-sm text-gray-600 mt-2">{String(err)}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
}