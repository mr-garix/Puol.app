import { Eye, Calendar, TrendingUp, MapPin } from 'lucide-react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import type { DateRange } from '../DateRangePicker';

interface Property {
  id: string;
  reference: string;
  title: string;
  city: string;
  neighborhood: string;
  views: number;
  bookings: number;
  conversionRate: number;
  image: string;
}

interface TopPropertiesAnalyticsWidgetProps {
  dateRange: DateRange;
  isLoading: boolean;
  onPropertyClick?: (id: string) => void;
}

export function TopPropertiesAnalyticsWidget({ 
  dateRange, 
  isLoading, 
  onPropertyClick 
}: TopPropertiesAnalyticsWidgetProps) {
  const [activeTab, setActiveTab] = useState<'views' | 'bookings'>('views');

  // Mock data - TODO: remplacer par API
  const topViewedProperties: Property[] = [
    {
      id: '1',
      reference: 'PUO-2847',
      title: 'Villa moderne avec piscine',
      city: 'Douala',
      neighborhood: 'Bonapriso',
      views: 2847,
      bookings: 47,
      conversionRate: 1.65,
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400',
    },
    {
      id: '2',
      reference: 'PUO-2341',
      title: 'Appartement standing',
      city: 'Douala',
      neighborhood: 'Akwa',
      views: 2341,
      bookings: 38,
      conversionRate: 1.62,
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400',
    },
    {
      id: '3',
      reference: 'PUO-1923',
      title: 'Studio meublé centre-ville',
      city: 'Yaoundé',
      neighborhood: 'Bastos',
      views: 1923,
      bookings: 29,
      conversionRate: 1.51,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400',
    },
    {
      id: '4',
      reference: 'PUO-1687',
      title: 'Duplex avec jardin',
      city: 'Yaoundé',
      neighborhood: 'Melen',
      views: 1687,
      bookings: 24,
      conversionRate: 1.42,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
    },
    {
      id: '5',
      reference: 'PUO-1534',
      title: 'Loft moderne',
      city: 'Douala',
      neighborhood: 'Deido',
      views: 1534,
      bookings: 19,
      conversionRate: 1.24,
      image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400',
    },
  ];

  const topBookedProperties: Property[] = [
    {
      id: '5',
      reference: 'PUO-2847',
      title: 'Villa moderne avec piscine',
      city: 'Douala',
      neighborhood: 'Bonapriso',
      views: 2847,
      bookings: 47,
      conversionRate: 1.65,
      image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400',
    },
    {
      id: '6',
      reference: 'PUO-2341',
      title: 'Appartement bord de mer',
      city: 'Douala',
      neighborhood: 'Akwa',
      views: 2341,
      bookings: 38,
      conversionRate: 1.62,
      image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400',
    },
    {
      id: '7',
      reference: 'PUO-2012',
      title: 'Villa Kribi vue océan',
      city: 'Kribi',
      neighborhood: 'Bord de mer',
      views: 2012,
      bookings: 34,
      conversionRate: 1.69,
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400',
    },
    {
      id: '8',
      reference: 'PUO-1923',
      title: 'Studio meublé',
      city: 'Yaoundé',
      neighborhood: 'Bastos',
      views: 1923,
      bookings: 29,
      conversionRate: 1.51,
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400',
    },
    {
      id: '9',
      reference: 'PUO-1687',
      title: 'Duplex avec jardin',
      city: 'Yaoundé',
      neighborhood: 'Melen',
      views: 1687,
      bookings: 24,
      conversionRate: 1.42,
      image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=400',
    },
  ];

  const properties = activeTab === 'views' ? topViewedProperties : topBookedProperties;

  const getConversionColor = (rate: number) => {
    if (rate >= 1.5) return 'text-green-600 bg-green-100';
    if (rate >= 1.0) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-4">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Top annonces (performance détaillée)
          </CardTitle>
        </div>
        {dateRange && (
          <p className="text-xs text-gray-500 mb-4">{dateRange.label}</p>
        )}
        
        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'views' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('views')}
            className={`rounded-xl ${activeTab === 'views' ? 'bg-purple-600' : ''}`}
          >
            <Eye className="w-4 h-4 mr-2" />
            Les plus vues
          </Button>
          <Button
            variant={activeTab === 'bookings' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('bookings')}
            className={`rounded-xl ${activeTab === 'bookings' ? 'bg-purple-600' : ''}`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Les plus réservées
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-200 rounded-xl"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {properties.map((property, index) => (
              <div
                key={property.id}
                onClick={() => onPropertyClick && onPropertyClick(property.id)}
                className="group bg-white rounded-xl p-4 border border-gray-100 hover:border-purple-400 hover:shadow-md transition-all cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                    <span className="text-sm">#{index + 1}</span>
                  </div>

                  {/* Image */}
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">{property.reference}</Badge>
                      <h4 className="text-sm text-gray-900 truncate">{property.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <MapPin className="w-3 h-3" />
                      <span>{property.city}</span>
                      <span className="text-gray-400">•</span>
                      <span>{property.neighborhood}</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Vues</p>
                      <p className="text-sm text-gray-900">{property.views.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Réservations</p>
                      <p className="text-sm text-gray-900">{property.bookings}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 mb-1">Conversion</p>
                      <Badge className={`text-xs ${getConversionColor(property.conversionRate)}`}>
                        {property.conversionRate.toFixed(2)}%
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
