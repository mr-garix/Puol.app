import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { FavoriteProperty } from '@/components/FavoritesScreen';
import { supabase } from '@/src/supabaseClient';
import type { Tables } from '@/src/types/supabase.generated';
import { orderMediaRowsByType } from '@/src/utils/media';
import { toCdnUrl } from '@/src/utils/cdn';

const FALLBACK_AVATAR = 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&q=80&auto=format';
const FALLBACK_COVER = 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=1080&fit=crop&q=80&auto=format';

type Dictionary<T = unknown> = Record<string, T>;
type HostProfileRow = Pick<
  Tables<'profiles'>,
  'id' | 'first_name' | 'last_name' | 'avatar_url' | 'is_certified' | 'username'
>;

export type FeedMediaType = 'photo' | 'video';

type FeedMediaItem = {
  id: string;
  url: string;
  type: FeedMediaType;
  position: number;
  tag?: string | null;
};

export interface PropertyListing {
  id: string;
  title: string;
  price: string;
  priceValue?: number | null;
  location: string;
  city?: string | null;
  district?: string | null;
  tags: string[];
  surfaceAreaLabel?: string;
  imageUrl: string;
  coverPhotoUrl?: string | null;
  likes: number;
  comments: number;
  shares: number;
  hostAvatar: string;
  hostName: string;
  hostUsername: string | null;
  hostIsVerified: boolean;
  media: FeedMediaItem[];
  mainVideoUrl?: string | null;
  capacity?: number | null;
  propertyType?: string | null;
  hasPromotion?: boolean;
}

interface FeedContextValue {
  propertyListings: PropertyListing[];
  favoriteProperties: FavoriteProperty[];
  likesById: Record<string, boolean>;
  likedPropertyIds: string[];
  toggleLike: (listingId: string) => void;
  isLoadingListings: boolean;
  listingsError: string | null;
  refreshListings: () => Promise<void>;
}

type ListingRow = {
  id: string;
  host_id: string;
  title: string;
  property_type: string | null;
  price_per_night: number | null;
  city: string | null;
  district: string | null;
  capacity: number | null;
  is_furnished: boolean;
  description: string | null;
  cover_photo_url: string | null;
  status: string | null;
  created_at: string;
  updated_at: string;
};

type ListingMediaRow = {
  id: string;
  listing_id: string;
  media_url: string;
  media_type: FeedMediaType;
  position: number | null;
  media_tag: string | null;
};

type ListingPromotionRow = {
  listing_id: string;
};

type LikeInfo = {
  liked: boolean;
  favoritedAt?: number;
};

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment: 'Appartement',
  studio: 'Studio',
  chambre: 'Chambre',
  house: 'Maison',
  villa: 'Villa',
  boutique: 'Boutique',
};

const FeedContext = createContext<FeedContextValue | undefined>(undefined);

const formatPriceDisplay = (price?: number | null) => {
  if (!price) {
    return 'Tarif sur demande';
  }
  return `${price.toLocaleString('fr-FR')} FCFA / NUIT`;
};

const buildLocationLabel = (listing: ListingRow) => {
  const tokens = [listing.district, listing.city].filter((value) => value?.trim()) as string[];
  return tokens.length ? tokens.join(', ') : 'Localisation à venir';
};

const buildListingTags = (listing: ListingRow): string[] => {
  const tags: string[] = [];
  const normalizedType = listing.property_type?.toLowerCase() ?? '';
  const typeLabel = PROPERTY_TYPE_LABELS[normalizedType] ?? listing.property_type ?? null;
  if (typeLabel) {
    tags.push(typeLabel);
  }

  const furnishingTag = listing.is_furnished ? 'Meublé' : 'Non Meublé';
  tags.push(furnishingTag);

  if (listing.capacity) {
    const suffix = listing.capacity > 1 ? 'personnes' : 'personne';
    tags.push(`${listing.capacity} ${suffix}`);
  }

  return tags;
};

