const GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
const GOOGLE_PLACES_DETAILS_ENDPOINT = 'https://maps.googleapis.com/maps/api/place/details/json';

export type PlaceSuggestion = {
  id: string;
  primary: string;
  secondary?: string;
  description: string;
};

export const createPlacesSessionToken = () =>
  Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);

type FetchPlaceSuggestionOptions = {
  types?: string;
};

export async function fetchPlaceSuggestions(
  query: string,
  sessionToken?: string,
  options?: FetchPlaceSuggestionOptions,
): Promise<PlaceSuggestion[]> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.warn('[GooglePlaces] Missing EXPO_PUBLIC_GOOGLE_PLACES_API_KEY');
    return [];
  }

  const params = new URLSearchParams({
    input: query,
    key: apiKey,
    language: 'fr',
    components: 'country:cm',
  });

  if (sessionToken) {
    params.append('sessiontoken', sessionToken);
  }
  if (options?.types) {
    params.append('types', options.types);
  }

  const response = await fetch(`${GOOGLE_PLACES_AUTOCOMPLETE_ENDPOINT}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`[GooglePlaces] HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (payload.status === 'ZERO_RESULTS') {
    return [];
  }

  if (payload.status !== 'OK') {
    throw new Error(payload.error_message || payload.status || 'GOOGLE_PLACES_ERROR');
  }

  type GooglePrediction = {
    place_id: string;
    description: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
    types?: string[];
  };

  const predictions: GooglePrediction[] = Array.isArray(payload.predictions) ? payload.predictions : [];

  return predictions
    .map((prediction: GooglePrediction) => {
      const formatting = prediction?.structured_formatting ?? {};
      return {
        id: prediction.place_id,
        primary: formatting.main_text || prediction.description || query,
        secondary: formatting.secondary_text,
        description: prediction.description || `${formatting.main_text ?? ''}${formatting.secondary_text ? `, ${formatting.secondary_text}` : ''}`,
      } satisfies PlaceSuggestion;
    });
}

type PlaceDetailsComponent = {
  long_name: string;
  short_name: string;
  types: string[];
};

export type PlaceDetails = {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  components: PlaceDetailsComponent[];
};

export async function fetchPlaceDetails(placeId: string): Promise<PlaceDetails | null> {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;

  if (!apiKey || !placeId) {
    return null;
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    language: 'fr',
    fields: 'formatted_address,address_component,geometry/location',
  });

  const response = await fetch(`${GOOGLE_PLACES_DETAILS_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    console.warn('[GooglePlaces] place details HTTP error', response.status);
    return null;
  }

  const payload = await response.json();
  if (payload.status !== 'OK') {
    console.warn('[GooglePlaces] place details status', payload.status, payload.error_message);
    return null;
  }

  const result = payload.result;
  if (!result) {
    return null;
  }

  const location = result.geometry?.location;
  if (!location) {
    return null;
  }

  return {
    placeId,
    formattedAddress: result.formatted_address ?? '',
    latitude: typeof location.lat === 'number' ? location.lat : Number(location.lat),
    longitude: typeof location.lng === 'number' ? location.lng : Number(location.lng),
    components: Array.isArray(result.address_components) ? result.address_components : [],
  } satisfies PlaceDetails;
}
