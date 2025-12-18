import { supabase } from '@/src/supabaseClient';

import type { SearchCriteria } from '@/src/types/search';
import type { Tables } from '@/src/types/supabase.generated';
import { formatListingLocation } from '@/src/utils/location';
import { buildListingTags, buildSurfaceTag, COMMERCIAL_TYPES } from '@/src/contexts/FeedContext';
import { orderMediaRowsByType } from '@/src/utils/media';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1080&fit=crop&q=80&auto=format';

const PROPERTY_TYPE_LABELS = {
  studio: 'Studio',
  chambre: 'Chambre',
  apartment: 'Appartement',
  house: 'Maison',
  villa: 'Villa',
  boutique: 'Boutique',
  'espace commercial': 'Espace commercial',
  bureau: 'Bureau',
  terrain: 'Terrain',
} as const;

type PropertyType = keyof typeof PROPERTY_TYPE_LABELS;

const normalizePropertyType = (value?: string | null): PropertyType => {
  const sanitize = (input?: string | null) =>
    (input ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]/g, '');

  const normalized = sanitize(value);
  if (!normalized) {
    return 'apartment';
  }

  const TYPE_VARIANTS: Record<string, PropertyType> = {
    apartment: 'apartment',
    appart: 'apartment',
    appartement: 'apartment',
    appartements: 'apartment',
    appartmeuble: 'apartment',
    appartnonmeuble: 'apartment',

    studio: 'studio',
    studios: 'studio',

    chambre: 'chambre',
    chambres: 'chambre',
    room: 'chambre',
    rooms: 'chambre',

    house: 'house',
    houses: 'house',
    maison: 'house',
    maisons: 'house',
    duplex: 'house',
    triplex: 'house',

    villa: 'villa',
    villas: 'villa',

    boutique: 'boutique',
    boutiques: 'boutique',
    magasin: 'boutique',
    magasins: 'boutique',

    bureau: 'bureau',
    bureaux: 'bureau',
    office: 'bureau',
    offices: 'bureau',

    terrain: 'terrain',
    terrains: 'terrain',
    lot: 'terrain',
    lots: 'terrain',

    espacecommercial: 'espace commercial',
    localcommercial: 'espace commercial',
    locauxcommerciaux: 'espace commercial',
    commercial: 'espace commercial',
  };

  if (TYPE_VARIANTS[normalized]) {
    return TYPE_VARIANTS[normalized];
  }

  return 'apartment';
};

const LONG_TERM_RENTAL_KIND = 'long_term';
const NIGHTLY_PRICE_LABEL = 'par nuit';
const MONTHLY_PRICE_LABEL = 'par mois';
const SURFACE_TOLERANCE_RATIO = 0.15;
const SURFACE_TOLERANCE_MIN = 5;

const formatNightlyPrice = (price?: number | null) => {
  if (!price || price <= 0) {
    return 'Tarif sur demande';
  }
  return `${price.toLocaleString('fr-FR')} FCFA`;
};

const formatMonthlyPrice = (price?: number | null) => {
  if (!price || price <= 0) {
    return 'Loyer sur demande';
  }
  return `${price.toLocaleString('fr-FR')} FCFA`;
};

type PriceMeta = {
  display: string;
  periodLabel: string;
  value: number;
  isLongTerm: boolean;
  hasPrice: boolean;
};

const buildPriceMeta = (listing: ListingWithRelations): PriceMeta => {
  const isLongTerm = (listing.rental_kind ?? '').toLowerCase() === LONG_TERM_RENTAL_KIND;
  const rawValue = isLongTerm ? listing.price_per_month ?? 0 : listing.price_per_night ?? 0;
  const display = isLongTerm ? formatMonthlyPrice(listing.price_per_month) : formatNightlyPrice(listing.price_per_night);
  const hasPrice = rawValue > 0;
  const periodLabel = hasPrice ? (isLongTerm ? MONTHLY_PRICE_LABEL : NIGHTLY_PRICE_LABEL) : '';

  return {
    display,
    periodLabel,
    value: rawValue,
    isLongTerm,
    hasPrice,
  };
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
  rental_kind,
  price_per_night,
  price_per_month,
  min_lease_months,
  deposit_amount,
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
    position,
    thumbnail_url
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

const normalize = (value?: string | null) => value?.trim().toLowerCase() ?? '';

const isCommercialPropertyType = (value?: string | null) => COMMERCIAL_TYPES.has(normalize(value));

const parseNumericValue = (value?: string | number | null) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const numeric = Number(String(value).replace(/\s/g, ''));
  return Number.isFinite(numeric) ? numeric : undefined;
};

