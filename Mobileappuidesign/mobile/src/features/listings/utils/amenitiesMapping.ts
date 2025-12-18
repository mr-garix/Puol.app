import { ROAD_VALUE_AMENITY_MAP, type PropertyAmenityId } from '@/src/constants/amenities';
import type { ListingFeatureFlagKeys, ListingFeaturesRow } from '@/src/types/listings';

type FeatureRowLike = Partial<ListingFeaturesRow> & {
  feature_key?: string | null;
  value_bool?: boolean | null;
  value_text?: string | null;
};

export const FEATURE_COLUMN_TO_AMENITY: Partial<Record<ListingFeatureFlagKeys, PropertyAmenityId>> = {
  has_ac: 'ac',
  has_wifi: 'wifi',
  has_parking: 'parking',
  generator: 'generator',
  prepay_meter: 'prepaid-meter',
  sonnel_meter: 'sonel-meter',
  water_well: 'borehole',
  water_heater: 'water-heater',
  security_guard: 'guard',
  cctv: 'cctv',
  fan: 'fan',
  tv: 'tv',
  smart_tv: 'smart-tv',
  netflix: 'netflix',
  washing_machine: 'washer',
  balcony: 'balcony',
  terrace: 'terrace',
  veranda: 'veranda',
  mezzanine: 'mezzanine',
  garden: 'garden',
  pool: 'pool',
  gym: 'gym',
  rooftop: 'rooftop',
  elevator: 'elevator',
  accessible: 'accessible',
  is_roadside: 'road-direct',
  within_50m: 'road-50',
};

type ExtractOptions = {
  allowedAmenityIds?: Set<PropertyAmenityId>;
};

const appendAmenity = (
  collection: Set<PropertyAmenityId>,
  amenityId: PropertyAmenityId | undefined,
  allowed?: Set<PropertyAmenityId>,
) => {
  if (amenityId && (!allowed || allowed.has(amenityId))) {
    collection.add(amenityId);
  }
};

export const mapFeaturesRecordToAmenityIds = (
  features: ListingFeaturesRow | null,
  options?: ExtractOptions,
): PropertyAmenityId[] => {
  if (!features) {
    return [];
  }

  const results = new Set<PropertyAmenityId>();
  (Object.entries(features) as [keyof ListingFeaturesRow, boolean | string | null][]).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    if (key === 'near_main_road' && typeof value === 'string') {
      appendAmenity(results, ROAD_VALUE_AMENITY_MAP[value], options?.allowedAmenityIds);
      return;
    }

    if (FEATURE_COLUMN_TO_AMENITY[key as ListingFeatureFlagKeys]) {
      appendAmenity(
        results,
        FEATURE_COLUMN_TO_AMENITY[key as ListingFeatureFlagKeys],
        options?.allowedAmenityIds,
      );
    }
  });

  return Array.from(results);
};

export const mapFeatureRowsToAmenityIds = (
  rows: FeatureRowLike[] | null,
  options?: ExtractOptions,
): PropertyAmenityId[] => {
  if (!rows?.length) {
    return [];
  }

  const results = new Set<PropertyAmenityId>();

  rows.forEach((row) => {
    if (row?.feature_key) {
      if (row.feature_key === 'near_main_road') {
        appendAmenity(
          results,
          ROAD_VALUE_AMENITY_MAP[String(row.value_text ?? '')],
          options?.allowedAmenityIds,
        );
        return;
      }

      appendAmenity(
        results,
        FEATURE_COLUMN_TO_AMENITY[row.feature_key as ListingFeatureFlagKeys],
        options?.allowedAmenityIds,
      );
      return;
    }

    mapFeaturesRecordToAmenityIds(row as ListingFeaturesRow, options).forEach((amenity) => results.add(amenity));
  });

  return Array.from(results);
};

export const extractAmenityIdsFromFeatures = (
  features: FeatureRowLike | FeatureRowLike[] | null | undefined,
  options?: ExtractOptions,
): PropertyAmenityId[] => {
  if (!features) {
    return [];
  }
  if (Array.isArray(features)) {
    return mapFeatureRowsToAmenityIds(features, options);
  }
  return mapFeaturesRecordToAmenityIds(features as ListingFeaturesRow, options);
};
