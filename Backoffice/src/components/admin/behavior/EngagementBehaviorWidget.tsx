import { Clock, Activity, Eye, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';

interface EngagementBehaviorWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
}

export function EngagementBehaviorWidget({ dateRange, isLoading }: EngagementBehaviorWidgetProps) {
  // Mock data - TODO: remplacer par API
  const sessionTime = {
    average: 284, // seconds
    previous: 256,
    change: 10.9,
  };

  const sessionsPerUser = {
    perDay: 2.4,
    perDayPrevious: 2.1,
    perWeek: 11.2,
    perWeekPrevious: 12.1,
    perMonth: 42.8,
    perMonthPrevious: 39.4,
  };

  const scrollDepth = [
    { depth: '0-25%', percentage: 100, users: 15847 },
    { depth: '25-50%', percentage: 68.3, users: 10823 },
    { depth: '50-75%', percentage: 42.5, users: 6735 },
    { depth: '75-100%', percentage: 18.7, users: 2963 },
  ];

  const eventsPerSession = {
    total: 12.4,
    previous: 11.2,
    breakdown: [
      { label: 'Vues d\'annonces', value: 5.2, icon: '👁️' },
      { label: 'Clics', value: 3.8, icon: '👆' },
      { label: 'Likes/Favoris', value: 1.4, icon: '❤️' },
      { label: 'Messages', value: 0.8, icon: '💬' },
      { label: 'Demandes de visite', value: 0.6, icon: '📅' },
      { label: 'Filtrages/Recherches', value: 0.6, icon: '🔍' },
    ],
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}min ${remainingSeconds}s`;
  };

  const calculateChange = (current: number, previous: number) => {
    const diff = ((current - previous) / previous) * 100;
    return { value: Math.abs(diff), isPositive: diff >= 0 };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* A. Temps moyen par session */}
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Temps moyen par session
          </CardTitle>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-32 bg-gray-200 rounded-xl"></div>
              <div className="h-24 bg-gray-200 rounded-xl"></div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-6 border border-gray-100 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Durée moyenne</p>
                    <p className="text-5xl text-blue-600">{formatTime(sessionTime.average)}</p>
                  </div>
                  <Badge 
                    variant={calculateChange(sessionTime.average, sessionTime.previous).isPositive ? 'default' : 'destructive'}
                    className={calculateChange(sessionTime.average, sessionTime.previous).isPositive ? 'bg-green-600' : ''}
                  >
                    {calculateChange(sessionTime.average, sessionTime.previous).isPositive ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {sessionTime.change.toFixed(1)}%
                  </Badge>
                </div>
              </div>

              {/* Histogramme */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-600 mb-3">Répartition des sessions</p>
                <div className="space-y-2">
                  {['0-30s', '30-60s', '1-3min', '3-5min', '5min+'].map((range, index) => {
                    const values = [12, 18, 35, 22, 13];
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-16">{range}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                            style={{ width: `${values[index] * 2.5}%` }}
                          >
                            <span className="text-xs text-white">{values[index]}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* B. Nombre moyen de sessions par utilisateur */}
      <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Sessions par utilisateur
          </CardTitle>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Par jour */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-600">Sessions / jour</p>
                  <Badge variant={sessionsPerUser.perDay > sessionsPerUser.perDayPrevious ? 'default' : 'secondary'} className={sessionsPerUser.perDay > sessionsPerUser.perDayPrevious ? 'bg-green-600' : 'bg-gray-500'}>
                    {sessionsPerUser.perDay > sessionsPerUser.perDayPrevious ? '↑' : '↓'} {calculateChange(sessionsPerUser.perDay, sessionsPerUser.perDayPrevious).value.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-3xl text-purple-600">{sessionsPerUser.perDay.toFixed(1)}</p>
              </div>

              {/* Par semaine */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-600">Sessions / semaine</p>
                  <Badge variant={sessionsPerUser.perWeek > sessionsPerUser.perWeekPrevious ? 'default' : 'secondary'} className={sessionsPerUser.perWeek > sessionsPerUser.perWeekPrevious ? 'bg-green-600' : 'bg-red-500'}>
                    {sessionsPerUser.perWeek > sessionsPerUser.perWeekPrevious ? '↑' : '↓'} {calculateChange(sessionsPerUser.perWeek, sessionsPerUser.perWeekPrevious).value.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-3xl text-purple-600">{sessionsPerUser.perWeek.toFixed(1)}</p>
              </div>

              {/* Par mois */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-gray-600">Sessions / mois</p>
                  <Badge variant={sessionsPerUser.perMonth > sessionsPerUser.perMonthPrevious ? 'default' : 'secondary'} className={sessionsPerUser.perMonth > sessionsPerUser.perMonthPrevious ? 'bg-green-600' : 'bg-gray-500'}>
                    {sessionsPerUser.perMonth > sessionsPerUser.perMonthPrevious ? '↑' : '↓'} {calculateChange(sessionsPerUser.perMonth, sessionsPerUser.perMonthPrevious).value.toFixed(1)}%
                  </Badge>
                </div>
                <p className="text-3xl text-purple-600">{sessionsPerUser.perMonth.toFixed(1)}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* C. Profondeur de scroll */}
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#2ECC71]" />
            Profondeur de scroll du feed
          </CardTitle>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-64 bg-gray-200 rounded-xl"></div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl p-4 border border-gray-100 mb-4">
                <div className="space-y-4">
                  {scrollDepth.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700">{item.depth}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900">{item.users.toLocaleString()} users</span>
                          <Badge variant="secondary">{item.percentage.toFixed(1)}%</Badge>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-[#2ECC71] h-3 rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-green-100 rounded-lg border border-green-200">
                <p className="text-xs text-green-900">
                  <strong>💡 Insight :</strong> 42.5% des utilisateurs scrollent au-delà de la moitié du feed, 
                  indiquant un bon engagement avec le contenu.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* D. Événements par session */}
      <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            Événements par session
          </CardTitle>
          {dateRange && (
            <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          ) : (
            <>
              {/* Total */}
              <div className="bg-white rounded-xl p-6 border border-gray-100 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Moyenne d'actions par session</p>
                    <p className="text-5xl text-orange-600">{eventsPerSession.total.toFixed(1)}</p>
                  </div>
                  <Badge className="bg-green-600">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    +{calculateChange(eventsPerSession.total, eventsPerSession.previous).value.toFixed(1)}%
                  </Badge>
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-600 mb-3">Détail par type d'action</p>
                <div className="space-y-3">
                  {eventsPerSession.breakdown.map((event, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="text-xl">{event.icon}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-700">{event.label}</span>
                          <span className="text-sm text-gray-900">{event.value.toFixed(1)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-orange-600 h-2 rounded-full"
                            style={{ width: `${(event.value / eventsPerSession.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
