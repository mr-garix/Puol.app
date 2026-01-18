import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FavoriteProperty } from '@/src/features/listings/components/FavoritesScreen';
import { supabase } from '@/src/supabaseClient';
import type { Tables } from '@/src/types/supabase.generated';
import { orderMediaRowsByType } from '@/src/utils/media';
import { toCdnUrl } from '@/src/utils/cdn';
import { getListingLikeCount, hasUserLikedListing, toggleListingLike } from '@/src/features/likes/services';
import { useAuth } from '@/src/contexts/AuthContext';
import { getListingCommentCounts } from '@/src/features/comments/services';
import { formatListingLocation } from '@/src/utils/location';
import { STORAGE_KEYS } from '@/src/constants/storageKeys';

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
  hostId?: string | null;
  title: string;
  price: string;
  priceValue?: number | null;
  location: string;
  city?: string | null;
  district?: string | null;
  tags: string[];
  surfaceAreaLabel?: string | null;
  surface?: number | null;
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
  toggleLike: (listingId: string) => Promise<void>;
  isLoadingListings: boolean;
  listingsError: string | null;
  refreshListings: () => Promise<void>;
  updateListingCommentCount: (listingId: string, count: number) => void;
  preserveFeedForAuthFlow: () => void;
}

type ListingRow = Tables<'listings'>;
type ListingMediaRow = Tables<'listing_media'>;

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
  room: 'Chambre',
  duplex: 'Duplex',
  penthouse: 'Penthouse',
};

const LONG_TERM_RENTAL_KIND = 'long_term';

const FeedContext = createContext<FeedContextValue | undefined>(undefined);

const formatNightlyPrice = (price?: number | null) => {
  if (!price) {
    return 'Tarif sur demande';
  }
  return `${price.toLocaleString('fr-FR')} FCFA / NUIT`;
};

const formatMonthlyPrice = (price?: number | null) => {
  if (!price) {
    return 'Loyer sur demande';
  }
  return `${price.toLocaleString('fr-FR')} FCFA / MOIS`;
};

const buildLocationLabel = (listing: ListingRow) =>
  formatListingLocation({
    district: listing.district,
    city: listing.city,
    addressText: listing.address_text,
    fallback: 'Localisation à venir',
  }) || 'Localisation à venir';

export const COMMERCIAL_TYPES = new Set(['boutique', 'espace commercial', 'bureau', 'terrain']);

const shuffleArray = <T,>(items: T[]): T[] => {
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }
  return array;
};

const parseRentalPreferences = (raw: string | null): string[] => {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((value) => (typeof value === 'string' ? value.toLowerCase() : null))
      .filter((value): value is string => Boolean(value));
  } catch (error) {
    console.warn('[FeedContext] Failed to parse rental preferences', error);
    return [];
  }
};

const matchesPreference = (listing: ListingRow, preference: string) => {
  const normalizedType = listing.property_type?.toLowerCase() ?? '';
  const isCommercial = COMMERCIAL_TYPES.has(normalizedType);
  const isFurnished = Boolean(listing.is_furnished);

  switch (preference) {
    case 'boutique':
      return isCommercial;
    case 'meuble':
      return !isCommercial && isFurnished;
    case 'non-meuble':
      return !isCommercial && !isFurnished;
    default:
      return false;
  }
};

const normalizePreference = (value: string) => {
  if (value === 'meuble') return 'meuble';
  if (value === 'non-meuble') return 'non-meuble';
  if (value === 'boutique') return 'boutique';
  return null;
};

