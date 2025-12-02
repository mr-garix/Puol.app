import { supabase } from '@/src/supabaseClient';

import type { SearchCriteria } from '@/src/types/search';
import type { Tables } from '@/src/types/supabase.generated';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1080&fit=crop&q=80&auto=format';

const PROPERTY_TYPE_LABELS = {
  studio: 'Studio',
  chambre: 'Chambre',
  apartment: 'Appartement',
  house: 'Maison',
  villa: 'Villa',
  boutique: 'Boutique',
} as const;

type PropertyType = keyof typeof PROPERTY_TYPE_LABELS;

const normalizePropertyType = (value?: string | null): PropertyType => {
  const key = (value ?? '').trim().toLowerCase() as PropertyType;
  if (key && key in PROPERTY_TYPE_LABELS) {
    return key;
  }
  return 'apartment';
};

export type SearchResultCard = {
  id: string;
  title: string;
  propertyType: PropertyType;
  furnishingLabel: 'Meublé' | 'Non meublé';
  city: string;
  neighborhood: string;
  priceDisplay: string;
  pricePeriodLabel: string;
  image: string;
  badges: string[];
  hashtags: string[];
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  surfaceAreaLabel?: string;
  matchScore: number;
};

type ListingRow = Tables<'listings'>;
type ListingRoomsRow = Tables<'listing_rooms'>;
type ListingFeaturesRow = Tables<'listing_features'>;
type ListingMediaRow = Tables<'listing_media'>;

type ListingWithRelations = ListingRow & {
  listing_rooms?: ListingRoomsRow | null;
  listing_features?: ListingFeaturesRow | null;
  listing_media?: ListingMediaRow[] | null;
};

type SearchResponse = {
  results: SearchResultCard[];
  isFallback: boolean;
};

const SEARCH_SELECT = `
  id,
  title,
  property_type,
  price_per_night,
  city,
  district,
  address_text,
  is_furnished,
  capacity,
  cover_photo_url,
  created_at,
  status,
  listing_rooms (
    living_room,
    bedrooms,
    kitchen,
    bathrooms
  ),
  listing_features (
    near_main_road,
    has_ac,
    has_wifi,
    has_parking,
    generator,
    security_guard,
    pool,
    elevator,
    water_well,
    water_heater
  ),
  listing_media (
    media_url,
    media_type,
    position
  )
`;

const MAX_SOURCE_RESULTS = 80;
const RESULT_LIMIT = 20;
const FALLBACK_LIMIT = 6;

const AMENITY_COLUMN_MAP: Record<string, keyof ListingFeaturesRow | 'near_main_road'> = {
  parking: 'has_parking',
  ac: 'has_ac',
  security: 'security_guard',
  wifi: 'has_wifi',
  elevator: 'elevator',
  pool: 'pool',
  generator: 'generator',
  water24: 'water_well',
  roadside: 'near_main_road',
};

const PRICE_PERIOD_LABEL = 'par nuit';

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const parseNumericValue = (value?: string | number | null) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const numeric = Number(String(value).replace(/\s/g, ''));
  return Number.isFinite(numeric) ? numeric : undefined;
};

const pickHeroImage = (listing: ListingWithRelations) => {
  const media = listing.listing_media ?? [];
  if (media.length) {
    const sorted = [...media].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const photo = sorted.find((item) => item.media_type === 'photo' && item.media_url);
    if (photo?.media_url) {
      return photo.media_url;
    }
    if (sorted[0]?.media_url) {
      return sorted[0].media_url;
    }
  }
  return listing.cover_photo_url ?? FALLBACK_IMAGE;
};

const buildBadges = (listing: ListingWithRelations) => {
  const badges: string[] = [];
  const typeKey = normalizePropertyType(listing.property_type);
  badges.push(PROPERTY_TYPE_LABELS[typeKey]);
  badges.push(listing.is_furnished ? 'Meublé' : 'Non meublé');
  if (listing.capacity) {
    const suffix = listing.capacity > 1 ? 'pers.' : 'pers';
    badges.push(`${listing.capacity} ${suffix}`);
  }
  return badges;
};

const buildHashtags = (listing: ListingWithRelations) => {
  const typeKey = normalizePropertyType(listing.property_type);
  const tags = [
    `#${PROPERTY_TYPE_LABELS[typeKey]}`,
    listing.city ? `#${listing.city}` : null,
    listing.district ? `#${listing.district}` : null,
  ].filter(Boolean) as string[];
  tags.push(listing.is_furnished ? '#Meublé' : '#NonMeublé');
  return tags;
};

const formatPriceDisplay = (price?: number | null) => {
  if (!price || price <= 0) {
    return 'Tarif sur demande';
  }
  return `${price.toLocaleString('fr-FR')} FCFA`;
};

const buildMatchScore = (listing: ListingWithRelations) => {
  const bedrooms = listing.listing_rooms?.bedrooms ?? 1;
  const capacityBoost = listing.capacity ? Math.min(10, Math.round(listing.capacity / 2)) : 0;
  return Math.min(99, 68 + bedrooms * 4 + capacityBoost);
};

const extractLocationTokens = (location: string) =>
  location
    .split(/[,|]/)
    .map((token) => normalize(token))
    .filter(Boolean);

