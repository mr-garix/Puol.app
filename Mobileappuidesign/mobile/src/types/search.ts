export type FurnishingPreference = 'furnished' | 'unfurnished' | '';

export type SearchCriteria = {
  location: string;
  type: string;
  furnishingType: FurnishingPreference | '';
  arrivalDate: string;
  departureDate: string;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  livingRooms: number;
  priceRange: { min: string; max: string };
  amenities: string[];
  surfaceArea: string;
};
