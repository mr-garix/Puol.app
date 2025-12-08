import { useCallback, useEffect, useMemo, useState } from 'react';

import { supabase } from '@/src/supabaseClient';
import { orderMediaRowsByType } from '@/src/utils/media';
import { toCdnUrl } from '@/src/utils/cdn';
import type {
  FullListing,
  HostProfileSummary,
  ListingAvailabilityRow,
  ListingFeaturesRow,
  ListingFeatureFlagKeys,
  ListingMedia,
  ListingMediaRow,
  ListingPromotionRow,
  ListingRoomsRow,
  ListingRow,
} from '@/src/types/listings';
import type { Tables } from '@/src/types/supabase.generated';

const FEATURE_LABELS: Record<ListingFeatureFlagKeys, string> = {
  has_ac: 'Climatisation',
  has_wifi: 'Wifi',
  has_parking: 'Parking',
  generator: 'Groupe électrogène',
  prepay_meter: 'Compteur prépayé',
  sonnel_meter: 'Compteur SONNEL',
  water_well: 'Forage',
  water_heater: 'Chauffe-eau',
  security_guard: 'Sécurité 24/7',
  cctv: 'CCTV',
  fan: 'Ventilateur',
  tv: 'TV',
  smart_tv: 'Smart TV',
  netflix: 'Netflix',
  washing_machine: 'Lave-linge',
  balcony: 'Balcon',
  terrace: 'Terrasse',
  veranda: 'Véranda',
  mezzanine: 'Mezzanine',
  garden: 'Jardin',
  pool: 'Piscine',
  gym: 'Salle de sport',
  rooftop: 'Rooftop',
  elevator: 'Ascenseur',
  accessible: 'Accès PMR',
};

