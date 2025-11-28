import { getAllProperties, type PropertyData, type PriceType, type PropertyType } from '@/src/data/properties';

import type { SearchCriteria } from '@/src/types/search';

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

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  studio: 'Studio',
  chambre: 'Chambre',
  apartment: 'Appartement',
  house: 'Maison',
  villa: 'Villa',
  boutique: 'Boutique',
};

const formatPrice = (price: string, period: PriceType) => {
  const numeric = Number(price.replace(/\s/g, ''));
  const formatted = Number.isFinite(numeric) ? numeric.toLocaleString('fr-FR') : price;
  return `${formatted} FCFA`;
};

const periodLabel = (period: PriceType) => (period === 'daily' ? 'par nuit' : 'par mois');

const surfaceLabel = (property: PropertyData) => {
  if (property.surfaceArea) {
    return `${property.surfaceArea} m²`;
  }
  if (property.type === 'boutique') {
    return 'Surface ajustable';
  }
  return undefined;
};

const buildHashtags = (property: PropertyData) => {
  const base = [`#${PROPERTY_TYPE_LABELS[property.type]}`, `#${property.location.city}`, `#${property.location.neighborhood}`];
  if (property.furnishingType === 'furnished') {
    base.push('#Meublé');
  } else if (property.furnishingType === 'unfurnished') {
    base.push('#NonMeublé');
  }
  if (property.priceType === 'daily') {
    base.push('#CourteDurée');
  } else {
    base.push('#LongSéjour');
  }
  return base;
};

const buildResultCard = (property: PropertyData): SearchResultCard => {
  const furnishingLabel = property.furnishingType === 'furnished' ? 'Meublé' : 'Non meublé';
  const badges = [PROPERTY_TYPE_LABELS[property.type], furnishingLabel];
  const surface = surfaceLabel(property);
  if (surface) {
    badges.push(surface);
  }

  const matchScore = Math.min(99, 68 + (property.landlord.reviewsCount ?? 12));

  return {
    id: property.id,
    title: property.title,
    propertyType: property.type,
    furnishingLabel,
    city: property.location.city,
    neighborhood: property.location.neighborhood,
    priceDisplay: formatPrice(property.price, property.priceType),
    pricePeriodLabel: periodLabel(property.priceType),
    image: property.images[0],
    badges,
    hashtags: buildHashtags(property),
    bedrooms: property.bedrooms ?? (property.type === 'studio' ? 1 : 2),
    bathrooms: property.bathrooms ?? 1,
    kitchens: property.kitchens ?? 1,
    surfaceAreaLabel: surface,
    matchScore,
  } satisfies SearchResultCard;
};

const parseNumericValue = (value?: string | number) => {
  if (value === undefined || value === null) {
    return undefined;
  }
  const numeric = Number(String(value).replace(/\s/g, ''));
  return Number.isFinite(numeric) ? numeric : undefined;
};

const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';

const AMENITY_KEYWORDS: Record<string, string[]> = {
  parking: ['parking', 'parking clients'],
  ac: ['climatisation', 'air conditionner', 'air-conditioner'],
  security: ['sécurité', 'gardien', 'gardiennage'],
  wifi: ['wifi'],
  elevator: ['ascenseur'],
  pool: ['piscine'],
  generator: ['groupe électrogène'],
  water24: ['eau 24/24'],
  roadside: ['bord de route'],
  groundfloor: ['rez-de-chaussée'],
  mall: ['galerie', 'centre commercial'],
  clientparking: ['parking clients'],
};

const matchesAmenities = (property: PropertyData, selected: string[]) => {
  if (!selected.length) {
    return true;
  }
  const propertyAmenities = (property.amenities ?? []).map((amenity) => normalize(amenity));
  return selected.every((amenityId) => {
    const keywords = AMENITY_KEYWORDS[amenityId];
    if (!keywords || !keywords.length) {
      return true;
    }
    return keywords.some((keyword) => propertyAmenities.some((amenity) => amenity.includes(keyword)));
  });
};

const propertyMatchesCriteria = (property: PropertyData, criteria: SearchCriteria) => {
  const locationQuery = normalize(criteria.location);
  const matchesLocation = locationQuery
    ? [property.location.city, property.location.neighborhood, property.location.address, property.title]
        .filter(Boolean)
        .map((value) => normalize(String(value)))
        .some((value) => value.includes(locationQuery))
    : true;

  const matchesType = criteria.type ? property.type === criteria.type : true;

  const matchesFurnishing =
    !criteria.furnishingType || property.type === 'boutique'
      ? true
      : property.furnishingType === criteria.furnishingType;

  const minBedrooms = criteria.bedrooms ?? 0;
  const minBathrooms = criteria.bathrooms ?? 0;
  const minKitchens = criteria.kitchens ?? 0;
  const minLivingRooms = criteria.livingRooms ?? 0;

  const matchesRooms =
    (property.bedrooms ?? 0) >= minBedrooms &&
    (property.bathrooms ?? 0) >= minBathrooms &&
    (property.kitchens ?? 0) >= minKitchens &&
    (property.livingRooms ?? 0) >= minLivingRooms;

  const priceValue = parseNumericValue(property.price);
  const minPrice = parseNumericValue(criteria.priceRange?.min) ?? 0;
  const maxPrice = parseNumericValue(criteria.priceRange?.max) ?? Infinity;
  const matchesPrice = priceValue === undefined ? true : priceValue >= minPrice && priceValue <= maxPrice;

  const matchesSurface = criteria.surfaceArea
    ? (parseNumericValue(property.surfaceArea) ?? 0) >= (parseNumericValue(criteria.surfaceArea) ?? 0)
    : true;

  return (
    matchesLocation &&
    matchesType &&
    matchesFurnishing &&
    matchesRooms &&
    matchesPrice &&
    matchesSurface &&
    matchesAmenities(property, criteria.amenities)
  );
};

export const getSearchResultCards = (): SearchResultCard[] => {
  const properties = getAllProperties();
  return properties.map(buildResultCard);
};

export const getSearchResultsForCriteria = (criteria: SearchCriteria): SearchResultCard[] => {
  const properties = getAllProperties();
  return properties.filter((property) => propertyMatchesCriteria(property, criteria)).map(buildResultCard);
};

export const filterCardsByType = (cards: SearchResultCard[], filter: PropertyType | 'all') => {
  if (filter === 'all') {
    return cards;
  }
  return cards.filter((card) => card.propertyType === filter);
};
