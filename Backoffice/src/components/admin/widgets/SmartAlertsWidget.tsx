import { 
  AlertTriangle, 
  TrendingUp, 
  Flag, 
  Home, 
  ExternalLink,
  Bell,
  Clock,
  Users
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';

interface SmartAlert {
  id: string;
  type: 'traffic' | 'moderation' | 'host' | 'performance' | 'system';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  timestamp: Date;
  actionLabel: string;
}

interface SmartAlertsWidgetProps {
  onAlertClick?: (route: string) => void;
}

export function SmartAlertsWidget({ onAlertClick }: SmartAlertsWidgetProps) {
  // Mock data - TODO: remplacer par API (temps réel)
  const alerts: SmartAlert[] = [
    {
      id: '1',
      type: 'traffic',
      severity: 'high',
      title: 'Pic de trafic à Douala',
      description: '+347% de visiteurs vs moyenne (2h-4h)',
      icon: <TrendingUp className="w-4 h-4" />,
      route: 'analytics?city=Douala',
      timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 min ago
      actionLabel: 'Voir analytics',
    },
    {
      id: '2',
      type: 'moderation',
      severity: 'high',
      title: '8 annonces signalées',
      description: 'Contenu inapproprié, prix suspects',
      icon: <Flag className="w-4 h-4" />,
      route: 'moderation?status=pending',
      timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
      actionLabel: 'Modérer',
    },
    {
      id: '3',
      type: 'host',
      severity: 'medium',
      title: 'Hôte avec 12 annonces actives',
      description: 'Marie K. (nouveau compte, vérification requise)',
      icon: <Home className="w-4 h-4" />,
      route: 'users?id=marie-k&tab=properties',
      timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2h ago
      actionLabel: 'Vérifier le compte',
    },
    {
      id: '4',
      type: 'performance',
      severity: 'medium',
      title: 'Temps de réponse élevé',
      description: 'API recherche: 3.2s (seuil: 1s)',
      icon: <Clock className="w-4 h-4" />,
      route: 'analytics?tab=performance',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
      actionLabel: 'Voir diagnostics',
    },
    {
      id: '5',
      type: 'traffic',
      severity: 'low',
      title: 'Nouvelle ville active',
      description: 'Garoua: +23 utilisateurs cette semaine',
      icon: <Users className="w-4 h-4" />,
      route: 'cities?highlight=Garoua',
      timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3h ago
      actionLabel: 'Voir détails',
    },
    {
      id: '6',
      type: 'system',
      severity: 'low',
      title: 'Mise à jour disponible',
      description: 'Dashboard v2.4.0 (correctifs sécurité)',
      icon: <Bell className="w-4 h-4" />,
      route: 'settings?tab=updates',
      timestamp: new Date(Date.now() - 1000 * 60 * 240), // 4h ago
      actionLabel: 'Installer',
    },
  ];

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
    <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Alertes intelligentes
            <Badge variant="secondary" className="text-xs ml-2">
              {alerts.filter(a => a.severity === 'high').length} urgentes
            </Badge>
          </CardTitle>
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              onClick={() => onAlertClick && onAlertClick(alert.route)}
              className={`group p-4 rounded-xl border transition-all cursor-pointer ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
                  ${alert.severity === 'high' ? 'bg-red-200 text-red-700' : ''}
                  ${alert.severity === 'medium' ? 'bg-orange-200 text-orange-700' : ''}
                  ${alert.severity === 'low' ? 'bg-blue-200 text-blue-700' : ''}
                `}>
                  {alert.icon}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm text-gray-900">{alert.title}</h4>
                    {getSeverityBadge(alert.severity)}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{alert.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{getTimeAgo(alert.timestamp)}</span>
                    <div className="flex items-center gap-1 text-xs text-[#2ECC71] group-hover:underline">
                      {alert.actionLabel}
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-orange-200">
          <p className="text-xs text-gray-600 text-center">
            Les alertes sont mises à jour toutes les 5 minutes
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
