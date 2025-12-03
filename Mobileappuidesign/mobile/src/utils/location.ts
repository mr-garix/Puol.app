type NullableString = string | null | undefined;

const normalizeToken = (value?: NullableString) => value?.trim() ?? '';

const equalsIgnoreCase = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'accent' }) === 0;

const splitAddressParts = (address?: NullableString) =>
  (address ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export const formatDistrictCity = (
  district?: NullableString,
  city?: NullableString,
  options?: { fallback?: string },
) => {
  const trimmedDistrict = normalizeToken(district);
  const trimmedCity = normalizeToken(city);

  if (trimmedDistrict && trimmedCity) {
    // Toujours retourner 'quartier, ville' même s'ils sont identiques
    return `${trimmedDistrict}, ${trimmedCity}`;
  }

  if (trimmedDistrict) {
    return trimmedDistrict;
  }
  if (trimmedCity) {
    return trimmedCity;
  }

  return options?.fallback ?? '';
};

export const formatAddressLine = (
  addressText?: NullableString,
  district?: NullableString,
  city?: NullableString,
  options?: { fallback?: string },
) => {
  const trimmedAddress = normalizeToken(addressText);
  if (trimmedAddress) {
    return trimmedAddress;
  }
  return formatDistrictCity(district, city, options);
};

const deriveDistrictFromAddress = (addressText?: NullableString, city?: NullableString) => {
  const parts = splitAddressParts(addressText);
  if (!parts.length) {
    return '';
  }

  const normalizedCity = normalizeToken(city).toLowerCase();
  if (normalizedCity) {
    const withoutCity = parts.filter((part) => part.toLowerCase() !== normalizedCity);
    if (withoutCity.length) {
      return withoutCity[0];
    }
  }

  if (parts.length >= 2) {
    return parts.slice(0, -1).join(', ');
  }

  return parts[0];
};

export const formatListingLocation = (params: {
  district?: NullableString;
  city?: NullableString;
  addressText?: NullableString;
  fallback?: string;
}) => {
  const directAddress = normalizeToken(params.addressText);
  if (directAddress) {
    return directAddress;
  }

  const direct = formatDistrictCity(params.district, params.city, { fallback: undefined });
  if (direct) {
    return direct;
  }

  const derivedDistrict = deriveDistrictFromAddress(params.addressText, params.city);
  if (derivedDistrict) {
    const derivedLabel = formatDistrictCity(derivedDistrict, params.city, { fallback: undefined });
    if (derivedLabel) {
      return derivedLabel;
    }
    return derivedDistrict;
  }

  return (
    formatDistrictCity(undefined, params.city, { fallback: params.fallback }) ||
    params.city ||
    params.fallback ||
    ''
  );
};