// Ordonnancer les listings selon l'ordre de sélection des préférences (sans shuffle),
// en conservant l'ordre d'arrivée (déjà trié par created_at desc côté requête).
const orderListingsByPreferences = (listings: ListingRow[], preferences: string[]) => {
  if (!listings.length) {
    return listings;
  }

  // Préserver l'ordre de sélection, supprimer les doublons et ne garder que les valeurs reconnues
  const orderedPrefs: ('meuble' | 'non-meuble' | 'boutique')[] = [];
  preferences.forEach((pref) => {
    const normalized = normalizePreference(pref);
    if (normalized && !orderedPrefs.includes(normalized)) {
      orderedPrefs.push(normalized);
    }
  });

  if (!orderedPrefs.length) {
    return listings;
  }

  const buckets: Record<string, ListingRow[]> = {};
  const remaining: ListingRow[] = [];

  listings.forEach((listing) => {
    const bucketKey = orderedPrefs.find((pref) => matchesPreference(listing, pref));
    if (bucketKey) {
      if (!buckets[bucketKey]) {
        buckets[bucketKey] = [];
      }
      buckets[bucketKey].push(listing);
    } else {
      remaining.push(listing);
    }
  });

  // Concaténer dans l'ordre des préférences sélectionnées, en mélangeant le contenu de chaque bucket,
  // puis ajouter le reste (mélangé) pour éviter de montrer toujours les mêmes premiers résultats.
  const prioritized = orderedPrefs.flatMap((pref) => shuffleArray(buckets[pref] ?? []));
  return prioritized.concat(shuffleArray(remaining));
};