const buildHostDisplayName = (profile?: HostProfileRow | null) => {
  const tokens = [profile?.first_name, profile?.last_name].filter((value) => value && value.trim()) as string[];
  return tokens.length ? tokens.join(' ').trim() : 'Hôte PUOL';
};

const mapListingToProperty = (
  listing: ListingRow,
  mediaRows: ListingMediaRow[],
  hasPromotion: boolean,
  hostProfile?: HostProfileRow | null,
): PropertyListing => {
  const orderedMedia = orderMediaRowsByType(mediaRows);
  const normalizedMedia: FeedMediaItem[] = orderedMedia
    .filter((media) => media.media_url?.trim())
    .map((media) => {
      const rawUrl = media.media_url;
      const isVideo = media.media_type === 'video';
      const cdnUrl = isVideo ? toCdnUrl(rawUrl) ?? rawUrl : rawUrl;

      return {
        id: media.id,
        url: cdnUrl,
        type: media.media_type,
        position: media.position ?? 0,
        tag: media.media_tag,
      };
    });

  if (!normalizedMedia.length) {
    const fallbackUrl = listing.cover_photo_url ?? FALLBACK_COVER;
    normalizedMedia.push({
      id: `${listing.id}-fallback`,
      url: fallbackUrl,
      type: 'photo',
      position: 0,
      tag: null,
    });
  }

  const imageUrl = normalizedMedia[0]?.url ?? FALLBACK_COVER;
  const videoMedia = normalizedMedia.find((media) => media.type === 'video');

  const hostAvatar = hostProfile?.avatar_url?.trim() ? hostProfile.avatar_url : FALLBACK_AVATAR;
  const hostName = buildHostDisplayName(hostProfile);

  return {
    id: listing.id,
    title: listing.title,
    price: formatPriceDisplay(listing.price_per_night),
    priceValue: listing.price_per_night,
    location: buildLocationLabel(listing),
    city: listing.city,
    district: listing.district,
    tags: buildListingTags(listing),
    surfaceAreaLabel: undefined,
    imageUrl,
    coverPhotoUrl: listing.cover_photo_url ?? imageUrl,
    likes: 0,
    comments: 0,
    shares: 0,
    hostAvatar,
    hostName,
    hostUsername: hostProfile?.username ?? null,
    hostIsVerified: Boolean(hostProfile?.is_certified),
    media: normalizedMedia,
    mainVideoUrl: videoMedia?.url ?? null,
    capacity: listing.capacity,
    propertyType: listing.property_type,
    hasPromotion,
  };
};

