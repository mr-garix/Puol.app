import { supabase } from '@/src/supabaseClient';

export type ListingAddressSuggestion = {
  id: string;
  listingId: string;
  primary: string;
  secondary?: string;
  description?: string;
  district?: string | null;
  city?: string | null;
  score: number;
};

const sanitizeQuery = (raw: string) => raw.replace(/[\%_]/g, '').trim();

const buildPrimary = (addressText?: string | null, district?: string | null, city?: string | null) => {
  if (district?.trim()) {
    return district.trim();
  }
  if (addressText?.trim()) {
    const [firstChunk] = addressText.split(',');
    if (firstChunk?.trim()) {
      return firstChunk.trim();
    }
  }
  return city?.trim() ?? 'Adresse PUOL';
};

const buildSecondary = (primary: string, city?: string | null, addressText?: string | null) => {
  const items: string[] = [];
  if (city?.trim() && city.trim().toLowerCase() !== primary.toLowerCase()) {
    items.push(city.trim());
  }
  if (addressText?.trim() && !items.includes(addressText.trim()) && addressText.trim().toLowerCase() !== primary.toLowerCase()) {
    items.push(addressText.trim());
  }
  return items.length ? items.join(' • ') : undefined;
};

const countMatches = (haystack: string, tokens: string[]) => tokens.filter((token) => haystack.includes(token)).length;

export async function fetchListingAddressSuggestions(query: string, limit = 8): Promise<ListingAddressSuggestion[]> {
  const sanitized = sanitizeQuery(query);
  if (!sanitized) {
    return [];
  }

  const tokens = sanitized
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return [];
  }

  const likePattern = `%${tokens[0]}%`;

  const { data, error } = await supabase
    .from('listings')
    .select('id, district, city, address_text, status')
    .eq('status', 'published')
    .or(`address_text.ilike.${likePattern},district.ilike.${likePattern},city.ilike.${likePattern}`)
    .limit(60);

  if (error) {
    console.warn('[listingAddresses] suggestions query failed', error);
    return [];
  }

  const suggestions: ListingAddressSuggestion[] = [];

  for (const listing of data ?? []) {
    const searchable = [listing.address_text, listing.district, listing.city]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase())
      .join(' ');

    const overallMatches = countMatches(searchable, tokens);
    if (!overallMatches) {
      continue;
    }

    const districtMatches = countMatches((listing.district ?? '').toLowerCase(), tokens);
    const cityMatches = countMatches((listing.city ?? '').toLowerCase(), tokens);

    const score = overallMatches * 10 + districtMatches * 6 + cityMatches * 3;

    const primary = buildPrimary(listing.address_text, listing.district, listing.city);
    const secondary = buildSecondary(primary, listing.city, listing.address_text);

    suggestions.push({
      id: `internal-${listing.id}`,
      listingId: listing.id,
      primary,
      secondary,
      description: listing.address_text ?? undefined,
      district: listing.district,
      city: listing.city,
      score,
    });
  }

  return suggestions.sort((a, b) => b.score - a.score).slice(0, limit);
}