export const buildSurfaceTag = (listing: ListingRow, mediaRows: ListingMediaRow[]): string | null => {
  const isCommercial = COMMERCIAL_TYPES.has((listing.property_type ?? '').toLowerCase());
  if (!isCommercial) {
    return null;
  }
  const surfaceRaw = mediaRows[0]?.thumbnail_url ?? null;
  if (!surfaceRaw) {
    return null;
  }
  const parsed = Number(surfaceRaw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return `${Math.round(parsed)} m²`;
};

export const buildListingTags = (listing: ListingRow, surfaceTag: string | null): string[] => {
  const tags: string[] = [];
  const normalizedType = listing.property_type?.toLowerCase() ?? '';
  const typeLabel = PROPERTY_TYPE_LABELS[normalizedType] ?? listing.property_type ?? null;
  if (typeLabel) {
    tags.push(typeLabel);
  }

  const isCommercial = COMMERCIAL_TYPES.has(normalizedType);
  const isLongTerm = listing.rental_kind === LONG_TERM_RENTAL_KIND;
  const furnishingLabel = listing.is_furnished ? 'Meublé' : 'Non meublé';
  const minLease = listing.min_lease_months ?? null;
  const bailLabel = minLease && minLease > 0 ? `Bail ${minLease} mois` : 'Bail flexible';

  if (isCommercial) {
    if (surfaceTag) {
      tags.push(surfaceTag);
    }
    if (isLongTerm && minLease) {
      tags.push(bailLabel);
    }
    return tags;
  }

  if (isLongTerm && listing.is_furnished) {
    if (minLease) {
      tags.push(bailLabel);
    }
    tags.push(furnishingLabel);
    return tags;
  }

  tags.push(furnishingLabel);
  if (isLongTerm && minLease) {
    tags.push(bailLabel);
    return tags;
  }

  const capacityValue = typeof listing.capacity === 'number' ? listing.capacity : null;
  if (capacityValue && capacityValue > 0) {
    const suffix = capacityValue > 1 ? 'personnes' : 'personne';
    tags.push(`${capacityValue} ${suffix}`);
  } else {
    tags.push('Capacité non définie');
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
  likesCount: number = 0,
  commentCount: number = 0,
): PropertyListing => {
  const orderedMedia = orderMediaRowsByType(mediaRows);
  const normalizedMedia: FeedMediaItem[] = orderedMedia
    .filter((media) => media.media_url?.trim())
    .map((media) => {
      const rawUrl = media.media_url;
      const mediaType: FeedMediaType = media.media_type === 'video' ? 'video' : 'photo';
      const normalizedUrl = mediaType === 'video' ? toCdnUrl(rawUrl) ?? rawUrl : rawUrl;

      return {
        id: media.id,
        url: normalizedUrl,
        type: mediaType,
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

  const isLongTerm = listing.rental_kind === LONG_TERM_RENTAL_KIND;
  const price = isLongTerm ? formatMonthlyPrice(listing.price_per_month) : formatNightlyPrice(listing.price_per_night);
  const priceValue = isLongTerm ? listing.price_per_month : listing.price_per_night;

  const surfaceTag = buildSurfaceTag(listing, orderedMedia);

  return {
    id: listing.id,
    hostId: listing.host_id,
    title: listing.title,
    price,
    priceValue,
    location: buildLocationLabel(listing),
    city: listing.city,
    district: listing.district,
    tags: buildListingTags(listing, surfaceTag),
    surfaceAreaLabel: surfaceTag,
    imageUrl,
    coverPhotoUrl: listing.cover_photo_url ?? imageUrl,
    likes: likesCount,
    comments: commentCount,
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

  const { supabaseProfile } = useAuth();
  const propertyListingsRef = React.useRef<PropertyListing[]>([]);
  const skipNextRefreshRef = React.useRef(false);

  useEffect(() => {
    propertyListingsRef.current = propertyListings;
  }, [propertyListings]);

  const preserveFeedForAuthFlow = useCallback(() => {
    skipNextRefreshRef.current = true;
  }, []);

  const fetchListings = useCallback(async () => {
    if (skipNextRefreshRef.current && propertyListingsRef.current.length > 0) {
      skipNextRefreshRef.current = false;
      return;
    }

    setIsLoadingListings(true);
    setListingsError(null);
    try {
      console.log('[FeedContext] 🚀 Fetching listings...');
      const { data: listingsData, error: listingsErrorRaw } = await supabase
        .from('listings')
        .select('*')
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (listingsErrorRaw) {
        console.error('[FeedContext] ❌ Listings fetch error:', listingsErrorRaw);
        throw listingsErrorRaw;
      }

      console.log('[FeedContext] ✅ Listings fetched:', listingsData?.length ?? 0);

      const listingRows: ListingRow[] = listingsData ?? [];
      const rentalPreferencesRaw = await AsyncStorage.getItem(STORAGE_KEYS.RENTAL_PREFERENCES);
      const rentalPreferences = parseRentalPreferences(rentalPreferencesRaw);
      const prioritizedListingRows = orderListingsByPreferences(listingRows, rentalPreferences);
      const listingIds = listingRows.map((listing) => listing.id);

      let mediaRows: ListingMediaRow[] = [];
      let promotionRows: ListingPromotionRow[] = [];
      let hostProfiles: Dictionary<HostProfileRow> = {};

      let commentCounts: Dictionary<number> = {};

      if (listingIds.length) {
        const hostIds = Array.from(new Set(listingRows.map((listing) => listing.host_id).filter(Boolean)));

        const [
          { data: mediaData, error: mediaError },
          { data: promoData, error: promoError },
          { data: hostData, error: hostError },
          fetchedCommentCounts,
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
          getListingCommentCounts(listingIds),
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

        commentCounts = fetchedCommentCounts ?? {};
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

      // Charger les vrais compteurs de likes pour chaque listing
      const likeCounts: Dictionary<number> = {};
      await Promise.all(
        listingRows.map(async (listing) => {
          likeCounts[listing.id] = await getListingLikeCount(listing.id);
        })
      );

      const nextListings = prioritizedListingRows.map((listing) =>
        mapListingToProperty(
          listing,
          mediaByListing[listing.id] ?? [],
          Boolean(promotionLookup[listing.id]),
          listing.host_id ? hostProfiles[listing.host_id] : undefined,
          likeCounts[listing.id] ?? 0,
          commentCounts[listing.id] ?? 0,
        ),
      );

      setPropertyListings(nextListings);

      // Charger l'état de like de l'utilisateur pour chaque listing
      const likesState: Dictionary<LikeInfo> = {};
      if (supabaseProfile?.id) {
        console.log('[FeedContext] 📊 Loading likes state for user:', supabaseProfile.id);
        await Promise.all(
          listingRows.map(async (listing) => {
            try {
              const hasLiked = await hasUserLikedListing(listing.id, supabaseProfile.id);
              if (hasLiked) {
                likesState[listing.id] = { liked: true, favoritedAt: Date.now() };
              } else {
                likesState[listing.id] = { liked: false };
              }
            } catch (likeError) {
              console.error('[FeedContext] Error loading like state for listing:', listing.id, likeError);
              likesState[listing.id] = { liked: false };
            }
          })
        );
        console.log('[FeedContext] ✅ Likes state loaded');
      } else {
        console.log('[FeedContext] ℹ️ No user profile, setting all likes to false');
        listingRows.forEach((listing) => {
          likesState[listing.id] = { liked: false };
        });
      }
      setLikesState(likesState);
    } catch (error) {
      console.error('[FeedProvider] ❌ Failed to load listings', error);
      const errorMessage = error instanceof Error ? error.message : "Impossible de charger les annonces.";
      setListingsError(errorMessage);
      setPropertyListings([]);
    } finally {
      setIsLoadingListings(false);
    }
  }, [supabaseProfile?.id]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  const refreshListingLikesCount = useCallback(async (listingId: string) => {
    const latestCount = await getListingLikeCount(listingId);

    setPropertyListings((prev) =>
      prev.map((listing) =>
        listing.id === listingId
          ? {
              ...listing,
              likes: latestCount,
            }
          : listing,
      ),
    );
  }, []);

  const toggleLike = useCallback(async (listingId: string) => {
    if (!supabaseProfile?.id) {
      console.warn('[FeedContext] toggleLike skipped (missing profile)', { listingId });
      return;
    }

    try {
      console.log('[FeedContext] 👍 Toggling like for listing:', listingId);
      const newLikedState = await toggleListingLike(listingId, supabaseProfile.id);
      console.log('[FeedContext] ✅ Like toggled:', { listingId, newLikedState });

      setLikesState((prev) => {
        const nextState: LikeInfo = newLikedState
          ? { liked: true, favoritedAt: Date.now() }
          : { liked: false };
        return {
          ...prev,
          [listingId]: nextState,
        };
      });
      // Mettre à jour le compteur de likes dans le listing correspondant
      setPropertyListings((prev) =>
        prev.map((listing) => {
          if (listing.id === listingId) {
            const fallbackCount = newLikedState ? listing.likes + 1 : Math.max(0, listing.likes - 1);
            return {
              ...listing,
              likes: fallbackCount,
            };
          }
          return listing;
        }),
      );

      // Mettre à jour la liste des favoris (utile si la page favoris est ouverte)
      setLikesState((prev) => ({
        ...prev,
        [listingId]: newLikedState ? { liked: true, favoritedAt: Date.now() } : { liked: false },
      }));

      // Forcer un recalcul exact en arrière-plan pour éviter les décalages éventuels
      void refreshListingLikesCount(listingId);
    } catch (error) {
      console.error('[FeedContext] ❌ toggleLike error', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur lors du like';
      console.error('[FeedContext] Error details:', errorMessage);
    }
  }, [refreshListingLikesCount, supabaseProfile?.id]);

  const updateListingCommentCount = useCallback((listingId: string, count: number) => {
    setPropertyListings((prev) => {
      let didChange = false;
      const next = prev.map((listing) => {
        if (listing.id !== listingId) {
          return listing;
        }
        const nextCount = Math.max(0, count);
        if (listing.comments === nextCount) {
          return listing;
        }
        didChange = true;
        return {
          ...listing,
          comments: nextCount,
        };
      });

      return didChange ? next : prev;
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

  useEffect(() => {
    const channel = supabase
      .channel('feed-listing-likes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listing_likes' }, async (payload) => {
        const listingId = payload.new?.listing_id?.toString();
        if (!listingId) {
          return;
        }

        const likerId = payload.new?.profile_id?.toString();

        if (likerId === supabaseProfile?.id) {
          setLikesState((prev) => ({
            ...prev,
            [listingId]: { liked: true, favoritedAt: Date.now() },
          }));
        }

        await refreshListingLikesCount(listingId);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'listing_likes' }, async (payload) => {
        const listingId = payload.old?.listing_id?.toString();
        if (!listingId) {
          return;
        }

        const likerId = payload.old?.profile_id?.toString();

        if (likerId === supabaseProfile?.id) {
          setLikesState((prev) => ({
            ...prev,
            [listingId]: { liked: false },
          }));
        }

        await refreshListingLikesCount(listingId);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshListingLikesCount, supabaseProfile?.id]);

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
          coverPhotoUrl: listing.coverPhotoUrl ?? listing.imageUrl,
          images: gallery,
          type: listing.propertyType ?? undefined,
          surfaceArea: listing.surfaceAreaLabel ?? undefined,
          tags: listing.tags,
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
      updateListingCommentCount,
      preserveFeedForAuthFlow,
    }),
    [favoriteProperties, fetchListings, isLoadingListings, likedPropertyIds, likesById, listingsError, propertyListings, toggleLike, updateListingCommentCount, preserveFeedForAuthFlow],
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