const isUsableUrl = (value?: string | null) => Boolean(value && value.trim().length > 0);

const extractSurfaceArea = (mediaRows: ListingMediaRow[]): number | undefined => {
  if (!mediaRows.length) {
    return undefined;
  }
  const rawValue = mediaRows[0]?.thumbnail_url;
  if (!rawValue) {
    return undefined;
  }
  const parsed = parseNumericValue(rawValue);
  return parsed ?? undefined;
};

const computeCommercialSurfaceScore = (
  listing: ListingWithRelations,
  criteria: SearchCriteria,
  orderedMedia: ListingMediaRow[],
): number => {
  const requestedType = normalize(criteria.type ?? '');
  if (requestedType !== 'boutique') {
    return 0;
  }

  if (!isCommercialPropertyType(listing.property_type)) {
    return 0;
  }

  const requestedSurface = parseNumericValue(criteria.surfaceArea);
  if (!requestedSurface || requestedSurface <= 0) {
    return 0;
  }

  const listingSurface = extractSurfaceArea(orderedMedia);
  if (!listingSurface || listingSurface <= 0) {
    return 0;
  }

  const tolerance = Math.max(SURFACE_TOLERANCE_MIN, requestedSurface * SURFACE_TOLERANCE_RATIO);
  const difference = Math.abs(listingSurface - requestedSurface);

  if (difference <= tolerance) {
    return 25;
  }

  if (difference <= tolerance * 2) {
    return 15;
  }

  return 0;
};

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

const buildResultTags = (listing: ListingWithRelations, mediaRows: ListingMediaRow[]) => {
  const surfaceTag = buildSurfaceTag(listing, mediaRows);
  return buildListingTags(listing, surfaceTag);
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

  const listingType = normalizePropertyType(listing.property_type);
  if (requestedType === 'boutique') {
    return COMMERCIAL_TYPES.has(listingType);
  }

  return listingType === requestedType;
};

const matchesFurnishingPreference = (listing: ListingWithRelations, criteria: SearchCriteria) => {
  if (!criteria.furnishingType) {
    return true;
  }
  return listing.is_furnished === (criteria.furnishingType === 'furnished');
};

const listingMatchesPrice = (listing: ListingWithRelations, criteria: SearchCriteria) => {
  const priceMeta = buildPriceMeta(listing);
  if (!priceMeta.hasPrice) {
    return false;
  }

  const minPrice = parseNumericValue(criteria.priceRange?.min) ?? 0;
  const maxPrice = parseNumericValue(criteria.priceRange?.max) ?? Infinity;
  return priceMeta.value >= minPrice && priceMeta.value <= maxPrice;
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
    return matches ? 12 : -6;
  }
  return matches ? 8 : -4;
};

