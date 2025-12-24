import { AlertTriangle, TrendingUp, TrendingDown, Flag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';

interface Signal {
  id: string;
  type: 'traffic' | 'conversion' | 'moderation' | 'growth';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  value: string;
  route: string;
  timestamp: Date;
}

interface SmartSignalsWidgetProps {
  onSignalClick?: (route: string) => void;
}

export function SmartSignalsWidget({ onSignalClick }: SmartSignalsWidgetProps) {
  // Mock data - TODO: remplacer par API
  const signals: Signal[] = [
    {
      id: '1',
      type: 'traffic',
      severity: 'high',
      title: 'Pic de trafic exceptionnel',
      description: 'Douala enregistre +347% de trafic vs moyenne (2h-4h)',
      value: '+347%',
      route: 'analytics?city=Douala',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
    },
    {
      id: '2',
      type: 'conversion',
      severity: 'high',
      title: 'Baisse brutale de conversion',
      description: 'Conversion globale -18% depuis hier',
      value: '-18%',
      route: 'analytics?tab=conversion',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
    },
    {
      id: '3',
      type: 'moderation',
      severity: 'medium',
      title: '8 annonces signalées',
      description: 'Signalements pour contenu inapproprié et prix suspects',
      value: '8',
      route: 'moderation?status=pending',
      timestamp: new Date(Date.now() - 1000 * 60 * 30),
    },
    {
      id: '4',
      type: 'growth',
      severity: 'low',
      title: 'Garoua en forte croissance',
      description: '+24% d\'utilisateurs actifs cette semaine',
      value: '+24%',
      route: 'cities?highlight=Garoua',
      timestamp: new Date(Date.now() - 1000 * 60 * 180),
    },
  ];

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'traffic':
        return <TrendingUp className="w-4 h-4" />;
      case 'conversion':
        return <TrendingDown className="w-4 h-4" />;
      case 'moderation':
        return <Flag className="w-4 h-4" />;
      case 'growth':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'border-red-200 bg-red-50 hover:bg-red-100';
      case 'medium':
        return 'border-orange-200 bg-orange-50 hover:bg-orange-100';
      case 'low':
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
      default:
        return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high':
        return <Badge variant="destructive" className="text-xs">Urgent</Badge>;
      case 'medium':
        return <Badge className="text-xs bg-orange-500">Moyen</Badge>;
      case 'low':
        return <Badge variant="secondary" className="text-xs">Info</Badge>;
      default:
        return null;
    }
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `Il y a ${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Il y a ${minutes}min`;
    const hours = Math.floor(minutes / 60);
    return `Il y a ${hours}h`;
  };

  return (
    <Card className="border-red-200 bg-gradient-to-br from-red-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Signaux & Alertes
            <Badge variant="destructive" className="ml-2">
              {signals.filter(s => s.severity === 'high').length} urgents
            </Badge>
          </CardTitle>
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {signals.map((signal) => (
            <div
              key={signal.id}
              onClick={() => onSignalClick && onSignalClick(signal.route)}
              className={`group p-4 rounded-xl border transition-all cursor-pointer ${getSeverityColor(signal.severity)}`}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  ${signal.severity === 'high' ? 'bg-red-200 text-red-700' : ''}
                  ${signal.severity === 'medium' ? 'bg-orange-200 text-orange-700' : ''}
                  ${signal.severity === 'low' ? 'bg-blue-200 text-blue-700' : ''}
                `}>
                  {getSignalIcon(signal.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm text-gray-900">{signal.title}</h4>
                    {getSeverityBadge(signal.severity)}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{signal.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{getTimeAgo(signal.timestamp)}</span>
                    <Badge className="text-xs bg-white">{signal.value}</Badge>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 p-3 bg-red-100 rounded-lg border border-red-200">
          <p className="text-xs text-red-900">
            <strong>⚠️ Important :</strong> Les signaux sont détectés automatiquement et mis à jour en temps réel
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
