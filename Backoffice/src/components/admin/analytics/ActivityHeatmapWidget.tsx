import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';

interface ActivityHeatmapWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
}

export function ActivityHeatmapWidget({ dateRange, isLoading }: ActivityHeatmapWidgetProps) {
  // Mock data - TODO: remplacer par API
  // Intensity: 0-100
  const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const hours = ['00h', '04h', '08h', '12h', '16h', '20h'];
  
  // Heatmap data: [day][hour] = intensity
  const heatmapData = [
    [5, 8, 25, 45, 68, 85],   // Lun
    [4, 7, 28, 48, 72, 88],   // Mar
    [6, 9, 30, 52, 75, 90],   // Mer
    [5, 8, 27, 50, 70, 87],   // Jeu
    [7, 10, 32, 55, 78, 92],  // Ven
    [15, 28, 45, 62, 80, 95], // Sam
    [18, 32, 48, 65, 82, 92], // Dim
  ];

  const getIntensityColor = (intensity: number) => {
    if (intensity >= 80) return 'bg-[#2ECC71]';
    if (intensity >= 60) return 'bg-green-400';
    if (intensity >= 40) return 'bg-yellow-400';
    if (intensity >= 20) return 'bg-orange-300';
    if (intensity >= 10) return 'bg-gray-300';
    return 'bg-gray-100';
  };

  const peakActivity = {
    day: 'Samedi',
    hour: '20h-23h',
    intensity: 95,
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Heatmap d'activité (heures & jours)
          </CardTitle>
          <Badge className="bg-indigo-600">
            Pic : {peakActivity.day} {peakActivity.hour}
          </Badge>
        </div>
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
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              {/* Hours labels */}
              <div className="flex mb-2">
                <div className="w-12"></div>
                <div className="flex-1 grid grid-cols-6 gap-2">
                  {hours.map((hour, index) => (
                    <div key={index} className="text-center text-xs text-gray-500">
                      {hour}
                    </div>
                  ))}
                </div>
              </div>

              {/* Heatmap grid */}
              <div className="space-y-2">
                {days.map((day, dayIndex) => (
                  <div key={dayIndex} className="flex items-center gap-2">
                    <div className="w-12 text-xs text-gray-600">{day}</div>
                    <div className="flex-1 grid grid-cols-6 gap-2">
                      {heatmapData[dayIndex].map((intensity, hourIndex) => (
                        <div
                          key={hourIndex}
                          className={`h-10 rounded-lg ${getIntensityColor(intensity)} hover:ring-2 hover:ring-indigo-400 transition-all cursor-pointer group relative`}
                          title={`${day} ${hours[hourIndex]} - ${intensity}% activité`}
                        >
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-gray-900 font-medium">{intensity}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-6 flex items-center justify-center gap-6">
                <span className="text-xs text-gray-500">Faible</span>
                <div className="flex gap-1">
                  <div className="w-6 h-6 rounded bg-gray-100"></div>
                  <div className="w-6 h-6 rounded bg-gray-300"></div>
                  <div className="w-6 h-6 rounded bg-orange-300"></div>
                  <div className="w-6 h-6 rounded bg-yellow-400"></div>
                  <div className="w-6 h-6 rounded bg-green-400"></div>
                  <div className="w-6 h-6 rounded bg-[#2ECC71]"></div>
                </div>
                <span className="text-xs text-gray-500">Forte</span>
              </div>
            </div>

            {/* Insights */}
            <div className="mt-4 p-4 bg-indigo-100 rounded-xl border border-indigo-200">
              <p className="text-sm text-indigo-900 mb-2">
                <strong>💡 Insight :</strong> Les utilisateurs sont les plus actifs le soir entre 19h et 23h,
                avec un pic d'activité le weekend.
              </p>
              <p className="text-xs text-indigo-800">
                Période optimale pour lancer des campagnes : Vendredi-Samedi 19h-21h
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
