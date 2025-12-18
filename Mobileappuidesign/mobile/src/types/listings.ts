import type { Database } from './supabase.generated';

type Tables = Database['public']['Tables'];

export type ListingRow = Tables['listings']['Row'];
export type ListingMediaRow = Tables['listing_media']['Row'];
export type ListingRoomsRow = Tables['listing_rooms']['Row'];
export type ListingFeaturesRow = Tables['listing_features']['Row'];
export type ListingAvailabilityRow = Tables['listing_availability']['Row'];
export type ListingPromotionRow = Tables['listing_promotions']['Row'];

export type ListingMedia = {
  id: string;
  url: string;
  type: 'photo' | 'video';
  position: number;
  tag?: string | null;
};

export type HostProfileSummary = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  is_certified?: boolean | null;
  username?: string | null;
  phone?: string | null;
  enterprise_name?: string | null;
  enterprise_logo_url?: string | null;
};

export type ListingRoomsSummary = {
  living: number;
  bedrooms: number;
  kitchen: number;
  bathrooms: number;
  dining: number;
  toilets: number;
};

export type ListingFeatureFlagKeys =
  | 'has_ac'
  | 'has_wifi'
  | 'has_parking'
  | 'generator'
  | 'prepay_meter'
  | 'sonnel_meter'
  | 'water_well'
  | 'water_heater'
  | 'security_guard'
  | 'cctv'
  | 'fan'
  | 'tv'
  | 'smart_tv'
  | 'netflix'
  | 'washing_machine'
  | 'balcony'
  | 'terrace'
  | 'veranda'
  | 'mezzanine'
  | 'garden'
  | 'pool'
  | 'gym'
  | 'rooftop'
  | 'elevator'
  | 'accessible'
  | 'is_roadside'
  | 'within_50m';

export type FullListing = {
  listing: ListingRow;
  media: ListingMedia[];
  gallery: string[];
  mainMediaUrl: string;
  rooms: ListingRoomsSummary;
  features: ListingFeaturesRow | null;
  featureBadges: string[];
  availability: ListingAvailabilityRow[];
  promotion: ListingPromotionRow | null;
  hasPromotion: boolean;
  tags: string[];
  roadProximityLabel: string | null;
  hostProfile: HostProfileSummary | null;
};