type ListingEvaluation = {
  listing: ListingWithRelations;
  score: number;
  matchedPrimary: boolean;
  locationQuality: LocationMatchQuality;
  prioritizedDistrictMatch: boolean;
  hasLocationFilter: boolean;
  matchesType: boolean;
  matchesFurnishing: boolean;
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
    skipFurnishingScore?: boolean;
    surfaceScore?: number;
    commercialMode?: boolean;
    listingIsCommercial?: boolean;
  },
) => {
  if (options.commercialMode) {
    let commercialScore = 0;

    // Type commercial (boutique) correspond
    if (options.matchesType) {
      commercialScore += 35;
    }

    if (options.hasLocationFilter) {
      switch (options.locationQuality) {
        case 'exact_address':
          commercialScore += 35;
          break;
        case 'district_partial':
          commercialScore += 25;
          break;
        case 'city_only':
          commercialScore += 15;
          break;
        default:
          break; // reste à zéro si aucune correspondance
      }
    }

    if (options.surfaceScore && options.surfaceScore > 0) {
      commercialScore += Math.min(options.surfaceScore, 25);
    }

    if (listingMatchesPrice(listing, criteria)) {
      commercialScore += 10;
    }

    const amenityScore = computeAmenityMatchScore(listing, criteria);
    if (amenityScore > 0) {
      commercialScore += Math.min(amenityScore * 2, 8); // pondéré pour boutique
    }

    return Math.min(99, Math.max(0, Math.round(commercialScore)));
  }

  let score = 15;

  const normalizeLocationImpact = () => {
    if (!options.hasLocationFilter) {
      return;
    }

    switch (options.locationQuality) {
      case 'exact_address':
        score += 47;
        return;
      case 'district_partial':
        score += 37;
        return;
      case 'city_only':
        score += 22;
        return;
      default:
        return;
    }
  };

  normalizeLocationImpact();

  const locationPenalty = options.hasLocationFilter && options.locationQuality === 'none';
  const applyContextualWeight = (value: number, { penalize }: { penalize: boolean }) => {
    if (!penalize) {
      return value;
    }
    return Math.max(10, Math.round(value * 0.5));
  };

  if (options.hasLocationFilter) {
    // Already handled in normalizeLocationImpact
  }

  if (!options.skipFurnishingScore) {
    if (criteria.furnishingType) {
      const reward = applyContextualWeight(35, { penalize: locationPenalty });
      score += options.matchesFurnishing ? reward : 5;
    } else if (options.matchesFurnishing) {
      score += Math.max(8, applyContextualWeight(12, { penalize: locationPenalty }));
    }
  }

  if (criteria.type) {
    const reward = applyContextualWeight(27, { penalize: locationPenalty });
    const minimal = options.listingIsCommercial ? 0 : Math.max(12, applyContextualWeight(14, { penalize: locationPenalty }));
    score += options.matchesType ? reward : minimal;
  } else if (options.matchesType) {
    score += Math.max(10, applyContextualWeight(14, { penalize: locationPenalty }));
  }

  if (
    !options.listingIsCommercial &&
    criteria.type &&
    criteria.furnishingType &&
    options.matchesType &&
    options.matchesFurnishing
  ) {
    score += Math.max(10, applyContextualWeight(18, { penalize: locationPenalty }));
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

  if (options.surfaceScore) {
    score += options.surfaceScore;
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
  const orderedMedia = orderMediaRowsByType((listing.listing_media ?? []) as ListingMediaRow[]);
  const surfaceScore = computeCommercialSurfaceScore(listing, criteria, orderedMedia);
  const isCommercialListing = isCommercialPropertyType(listing.property_type);
  const matchesFurnishing = isCommercialListing
    ? true
    : matchesFurnishingPreference(listing, criteria);
  const prioritizePrice = (criteria.furnishingType ?? '') === 'furnished';
  const prioritizedDistrictMatch = matchesPriorityDistrictToken(listing, options.priorityDistrictToken);
  const hasLocationFilter = Boolean(normalize(criteria.location ?? ''));
  const score = computeMatchScore(listing, criteria, {
    locationQuality,
    matchesType,
    matchesFurnishing,
    prioritizePrice,
    hasLocationFilter,
    skipFurnishingScore: isCommercialListing,
    surfaceScore,
    commercialMode: normalize(criteria.type ?? '') === 'boutique',
    listingIsCommercial: isCommercialListing,
  });

  return {
    listing,
    score,
    matchedPrimary: locationQuality === 'exact_address' && matchesType && matchesFurnishing,
    locationQuality,
    prioritizedDistrictMatch,
    hasLocationFilter,
    matchesType,
    matchesFurnishing,
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
  const orderedMedia = orderMediaRowsByType((listing.listing_media ?? []) as ListingMediaRow[]);
  const surfaceTag = buildSurfaceTag(listing, orderedMedia);
  const tags = buildListingTags(listing, surfaceTag);
  const priceMeta = buildPriceMeta(listing);

  return {
    id: listing.id,
    title: listing.title,
    propertyType: typeKey,
    furnishingLabel,
    locationLabel,
    priceDisplay: priceMeta.display,
    pricePeriodLabel: priceMeta.periodLabel,
    image: pickHeroImage(listing),
    badges: tags,
    hashtags: buildHashtags(listing),
    bedrooms: rooms?.bedrooms ?? 0,
    bathrooms: rooms?.bathrooms ?? 0,
    kitchens: rooms?.kitchen ?? 0,
    surfaceAreaLabel: surfaceTag ?? undefined,
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

  const rawListings = data ?? [];
  const requestedType = normalize(criteria.type ?? '');
  const wantsCommercialOnly = requestedType === 'boutique';
  const listings = rawListings.filter((listing) => {
    const isCommercial = isCommercialPropertyType(listing.property_type);
    if (wantsCommercialOnly) {
      // Laisse tous les résultats pour pouvoir afficher les boutiques d’abord,
      // puis retomber sur le résidentiel (non meublé puis meublé).
      return true;
    }
    // Pour les recherches hors boutique, on reste sur le résidentiel.
    return !isCommercial;
  });
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
  const hasTypeFilter = Boolean(normalize(criteria.type ?? ''));
  const hasFurnishingFilter = Boolean(criteria.furnishingType);
  const hasLocationFilter = Boolean(normalize(criteria.location ?? ''));

  const rankingComparator = (a: ListingEvaluation, b: ListingEvaluation) => {
    const furnishingPreference = normalize(criteria.furnishingType ?? '');
    const requestedType = normalize(criteria.type ?? '');

    const computeBaseBucket = (evaluation: ListingEvaluation) => {
      const typeMatch = !hasTypeFilter || evaluation.matchesType;
      const furnishingMatch = !hasFurnishingFilter || evaluation.matchesFurnishing;
      const locationMatch = !hasLocationFilter || evaluation.locationQuality !== 'none';

      if (typeMatch && furnishingMatch && locationMatch) {
        return 0;
      }
      if (typeMatch && furnishingMatch) {
        return 1;
      }
      if (typeMatch && locationMatch) {
        return 2;
      }
      if (typeMatch) {
        return 3;
      }
      if (locationMatch) {
        return 4;
      }
      return 5;
    };

    const computeCustomBucket = (evaluation: ListingEvaluation) => {
      const isCommercial = isCommercialPropertyType(evaluation.listing.property_type);
      const isFurnished = Boolean(evaluation.listing.is_furnished);

      // Mode boutique : boutiques d’abord, puis non meublé, puis meublé.
      if (requestedType === 'boutique') {
        if (isCommercial) return 0;
        if (!isFurnished) return 1;
        return 2;
      }

      // Préférence meublé : meublé > non meublé > commercial.
      if (furnishingPreference === 'furnished') {
        if (!isCommercial && isFurnished) return 0;
        if (!isCommercial && !isFurnished) return 1;
        return 2;
      }

      // Préférence non meublé : non meublé > meublé > commercial.
      if (furnishingPreference === 'unfurnished') {
        if (!isCommercial && !isFurnished) return 0;
        if (!isCommercial && isFurnished) return 1;
        return 2;
      }

      // Pas de préférence : conserve l’ordre basé sur le score.
      return computeBaseBucket(evaluation);
    };

    const customBucketDiff = computeCustomBucket(a) - computeCustomBucket(b);
    if (customBucketDiff !== 0) {
      return customBucketDiff;
    }

    // En cas d’égalité sur le bucket prioritaire, on retombe sur l’ordre par score + règles de base.
    const baseBucketDiff = computeBaseBucket(a) - computeBaseBucket(b);
    if (baseBucketDiff !== 0) {
      return baseBucketDiff;
    }

    return sortByScoreDesc(a, b);
  };

  const orderedCombined = [...combined].sort(rankingComparator);

  return {
    results: orderedCombined.map(toResult),
    isFallback: !hasPrimaryMatch && bestScore < 65,
  };
};
