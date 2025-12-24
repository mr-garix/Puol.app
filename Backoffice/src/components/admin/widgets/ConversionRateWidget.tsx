import { TrendingUp, TrendingDown, Target, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../ui/tooltip';

interface ConversionMetric {
  label: string;
  value: number;
  previousValue: number;
  description: string;
  color: string;
}

interface ConversionRateWidgetProps {
  dateRange?: { label: string };
}

export function ConversionRateWidget({ dateRange }: ConversionRateWidgetProps) {
  // Mock data - TODO: remplacer par API
  // Données Cameroun uniquement, 100% mobile (Android/iOS/PWA)
  const sessions = 12847;
  const previousSessions = 11234;
  
  const conversions: ConversionMetric[] = [
    {
      label: 'Conversion globale',
      value: 3.54, // (456 réservations / 12847 sessions) × 100
      previousValue: 3.18,
      description: 'Réservations confirmées ÷ Sessions utilisateurs × 100',
      color: 'text-[#2ECC71]',
    },
    {
      label: 'Conversion inscription',
      value: 2.64, // (339 inscriptions / 12847 sessions) × 100
      previousValue: 2.49,
      description: 'Inscriptions ÷ Sessions × 100',
      color: 'text-blue-600',
    },
    {
      label: 'Conversion annonce publiée',
      value: 1.87, // (24 annonces / 1284 sessions hôtes) × 100
      previousValue: 1.62,
      description: 'Annonces publiées ÷ Sessions hôtes × 100',
      color: 'text-purple-600',
    },
  ];

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: true, percentage: 0 };
    const diff = current - previous;
    const percentage = (diff / previous) * 100;
    return { 
      value: Math.abs(diff), 
      isPositive: diff >= 0,
      percentage: Math.abs(percentage)
    };
  };

  return (
    <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-[#2ECC71]" />
            Taux de conversion
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              🇨🇲 Cameroun
            </Badge>
            <Badge variant="secondary" className="text-xs">
              📱 100% Mobile
            </Badge>
          </div>
        </div>
        {dateRange && (
          <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {conversions.map((conversion, index) => {
            const change = calculateChange(conversion.value, conversion.previousValue);
            return (
              <div key={index} className="bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm text-gray-700">{conversion.label}</h4>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">{conversion.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                
                <div className="flex items-end justify-between">
                  <div>
                    <p className={`text-3xl ${conversion.color} mb-1`}>
                      {conversion.value.toFixed(2)}%
                    </p>
                    <div className="flex items-center gap-2 text-xs">
                      {change.isPositive ? (
                        <TrendingUp className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-red-600" />
                      )}
                      <span className={change.isPositive ? 'text-green-600' : 'text-red-600'}>
                        {change.isPositive ? '+' : '-'}{change.value.toFixed(2)}%
                      </span>
                      <span className="text-gray-500">
                        ({change.isPositive ? '+' : ''}{change.percentage.toFixed(1)}% vs période précédente)
                      </span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Période actuelle</p>
                    <p className="text-sm text-gray-700">{conversion.value.toFixed(2)}%</p>
                    <p className="text-xs text-gray-400 mt-1">Précédente: {conversion.previousValue.toFixed(2)}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-900">
            <strong>Note :</strong> Sessions totales : {sessions.toLocaleString()} 
            ({((sessions - previousSessions) / previousSessions * 100) >= 0 ? '+' : ''}{((sessions - previousSessions) / previousSessions * 100).toFixed(1)}% vs période précédente)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}