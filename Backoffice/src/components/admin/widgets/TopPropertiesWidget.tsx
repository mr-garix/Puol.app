import { Eye, Calendar, ExternalLink, MapPin, Map } from 'lucide-react';
import type { TopProperty, TopPropertiesData } from '../../../lib/services/dashboardStats';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';

interface TopPropertiesWidgetProps {
  data?: TopPropertiesData | null;
  isLoading?: boolean;
  onPropertyClick?: (propertyId: string) => void;
}

const FALLBACK_PROPERTIES: TopProperty[] = Array.from({ length: 4 }).map((_, index) => ({
  id: `placeholder-${index}`,
  title: 'Annonce PUOL',
  city: 'Ville inconnue',
  stat: 0,
  statLabel: 'vues',
  image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400',
  priceLabel: 'Tarif indisponible',
  isFurnished: false,
}));

export function TopPropertiesWidget({
  data,
  isLoading = false,
  onPropertyClick,
}: TopPropertiesWidgetProps) {
  const withFallback = (list: TopProperty[] | undefined, statLabel: string) =>
    list && list.length > 0
      ? list
      : FALLBACK_PROPERTIES.map(item => ({
          ...item,
          statLabel,
        }));

  const PropertyCard = ({ property, icon }: { property: TopProperty; icon: React.ReactNode }) => {
    const statLabel = property.statLabel ?? 'stat';
    return (
      <div
        onClick={() => onPropertyClick && onPropertyClick(property.id)}
        className="group flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:border-[#2ECC71] hover:shadow-md transition-all cursor-pointer"
      >
        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={property.image}
            alt={property.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <h4 className="text-sm text-gray-900 truncate group-hover:text-[#2ECC71] transition-colors">
              {property.title}
            </h4>
            <Badge variant={property.isFurnished ? 'default' : 'secondary'} className="text-[10px] rounded-full">
              {property.isFurnished ? 'Meublé' : 'Non meublé'}
            </Badge>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="w-3 h-3 text-gray-400" />
            <span className="text-xs text-gray-600">{property.city}</span>
          </div>
          <p className="text-xs text-gray-500">
            {isLoading ? (
              <span className="inline-block w-24 h-3 rounded bg-gray-200 animate-pulse" />
            ) : (
              property.priceLabel
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant="secondary" className="text-xs flex items-center gap-1">
            {icon}
            {isLoading ? '...' : property.stat.toLocaleString('fr-FR')}
          </Badge>
          <span className="text-xs text-gray-500">{statLabel}</span>
          <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#2ECC71] transition-colors" />
        </div>
      </div>
    );
  };

  const SectionCard = ({
    title,
    subtitle,
    icon,
    list,
    gradient,
  }: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    list: TopProperty[];
    gradient: string;
  }) => (
    <Card className={gradient}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          {icon}
          <div className="flex flex-col">
            <span>{title}</span>
            <span className="text-xs font-normal text-gray-500">{subtitle}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {list.map(property => (
          <PropertyCard key={property.id} property={property} icon={icon} />
        ))}
      </CardContent>
    </Card>
  );

  const sections = [
    {
      title: 'Top vues meublés',
      subtitle: 'Annonces meublées les plus consultées',
      icon: <Eye className="w-5 h-5 text-blue-600" />,
      list: withFallback(data?.furnished.viewed, 'vues'),
      gradient: 'border-blue-200 bg-gradient-to-br from-blue-50 to-white',
    },
    {
      title: 'Top vues non-meublés',
      subtitle: 'Visibilité des locations classiques',
      icon: <Eye className="w-5 h-5 text-indigo-600" />,
      list: withFallback(data?.unfurnished.viewed, 'vues'),
      gradient: 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-white',
    },
    {
      title: 'Top réservations meublés',
      subtitle: 'Réservations confirmées (hier)',
      icon: <Calendar className="w-5 h-5 text-purple-600" />,
      list: withFallback(data?.furnished.booked, 'réservations'),
      gradient: 'border-purple-200 bg-gradient-to-br from-purple-50 to-white',
    },
    {
      title: 'Top visites non-meublés',
      subtitle: 'Visites programmées hors meublés',
      icon: <Map className="w-5 h-5 text-emerald-600" />,
      list: withFallback(data?.unfurnished.visited, 'visites'),
      gradient: 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-6">
        <SectionCard {...sections[0]} />
        <SectionCard {...sections[1]} />
      </div>
      <div className="space-y-6">
        <SectionCard {...sections[2]} />
        <SectionCard {...sections[3]} />
      </div>
    </div>
  );
}