export const FeedProvider = ({ children }: { children: ReactNode }) => {
  const [propertyListings, setPropertyListings] = useState<PropertyListing[]>([]);
  const [likesState, setLikesState] = useState<Record<string, LikeInfo>>({});
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [listingsError, setListingsError] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setIsLoadingListings(true);
    setListingsError(null);
    try {
      const { data: listingsData, error: listingsErrorRaw } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (listingsErrorRaw) {
        throw listingsErrorRaw;
      }

      const listingRows: ListingRow[] = listingsData ?? [];
      const listingIds = listingRows.map((listing) => listing.id);

      let mediaRows: ListingMediaRow[] = [];
      let promotionRows: ListingPromotionRow[] = [];
      let hostProfiles: Dictionary<HostProfileRow> = {};

      if (listingIds.length) {
        const hostIds = Array.from(new Set(listingRows.map((listing) => listing.host_id).filter(Boolean)));

        const [
          { data: mediaData, error: mediaError },
          { data: promoData, error: promoError },
          { data: hostData, error: hostError },
        ] = await Promise.all([
          supabase
            .from('listing_media')
            .select('*')
            .in('listing_id', listingIds)
            .order('position', { ascending: true }),
          supabase.from('listing_promotions').select('listing_id').in('listing_id', listingIds),
          hostIds.length
            ? supabase
                .from('profiles')
                .select('id, first_name, last_name, avatar_url, is_certified, username')
                .in('id', hostIds)
            : Promise.resolve({ data: [] as HostProfileRow[], error: null }),
        ]);

        if (mediaError) {
          throw mediaError;
        }
        if (promoError) {
          throw promoError;
        }
        if (hostError) {
          throw hostError;
        }

        mediaRows = (mediaData ?? []) as ListingMediaRow[];
        promotionRows = (promoData ?? []) as ListingPromotionRow[];
        hostProfiles = (hostData ?? []).reduce<Dictionary<HostProfileRow>>((acc, profile) => {
          if (profile?.id) {
            acc[profile.id] = profile;
          }
          return acc;
        }, {});
      }

      const mediaByListing = mediaRows.reduce<Dictionary<ListingMediaRow[]>>((acc, media) => {
        if (!acc[media.listing_id]) {
          acc[media.listing_id] = [];
        }
        acc[media.listing_id].push(media);
        return acc;
      }, {});

      const promotionLookup = promotionRows.reduce<Dictionary<boolean>>((acc, row) => {
        acc[row.listing_id] = true;
        return acc;
      }, {});

      const nextListings = listingRows.map((listing) =>
        mapListingToProperty(
          listing,
          mediaByListing[listing.id] ?? [],
          Boolean(promotionLookup[listing.id]),
          listing.host_id ? hostProfiles[listing.host_id] : undefined,
        ),
      );

      setPropertyListings(nextListings);
    } catch (error) {
      console.error('[FeedProvider] Failed to load listings', error);
      setListingsError("Impossible de charger les annonces.");
    } finally {
      setIsLoadingListings(false);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const toggleLike = useCallback((listingId: string) => {
    setLikesState((prev) => {
      const current = prev[listingId];
      const nextState: LikeInfo = current?.liked
        ? { liked: false }
        : { liked: true, favoritedAt: Date.now() };
      return {
        ...prev,
        [listingId]: nextState,
      };
    });
  }, []);

  const likedPropertyIds = useMemo(
    () => Object.keys(likesState).filter((id) => likesState[id]?.liked),
    [likesState],
  );

  const likesById = useMemo(() => {
    return likedPropertyIds.reduce<Record<string, boolean>>((acc, id) => {
      acc[id] = true;
      return acc;
    }, {});
  }, [likedPropertyIds]);

  const favoriteProperties = useMemo(() => {
    return likedPropertyIds
      .map((propertyId) => {
        const listing = propertyListings.find((item) => item.id === propertyId);
        if (!listing) {
          return null;
        }

        const gallery = listing.media.length
          ? listing.media.map((media) => media.url)
          : listing.coverPhotoUrl
          ? [listing.coverPhotoUrl]
          : [listing.imageUrl];

        const favoritedAt = likesState[propertyId]?.favoritedAt;

        return {
          id: listing.id,
          title: listing.title,
          location: listing.location,
          pricePerNight: listing.priceValue ?? undefined,
          images: gallery,
          type: listing.propertyType ?? undefined,
          surfaceArea: listing.surfaceAreaLabel,
          favoritedAt: favoritedAt ? new Date(favoritedAt) : undefined,
        } satisfies FavoriteProperty;
      })
      .filter(Boolean)
      .sort((a, b) => (b?.favoritedAt?.getTime() ?? 0) - (a?.favoritedAt?.getTime() ?? 0)) as FavoriteProperty[];
  }, [likedPropertyIds, likesState, propertyListings]);

  const value = useMemo<FeedContextValue>(
    () => ({
      propertyListings,
      favoriteProperties,
      likesById,
      likedPropertyIds,
      toggleLike,
      isLoadingListings,
      listingsError,
      refreshListings: fetchListings,
    }),
    [favoriteProperties, fetchListings, isLoadingListings, likedPropertyIds, likesById, listingsError, propertyListings, toggleLike],
  );

  return <FeedContext.Provider value={value}>{children}</FeedContext.Provider>;
};

export const useFeed = () => {
  const context = useContext(FeedContext);
  if (!context) {
    throw new Error('useFeed must be used within a FeedProvider');
  }
  return context;
};