const listingMatchesLocation = (listing: ListingWithRelations, tokens: string[]) => {
  if (!tokens.length) {
    return true;
  }
  const haystack = [listing.city, listing.district, listing.address_text, listing.title]
    .filter(Boolean)
    .map((value) => normalize(String(value)));
  return tokens.every((token) => haystack.some((entry) => entry.includes(token)));
};

const listingMatchesPrice = (listing: ListingWithRelations, criteria: SearchCriteria) => {
  const minPrice = parseNumericValue(criteria.priceRange?.min) ?? 0;
  const maxPrice = parseNumericValue(criteria.priceRange?.max) ?? Infinity;
  const price = listing.price_per_night ?? 0;
  return price >= minPrice && price <= maxPrice;
};

const listingMatchesRooms = (listing: ListingWithRelations, criteria: SearchCriteria) => {
  const rooms = listing.listing_rooms;
  const bedrooms = rooms?.bedrooms ?? 0;
  const bathrooms = rooms?.bathrooms ?? 0;
  const kitchens = rooms?.kitchen ?? 0;
  const livingRooms = rooms?.living_room ?? 0;

  return (
    bedrooms >= (criteria.bedrooms ?? 0) &&
    bathrooms >= (criteria.bathrooms ?? 0) &&
    kitchens >= (criteria.kitchens ?? 0) &&
    livingRooms >= (criteria.livingRooms ?? 0)
  );
};

const listingMatchesAmenities = (listing: ListingWithRelations, amenities: string[]) => {
  if (!amenities.length) {
    return true;
  }
  const features = listing.listing_features;
  if (!features) {
    return false;
  }

  return amenities.every((amenityId) => {
    const column = AMENITY_COLUMN_MAP[amenityId];
    if (!column) {
      return true;
    }
    if (column === 'near_main_road') {
      return Boolean(features.near_main_road);
    }
    return Boolean(features[column]);
  });
};

const listingMatchesFurnishing = (listing: ListingWithRelations, criteria: SearchCriteria) => {
  if (!criteria.furnishingType || criteria.type === 'boutique') {
    return true;
  }
  return listing.is_furnished === (criteria.furnishingType === 'furnished');
};

const listingMatchesCriteria = (listing: ListingWithRelations, criteria: SearchCriteria) => {
  const locationTokens = extractLocationTokens(criteria.location ?? '');
  const matchesLocation = listingMatchesLocation(listing, locationTokens);
  const listingType = normalizePropertyType(listing.property_type);
  const matchesType = criteria.type ? listingType === criteria.type : true;

  return (
    matchesLocation &&
    matchesType &&
    listingMatchesFurnishing(listing, criteria) &&
    listingMatchesRooms(listing, criteria) &&
    listingMatchesPrice(listing, criteria) &&
    listingMatchesAmenities(listing, criteria.amenities ?? [])
  );
};

const mapListingToResult = (listing: ListingWithRelations): SearchResultCard => {
  const typeKey = normalizePropertyType(listing.property_type);
  const furnishingLabel = listing.is_furnished ? 'Meublé' : 'Non meublé';
  const rooms = listing.listing_rooms;

  return {
    id: listing.id,
    title: listing.title,
    propertyType: typeKey,
    furnishingLabel,
    city: listing.city ?? 'Ville à venir',
    neighborhood: listing.district ?? listing.city ?? 'Quartier à venir',
    priceDisplay: formatPriceDisplay(listing.price_per_night),
    pricePeriodLabel: PRICE_PERIOD_LABEL,
    image: pickHeroImage(listing),
    badges: buildBadges(listing),
    hashtags: buildHashtags(listing),
    bedrooms: rooms?.bedrooms ?? 1,
    bathrooms: rooms?.bathrooms ?? 1,
    kitchens: rooms?.kitchen ?? 1,
    surfaceAreaLabel: undefined,
    matchScore: buildMatchScore(listing),
  } satisfies SearchResultCard;
};

const buildFallbackListings = (listings: ListingWithRelations[], criteria: SearchCriteria) => {
  const locationTokens = extractLocationTokens(criteria.location ?? '');
  const typeMatches = criteria.type ? listings.filter((listing) => listing.property_type === criteria.type) : [];
  const locationMatches = locationTokens.length
    ? listings.filter((listing) => listingMatchesLocation(listing, locationTokens))
    : [];

  const ordered = [...typeMatches, ...locationMatches, ...listings];
  const deduped: ListingWithRelations[] = [];
  const seen = new Set<string>();

  ordered.forEach((listing) => {
    if (!seen.has(listing.id)) {
      seen.add(listing.id);
      deduped.push(listing);
    }
  });

  return deduped.slice(0, FALLBACK_LIMIT);
};

export const searchListings = async (criteria: SearchCriteria): Promise<SearchResponse> => {
  const { data, error } = await supabase
    .from('listings')
    .select(SEARCH_SELECT)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(MAX_SOURCE_RESULTS)
    .returns<ListingWithRelations[]>();

  if (error) {
    throw error;
  }

  const listings = data ?? [];
  const matches = listings.filter((listing) => listingMatchesCriteria(listing, criteria));

  if (matches.length) {
    return {
      results: matches.slice(0, RESULT_LIMIT).map(mapListingToResult),
      isFallback: false,
    };
  }

  const fallback = buildFallbackListings(listings, criteria).map(mapListingToResult);
  return {
    results: fallback,
    isFallback: true,
  };
};
