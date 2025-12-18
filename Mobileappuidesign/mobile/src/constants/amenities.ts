import React from 'react';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';

export type FeatherIconName = React.ComponentProps<typeof Feather>['name'];
export type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type IconDescriptor =
  | { library: 'Feather'; name: FeatherIconName }
  | { library: 'MaterialCommunityIcons'; name: MaterialIconName };

export type AmenityOption = {
  id: string;
  label: string;
  icon: IconDescriptor;
};

export const PROPERTY_AMENITIES = [
  { id: 'road-direct', label: 'En bord de route', icon: { library: 'MaterialCommunityIcons', name: 'road-variant' as MaterialIconName } },
  { id: 'road-50', label: 'À moins de 50 m de la route', icon: { library: 'MaterialCommunityIcons', name: 'map-marker-distance' as MaterialIconName } },
  { id: 'ac', label: 'Climatisation', icon: { library: 'MaterialCommunityIcons', name: 'air-conditioner' as MaterialIconName } },
  { id: 'wifi', label: 'Wifi', icon: { library: 'MaterialCommunityIcons', name: 'wifi' as MaterialIconName } },
  { id: 'parking', label: 'Parking', icon: { library: 'MaterialCommunityIcons', name: 'parking' as MaterialIconName } },
  { id: 'generator', label: 'Groupe électrogène', icon: { library: 'MaterialCommunityIcons', name: 'lightning-bolt-outline' as MaterialIconName } },
  { id: 'housekeeping', label: 'Service ménage', icon: { library: 'MaterialCommunityIcons', name: 'broom' as MaterialIconName } },
  { id: 'road-100', label: 'À 100 m de la route', icon: { library: 'MaterialCommunityIcons', name: 'road-variant' as MaterialIconName } },
  { id: 'road-200', label: 'À +200 m de la route', icon: { library: 'MaterialCommunityIcons', name: 'map-marker-distance' as MaterialIconName } },
  { id: 'prepaid-meter', label: 'Compteur prépayé', icon: { library: 'MaterialCommunityIcons', name: 'flash-outline' as MaterialIconName } },
  { id: 'sonel-meter', label: 'Compteur SONEL', icon: { library: 'MaterialCommunityIcons', name: 'flash' as MaterialIconName } },
  { id: 'borehole', label: 'Forage', icon: { library: 'MaterialCommunityIcons', name: 'water-pump' as MaterialIconName } },
  { id: 'water-heater', label: 'Chauffe-eau', icon: { library: 'MaterialCommunityIcons', name: 'water-boiler' as MaterialIconName } },
  { id: 'guard', label: 'Gardien', icon: { library: 'MaterialCommunityIcons', name: 'shield-account' as MaterialIconName } },
  { id: 'cctv', label: 'Caméras de surveillance', icon: { library: 'MaterialCommunityIcons', name: 'cctv' as MaterialIconName } },
  { id: 'fan', label: 'Ventilateur', icon: { library: 'MaterialCommunityIcons', name: 'fan' as MaterialIconName } },
  { id: 'tv', label: 'Télévision', icon: { library: 'MaterialCommunityIcons', name: 'television' as MaterialIconName } },
  { id: 'smart-tv', label: 'Smart TV', icon: { library: 'MaterialCommunityIcons', name: 'television-play' as MaterialIconName } },
  { id: 'netflix', label: 'Netflix', icon: { library: 'MaterialCommunityIcons', name: 'netflix' as MaterialIconName } },
  { id: 'washer', label: 'Machine à laver', icon: { library: 'MaterialCommunityIcons', name: 'washing-machine' as MaterialIconName } },
  { id: 'balcony', label: 'Balcon', icon: { library: 'MaterialCommunityIcons', name: 'home-group' as MaterialIconName } },
  { id: 'terrace', label: 'Terrasse', icon: { library: 'MaterialCommunityIcons', name: 'home-city-outline' as MaterialIconName } },
  { id: 'veranda', label: 'Véranda', icon: { library: 'MaterialCommunityIcons', name: 'home-variant-outline' as MaterialIconName } },
  { id: 'mezzanine', label: 'Mezzanine', icon: { library: 'MaterialCommunityIcons', name: 'stairs-up' as MaterialIconName } },
  { id: 'garden', label: 'Jardin', icon: { library: 'MaterialCommunityIcons', name: 'flower' as MaterialIconName } },
  { id: 'pool', label: 'Piscine', icon: { library: 'MaterialCommunityIcons', name: 'pool' as MaterialIconName } },
  { id: 'gym', label: 'Salle de sport', icon: { library: 'MaterialCommunityIcons', name: 'dumbbell' as MaterialIconName } },
  { id: 'rooftop', label: 'Rooftop', icon: { library: 'MaterialCommunityIcons', name: 'office-building' as MaterialIconName } },
  { id: 'elevator', label: 'Ascenseur', icon: { library: 'MaterialCommunityIcons', name: 'elevator-passenger' as MaterialIconName } },
  { id: 'accessible', label: 'Accès handicapé', icon: { library: 'MaterialCommunityIcons', name: 'wheelchair-accessibility' as MaterialIconName } },
] as const satisfies ReadonlyArray<AmenityOption>;

export type PropertyAmenityId = (typeof PROPERTY_AMENITIES)[number]['id'];

export const SHOP_AMENITIES = [
  { id: 'roadside', label: 'En bord de route', icon: { library: 'MaterialCommunityIcons', name: 'map-marker-path' as MaterialIconName } },
  { id: 'groundfloor', label: 'Rez-de-chaussée', icon: { library: 'MaterialCommunityIcons', name: 'office-building-marker' as MaterialIconName } },
  { id: 'mall', label: 'Galerie / Centre commercial', icon: { library: 'MaterialCommunityIcons', name: 'storefront-outline' as MaterialIconName } },
  { id: 'clientparking', label: 'Parking clients', icon: { library: 'MaterialCommunityIcons', name: 'parking' as MaterialIconName } },
  { id: 'security', label: 'Sécurité / Gardiennage', icon: { library: 'MaterialCommunityIcons', name: 'shield-check-outline' as MaterialIconName } },
] as const satisfies ReadonlyArray<AmenityOption>;

export type ShopAmenityId = (typeof SHOP_AMENITIES)[number]['id'];

export const ROAD_AMENITY_VALUE_MAP: Record<string, string> = {
  'road-direct': 'roadside',
  'road-50': 'within_50m',
  'road-100': 'within_100m',
  'road-200': 'beyond_200m',
};

export const ROAD_VALUE_AMENITY_MAP: Record<string, PropertyAmenityId> = Object.fromEntries(
  Object.entries(ROAD_AMENITY_VALUE_MAP).map(([amenityId, value]) => [value, amenityId as PropertyAmenityId]),
) as Record<string, PropertyAmenityId>;
