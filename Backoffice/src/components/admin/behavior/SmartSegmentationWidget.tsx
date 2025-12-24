import { Target, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import type { DateRange } from '../DateRangePicker';

interface Segment {
  id: string;
  name: string;
  description: string;
  count: number;
  growth: number;
  icon: string;
  tag: string;
  aiSuggestion?: string;
}

interface SmartSegmentationWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
  onSegmentClick?: (segment: string) => void;
}

export function SmartSegmentationWidget({ dateRange, isLoading, onSegmentClick }: SmartSegmentationWidgetProps) {
  // Mock data - TODO: remplacer par API
  const segments: Segment[] = [
    {
      id: 'night-owls',
      name: 'Actifs le soir (19h-23h)',
      description: 'Utilisateurs principalement actifs en soirée',
      count: 4234,
      growth: 14.2,
      icon: '🌙',
      tag: 'Timing',
      aiSuggestion: 'Programmer les notifications à 20h',
    },
    {
      id: 'premium-seekers',
      name: 'Focus Bonapriso/Akwa/Bastos',
      description: 'Recherchent uniquement des zones premium',
      count: 2847,
      growth: 18.7,
      icon: '💎',
      tag: 'Localisation',
      aiSuggestion: 'Pousser des annonces haut de gamme',
    },
    {
      id: 'struggling-hosts',
      name: 'Propriétaires faible taux',
      description: 'Taux de réservation < 15%',
      count: 423,
      growth: -8.3,
      icon: '📉',
      tag: 'Performance',
      aiSuggestion: 'Coaching et optimisation d\'annonces',
    },
    {
      id: 'power-users',
      name: 'Super actifs (>10 sessions/sem)',
      description: 'Utilisent l\'app quotidiennement',
      count: 1547,
      growth: 22.4,
      icon: '🔥',
      tag: 'Engagement',
      aiSuggestion: 'Créer un programme ambassadeur',
    },
    {
      id: 'video-lovers',
      name: 'Gros consommateurs vidéo',
      description: 'Regardent 80%+ des vidéos en entier',
      count: 3156,
      growth: 31.5,
      icon: '📹',
      tag: 'Contenu',
      aiSuggestion: 'Prioriser les annonces vidéo pour ce segment',
    },
    {
      id: 'high-intent',
      name: 'Forte intention de réservation',
      description: 'Consultent détails, prix, disponibilités',
      count: 2134,
      growth: 16.8,
      icon: '🎯',
      tag: 'Conversion',
      aiSuggestion: 'Relance automatique si pas de réservation sous 48h',
    },
  ];

  return (
    <Card className="border-pink-200 bg-gradient-to-br from-pink-50 to-white">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5 text-pink-600" />
          Segmentations intelligentes
        </CardTitle>
        {dateRange && (
          <p className="text-xs text-gray-500 mt-1">{dateRange.label}</p>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-4">
              {segments.map((segment) => (
                <div
                  key={segment.id}
                  onClick={() => onSegmentClick && onSegmentClick(segment.id)}
                  className="group bg-white rounded-xl p-4 border border-gray-100 hover:border-pink-400 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{segment.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm text-gray-900">{segment.name}</h4>
                          <Badge variant="secondary" className="text-xs">{segment.tag}</Badge>
                        </div>
                        <Badge className={segment.growth >= 0 ? 'bg-green-600' : 'bg-red-600'}>
                          {segment.growth >= 0 ? '+' : ''}{segment.growth.toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{segment.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-pink-600">{segment.count.toLocaleString()} utilisateurs</span>
                        {segment.aiSuggestion && (
                          <div className="flex items-center gap-1 text-xs text-purple-600">
                            <Sparkles className="w-3 h-3" />
                            <span className="hidden md:inline">IA</span>
                          </div>
                        )}
                      </div>

                      {/* AI Suggestion */}
                      {segment.aiSuggestion && (
                        <div className="mt-3 p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-xs text-purple-900">
                            <strong>✨ Suggestion IA :</strong> {segment.aiSuggestion}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Info */}
            <div className="p-4 bg-pink-100 rounded-xl border border-pink-200">
              <p className="text-xs text-pink-900">
                <strong>ℹ️ Note :</strong> Cliquez sur un segment pour voir la liste détaillée des utilisateurs et exporter les données
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
