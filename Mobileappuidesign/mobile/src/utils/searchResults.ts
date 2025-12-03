import { supabase } from '@/src/supabaseClient';

import type { SearchCriteria } from '@/src/types/search';
import type { Tables } from '@/src/types/supabase.generated';
import { formatListingLocation } from '@/src/utils/location';

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
  locationLabel: string;
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

const isUsableUrl = (value?: string | null) => Boolean(value && value.trim().length > 0);

const pickHeroImage = (listing: ListingWithRelations) => {
  if (isUsableUrl(listing.cover_photo_url)) {
    return listing.cover_photo_url as string;
  }

  const media = listing.listing_media ?? [];
  if (media.length) {
    const sorted = [...media].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    const photo = sorted.find((item) => item.media_type === 'photo' && isUsableUrl(item.media_url));
    if (photo?.media_url) {
      return photo.media_url;
    }
    if (isUsableUrl(sorted[0]?.media_url)) {
      return sorted[0].media_url;
    }
  }
  return FALLBACK_IMAGE;
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

type LocationMatchQuality = 'exact_address' | 'district_partial' | 'city_only' | 'none';

const LOCATION_STOP_TOKENS = new Set(['cameroun', 'cameroon']);

type ParsedLocationQuery = {
  tokens: string[];
  districtToken: string;
  cityToken: string;
};

const extractLocationTokens = (location: string) =>
  location
    .replace(/[|]/g, ',')
    .split(',')
    .flatMap((segment) => segment.split(/\s+/))
    .map((token) => normalize(token.replace(/[^a-zA-ZÀ-ÿ0-9]/g, '')))
    .filter((token) => token.length >= 3);

const parseLocationQuery = (location: string): ParsedLocationQuery => {
  const segments = location
    .split(',')
    .map((segment) => normalize(segment))
    .filter((segment) => segment && !LOCATION_STOP_TOKENS.has(segment));

  const districtToken = segments[0] ?? '';
  const cityToken = segments.length > 1 ? segments[segments.length - 1] : '';
  const tokens = extractLocationTokens(location).filter((token) => !LOCATION_STOP_TOKENS.has(token));

  return {
    tokens,
    districtToken,
    cityToken,
  };
};

const buildLocationHaystack = (listing: ListingWithRelations) =>
  [listing.city, listing.district, listing.address_text, listing.title]
    .filter(Boolean)
    .map((value) => normalize(String(value)));

const hasTokenMatch = (haystack: string[], token: string) => haystack.some((entry) => entry.includes(token));

const matchesPriorityDistrictToken = (listing: ListingWithRelations, token: string) => {
  if (!token) {
    return false;
  }

  const normalizedToken = normalize(token);
  if (!normalizedToken) {
    return false;
  }

  const normalizedAddress = normalize(listing.address_text ?? '');
  if (normalizedAddress.includes(normalizedToken)) {
    return true;
  }

  const listingDistrict = normalize(listing.district ?? '');
  if (listingDistrict.includes(normalizedToken)) {
    return true;
  }

  return false;
};

const compressAddress = (value: string) => value.replace(/[,\s]+/g, '');

const evaluateLocationMatch = (listing: ListingWithRelations, criteria: SearchCriteria): LocationMatchQuality => {
  const rawCriteria = criteria.location ?? '';
  const query = parseLocationQuery(rawCriteria);

  if (!query.tokens.length && !query.districtToken) {
    return 'none';
  }

  const normalizedCriteria = normalize(rawCriteria);
  const normalizedAddress = normalize(listing.address_text ?? '');
  const normalizedDistrict = normalize(listing.district ?? '');
  const normalizedCity = normalize(listing.city ?? '');
  const normalizedDistrictToken = normalize(query.districtToken);
  const normalizedCityToken = normalize(query.cityToken);

  const compactCriteria = compressAddress(normalizedCriteria);
  const compactAddress = compressAddress(normalizedAddress);
  const compactDistrictCity = compressAddress(
    normalize([listing.district, listing.city].filter(Boolean).join(', ')),
  );

  if (compactCriteria && compactCriteria.length >= 3) {
    if (compactAddress && compactCriteria === compactAddress) {
      return 'exact_address';
    }
    if (compactDistrictCity && compactCriteria === compactDistrictCity) {
      return 'exact_address';
    }
  }

  const tokensExcludingCity = query.tokens.filter((token) => token && token !== normalizedCityToken);
  const hasAddressTokenMatch = tokensExcludingCity.some(
    (token) => normalizedAddress.includes(token) || normalizedDistrict.includes(token),
  );

  if (!hasAddressTokenMatch && normalizedDistrictToken) {
    if (normalizedAddress.includes(normalizedDistrictToken) || normalizedDistrict.includes(normalizedDistrictToken)) {
      return 'district_partial';
    }
  }

  if (hasAddressTokenMatch) {
    return 'district_partial';
  }

  if (normalizedCityToken && normalizedCity.includes(normalizedCityToken)) {
    return 'city_only';
  }

  return 'none';
};

const matchesPropertyTypePreference = (listing: ListingWithRelations, criteria: SearchCriteria) => {
  const requestedType = normalize(criteria.type ?? '');
  if (!requestedType) {
    return true;
  }
  return normalizePropertyType(listing.property_type) === requestedType;
};

const matchesFurnishingPreference = (listing: ListingWithRelations, criteria: SearchCriteria) => {
  if (!criteria.furnishingType) {
    return true;
  }
  return listing.is_furnished === (criteria.furnishingType === 'furnished');
};

const listingMatchesPrice = (listing: ListingWithRelations, criteria: SearchCriteria) => {
  const minPrice = parseNumericValue(criteria.priceRange?.min) ?? 0;
  const maxPrice = parseNumericValue(criteria.priceRange?.max) ?? Infinity;
  const price = listing.price_per_night ?? 0;
  return price >= minPrice && price <= maxPrice;
};

const computeRoomCoverageScore = (listing: ListingWithRelations, criteria: SearchCriteria) => {
  const rooms = listing.listing_rooms;
  if (!rooms) {
    return 0;
  }

  const requirements = [
    { actual: rooms.bedrooms ?? 0, required: criteria.bedrooms ?? 0 },
    { actual: rooms.bathrooms ?? 0, required: criteria.bathrooms ?? 0 },
    { actual: rooms.kitchen ?? 0, required: criteria.kitchens ?? 0 },
    { actual: rooms.living_room ?? 0, required: criteria.livingRooms ?? 0 },
  ];

  const requested = requirements.filter((entry) => entry.required > 0);
  if (!requested.length) {
    return 0;
  }

  const satisfied = requested.filter((entry) => entry.actual >= entry.required).length;
  return Math.round((satisfied / requested.length) * 6);
};

const computeAmenityMatchScore = (listing: ListingWithRelations, criteria: SearchCriteria) => {
  const requested = criteria.amenities ?? [];
  if (!requested.length) {
    return 0;
  }

  const features = listing.listing_features;
  if (!features) {
    return 0;
  }

  let satisfied = 0;
  requested.forEach((amenityId) => {
    const column = AMENITY_COLUMN_MAP[amenityId];
    if (!column) {
      return;
    }
    const hasAmenity =
      column === 'near_main_road' ? Boolean(features.near_main_road) : Boolean(features[column]);
    if (hasAmenity) {
      satisfied += 1;
    }
  });

  return Math.round((satisfied / requested.length) * 4);
};

const computePriceScore = (
  listing: ListingWithRelations,
  criteria: SearchCriteria,
  { prioritize }: { prioritize: boolean },
) => {
  const matches = listingMatchesPrice(listing, criteria);
  if (prioritize) {
    return matches ? 12 : -8;
  }
  return matches ? 8 : -3;
};

type ListingEvaluation = {
  listing: ListingWithRelations;
  score: number;
  matchedPrimary: boolean;
  locationQuality: LocationMatchQuality;
  prioritizedDistrictMatch: boolean;
  hasLocationFilter: boolean;
};

const computeMatchScore = (
  listing: ListingWithRelations,
  criteria: SearchCriteria,
  options: {
    locationQuality: LocationMatchQuality;
    matchesType: boolean;
    matchesFurnishing: boolean;
    prioritizePrice: boolean;
    hasLocationFilter: boolean;
  },
) => {
  let score = 8;

  if (options.hasLocationFilter) {
    switch (options.locationQuality) {
      case 'exact_address':
        score += 65;
        break;
      case 'district_partial':
        score += 55;
        break;
      case 'city_only':
        score += 10;
        break;
      default:
        score -= 30;
        break;
    }
  }

  if (options.matchesType) {
    score += 20;
  } else if (criteria.type) {
    score -= 10;
  }

  if (options.matchesFurnishing) {
    score += 10;
  } else if (criteria.furnishingType) {
    score -= 5;
  }

  score += computePriceScore(listing, criteria, { prioritize: options.prioritizePrice });

  const roomScore = computeRoomCoverageScore(listing, criteria);
  if (roomScore > 0) {
    score += roomScore;
  }

  const amenityScore = computeAmenityMatchScore(listing, criteria);
  if (amenityScore > 0) {
    score += amenityScore;
  }

  if (listing.capacity) {
    score += Math.min(4, Math.round(listing.capacity / 2));
  }

  return Math.min(99, Math.max(0, Math.round(score)));
};

const evaluateListing = (
  listing: ListingWithRelations,
  criteria: SearchCriteria,
  options: { priorityDistrictToken: string },
): ListingEvaluation => {
  const locationQuality = evaluateLocationMatch(listing, criteria);
  const matchesType = matchesPropertyTypePreference(listing, criteria);
  const matchesFurnishing = matchesFurnishingPreference(listing, criteria);
  const prioritizePrice = (criteria.furnishingType ?? '') === 'furnished';
  const prioritizedDistrictMatch = matchesPriorityDistrictToken(listing, options.priorityDistrictToken);
  const hasLocationFilter = Boolean(normalize(criteria.location ?? ''));
  const score = computeMatchScore(listing, criteria, {
    locationQuality,
    matchesType,
    matchesFurnishing,
    prioritizePrice,
    hasLocationFilter,
  });

  return {
    listing,
    score,
    matchedPrimary: locationQuality === 'exact_address' && matchesType && matchesFurnishing,
    locationQuality,
    prioritizedDistrictMatch,
    hasLocationFilter,
  };
};

const mapListingToResult = (listing: ListingWithRelations, score: number): SearchResultCard => {
  const typeKey = normalizePropertyType(listing.property_type);
  const furnishingLabel = listing.is_furnished ? 'Meublé' : 'Non meublé';
  const rooms = listing.listing_rooms;
  const locationLabel =
    formatListingLocation({
      district: listing.district,
      city: listing.city,
      addressText: listing.address_text,
      fallback: 'Localisation à venir',
    }) || 'Localisation à venir';

  return {
    id: listing.id,
    title: listing.title,
    propertyType: typeKey,
    furnishingLabel,
    locationLabel,
    priceDisplay: formatPriceDisplay(listing.price_per_night),
    pricePeriodLabel: PRICE_PERIOD_LABEL,
    image: pickHeroImage(listing),
    badges: buildBadges(listing),
    hashtags: buildHashtags(listing),
    bedrooms: rooms?.bedrooms ?? 1,
    bathrooms: rooms?.bathrooms ?? 1,
    kitchens: rooms?.kitchen ?? 1,
    surfaceAreaLabel: undefined,
    matchScore: score,
  } satisfies SearchResultCard;
};

export const searchListings = async (criteria: SearchCriteria): Promise<SearchResponse> => {
  const parsedLocationQuery = parseLocationQuery(criteria.location ?? '');
  const priorityDistrictToken = parsedLocationQuery.districtToken || parsedLocationQuery.tokens[0] || '';

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
  const evaluations = listings.map((listing) =>
    evaluateListing(listing, criteria, { priorityDistrictToken }),
  );
  const hasPrimaryMatch = evaluations.some((evaluation) => evaluation.matchedPrimary);
  const bestScore = evaluations.reduce((max, evaluation) => Math.max(max, evaluation.score), 0);

  const sortByScoreDesc = (a: ListingEvaluation, b: ListingEvaluation) => b.score - a.score;
  const toResult = (evaluation: ListingEvaluation) => mapListingToResult(evaluation.listing, evaluation.score);

  const rankEvaluations = (
    pool: ListingEvaluation[],
    limit: number,
    fallbackLimitOverride?: number,
  ): { ordered: ListingEvaluation[]; usedFallback: boolean } => {
    if (!pool.length || limit <= 0) {
      return { ordered: [], usedFallback: false };
    }

    const primaryMatches = pool.filter((evaluation) => evaluation.matchedPrimary);
    if (primaryMatches.length) {
      const orderedPrimary = [...primaryMatches].sort(sortByScoreDesc);
      const filled: ListingEvaluation[] = orderedPrimary.slice(0, limit);

      if (filled.length < limit) {
        const locationWeight = (quality: LocationMatchQuality) => {
          switch (quality) {
            case 'exact_address':
              return 3;
            case 'district_partial':
              return 2;
            case 'city_only':
              return 1;
            default:
              return 0;
          }
        };
        const secondary = pool
          .filter((evaluation) => !evaluation.matchedPrimary)
          .sort((a, b) => {
            const diff = locationWeight(b.locationQuality) - locationWeight(a.locationQuality);
            if (diff !== 0) {
              return diff;
            }
            return sortByScoreDesc(a, b);
          });

        for (const evaluation of secondary) {
          if (filled.length >= limit) {
            break;
          }
          filled.push(evaluation);
        }
      }

      return { ordered: filled.slice(0, limit), usedFallback: false };
    }

    const fallbackLimit = Math.min(limit, fallbackLimitOverride ?? FALLBACK_LIMIT);
    const fallbackCandidates = pool
      .filter((evaluation) => evaluation.locationQuality !== 'none')
      .sort((a, b) => {
        const weight = (quality: LocationMatchQuality) => {
          switch (quality) {
            case 'exact_address':
              return 3;
            case 'district_partial':
              return 2;
            case 'city_only':
              return 1;
            default:
              return 0;
          }
        };

        const locationDiff = weight(b.locationQuality) - weight(a.locationQuality);
        if (locationDiff !== 0) {
          return locationDiff;
        }

        return sortByScoreDesc(a, b);
      });

    const fallbackSource = fallbackCandidates.length ? fallbackCandidates : [...pool].sort(sortByScoreDesc);
    return {
      ordered: fallbackSource.slice(0, fallbackLimit),
      usedFallback: true,
    };
  };

  const hasPriorityToken = Boolean(priorityDistrictToken);
  const prioritizedEvaluations = hasPriorityToken
    ? evaluations.filter((evaluation) => evaluation.prioritizedDistrictMatch)
    : [];
  const secondaryPool = hasPriorityToken
    ? evaluations.filter((evaluation) => !evaluation.prioritizedDistrictMatch)
    : evaluations;

  const prioritizedRank = rankEvaluations(prioritizedEvaluations, RESULT_LIMIT);
  const remainingLimit = RESULT_LIMIT - prioritizedRank.ordered.length;
  const secondaryRank = remainingLimit > 0
    ? rankEvaluations(secondaryPool, remainingLimit, remainingLimit)
    : { ordered: [], usedFallback: false };

  const combined = [...prioritizedRank.ordered, ...secondaryRank.ordered];

  return {
    results: combined.map(toResult),
    isFallback: !hasPrimaryMatch && bestScore < 65,
  };
};