type HookState = {
  data: FullListing | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const createDefaultRooms = (): ListingRoomsRow => ({
  listing_id: '',
  living_room: 0,
  bedrooms: 0,
  kitchen: 0,
  bathrooms: 0,
  dining_room: 0,
  toilets: 0,
  created_at: '',
  updated_at: '',
});

const mapMediaRows = (rows: ListingMediaRow[], fallback: string) => {
  const sorted = orderMediaRowsByType(rows);

  const media: ListingMedia[] = sorted.map((item) => {
    const isVideo = item.media_type === 'video';
    const rawUrl = item.media_url;
    const url = isVideo ? toCdnUrl(rawUrl) ?? rawUrl : rawUrl;

    return {
      id: item.id,
      url,
      type: item.media_type as ListingMedia['type'],
      position: item.position,
      tag: item.media_tag,
    };
  });

  const gallery = media.filter((item) => item.type === 'photo').map((item) => item.url);
  const mainMediaUrl =
    media.find((item) => item.type === 'video')?.url || media[0]?.url || fallback;

  return {
    media,
    gallery: gallery.length ? gallery : [fallback],
    mainMediaUrl,
  };
};

const buildFeatureBadges = (features: ListingFeaturesRow | null) => {
  if (!features) return [] as string[];
  return (Object.keys(FEATURE_LABELS) as ListingFeatureFlagKeys[])
    .filter((key) => Boolean(features[key]))
    .map((key) => FEATURE_LABELS[key]);
};

const buildTags = (listing: ListingRow) => {
  const tags: string[] = [];
  if (listing.property_type) {
    tags.push(listing.property_type);
  }
  if (listing.capacity) {
    const suffix = listing.capacity > 1 ? 'personnes' : 'personne';
    tags.push(`${listing.capacity} ${suffix}`);
  }
  tags.push(listing.is_furnished ? 'Meublé' : 'Non Meublé');
  if (listing.city) {
    tags.push(listing.city);
  }
  return tags;
};

const listingCache = new Map<string, FullListing>();

type ProfileRow = Tables<'profiles'>;

const mapHostProfileSummary = (profile: ProfileRow | null): HostProfileSummary | null => {
  if (!profile) {
    return null;
  }

  return {
    id: profile.id,
    first_name: profile.first_name,
    last_name: profile.last_name,
    avatar_url: profile.avatar_url,
    is_certified: profile.is_certified,
    username: profile.username,
    phone: profile.phone,
    enterprise_name: profile.enterprise_name,
    enterprise_logo_url: profile.enterprise_logo_url,
  } satisfies HostProfileSummary;
};

const fetchFullListing = async (listingId: string): Promise<FullListing> => {
  const { data: listingRow, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', listingId)
    .maybeSingle<ListingRow>();

  if (listingError) throw listingError;
  if (!listingRow) {
    throw new Error('Annonce introuvable.');
  }

  const hostProfilePromise = listingRow.host_id
    ? supabase
        .from('profiles')
        .select('id, first_name, last_name, avatar_url, is_certified, username, phone, enterprise_name, enterprise_logo_url')
        .eq('id', listingRow.host_id)
        .maybeSingle<ProfileRow>()
    : Promise.resolve({ data: null, error: null });

  const [mediaRes, roomsRes, featuresRes, availabilityRes, promotionRes, hostProfileRes] = await Promise.all([
    supabase
      .from('listing_media')
      .select('*')
      .eq('listing_id', listingId)
      .order('position', { ascending: true })
      .returns<ListingMediaRow[]>(),
    supabase
      .from('listing_rooms')
      .select('*')
      .eq('listing_id', listingId)
      .maybeSingle<ListingRoomsRow>(),
    supabase
      .from('listing_features')
      .select('*')
      .eq('listing_id', listingId)
      .maybeSingle<ListingFeaturesRow>(),
    supabase
      .from('listing_availability')
      .select('*')
      .eq('listing_id', listingId)
      .order('date', { ascending: true })
      .returns<ListingAvailabilityRow[]>(),
    supabase
      .from('listing_promotions')
      .select('*')
      .eq('listing_id', listingId)
      .maybeSingle<ListingPromotionRow>(),
    hostProfilePromise,
  ]);

  if (mediaRes.error) throw mediaRes.error;
  if (availabilityRes.error) throw availabilityRes.error;
  if (roomsRes.error) throw roomsRes.error;
  if (featuresRes.error) throw featuresRes.error;
  if (promotionRes.error) throw promotionRes.error;
  if (hostProfileRes?.error) throw hostProfileRes.error;

  const mediaRows = mediaRes.data ?? [];
  const availabilityRows = availabilityRes.data ?? [];
  const roomsRow = roomsRes.data ?? createDefaultRooms();
  const featuresRow = featuresRes.data ?? null;
  const promotionRow = promotionRes.data ?? null;

  const { media, gallery, mainMediaUrl } = mapMediaRows(mediaRows, listingRow.cover_photo_url);
  const featureBadges = buildFeatureBadges(featuresRow);
  const tags = buildTags(listingRow);
  const hostProfile = mapHostProfileSummary(hostProfileRes.data ?? null);

  return {
    listing: listingRow,
    media,
    gallery,
    mainMediaUrl,
    rooms: {
      living: roomsRow.living_room,
      bedrooms: roomsRow.bedrooms,
      kitchen: roomsRow.kitchen,
      bathrooms: roomsRow.bathrooms,
      dining: roomsRow.dining_room,
      toilets: roomsRow.toilets,
    },
    features: featuresRow,
    featureBadges,
    availability: availabilityRows,
    promotion: promotionRow,
    hasPromotion: Boolean(promotionRow),
    tags,
    roadProximityLabel: featuresRow?.near_main_road ?? null,
    hostProfile,
  };
};

export const prefetchListingData = async (listingId: string): Promise<FullListing> => {
  if (listingCache.has(listingId)) {
    return listingCache.get(listingId)!;
  }
  const fullListing = await fetchFullListing(listingId);
  listingCache.set(listingId, fullListing);
  return fullListing;
};

export const listingPrefetchCache = listingCache;

export const useListingDetails = (listingId?: string | null): HookState => {
  const [data, setData] = useState<FullListing | null>(listingId ? listingCache.get(listingId) ?? null : null);
  const [isLoading, setIsLoading] = useState<boolean>(listingId ? !listingCache.has(listingId) : false);
  const [error, setError] = useState<string | null>(null);

  const fetchListing = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      if (!listingId) {
        setData(null);
        setIsLoading(false);
        setError('Aucune annonce sélectionnée.');
        return;
      }

      if (force) {
        listingCache.delete(listingId);
      }

      const cached = listingCache.get(listingId);
      if (cached && !force) {
        setData(cached);
        setError(null);
      }

      const shouldShowLoading = force || !cached;
      if (shouldShowLoading) {
        setIsLoading(true);
      }
      setError(null);

      try {
        const fullListing = await fetchFullListing(listingId);
        listingCache.set(listingId, fullListing);
        setData(fullListing);
      } catch (err) {
        console.error('[useListingDetails] fetch error', err);
        if (!cached) {
          setData(null);
        }
        setError("Impossible de charger l'annonce.");
      } finally {
        if (shouldShowLoading) {
          setIsLoading(false);
        }
      }
    },
    [listingId],
  );

  useEffect(() => {
    fetchListing().catch((err) => {
      console.error('[useListingDetails] unexpected', err);
    });
  }, [fetchListing]);

  const refresh = useCallback(() => fetchListing({ force: true }), [fetchListing]);

  const state = useMemo<HookState>(
    () => ({
      data,
      isLoading,
      error,
      refresh,
    }),
    [data, error, isLoading, refresh],
  );

  return state;
};
