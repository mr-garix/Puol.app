import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';

type ListingRow = Database['public']['Tables']['listings']['Row'];
type InsertListing = Database['public']['Tables']['listings']['Insert'];
type UpdateListing = Database['public']['Tables']['listings']['Update'];

type ListingRoom = Database['public']['Tables']['listing_rooms']['Row'];
type InsertListingRoom = Database['public']['Tables']['listing_rooms']['Insert'];

type ListingFeature = Database['public']['Tables']['listing_features']['Row'];
type ListingMedia = Database['public']['Tables']['listing_media']['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];

const LISTING_MEDIA_BUCKET = 'listing-media';

const isRemoteUri = (uri?: string | null) => typeof uri === 'string' && /^https?:\/\//.test(uri);

type ListingFeatureBooleanColumn =
  | 'has_ac'
  | 'has_wifi'
  | 'has_parking'
  | 'generator'
  | 'prepay_meter'
  | 'sonnel_meter'
  | 'water_well'
  | 'water_heater'
  | 'security_guard'
  | 'cctv'
  | 'fan'
  | 'tv'
  | 'smart_tv'
  | 'netflix'
  | 'washing_machine'
  | 'balcony'
  | 'terrace'
  | 'veranda'
  | 'mezzanine'
  | 'garden'
  | 'pool'
  | 'gym'
  | 'rooftop'
  | 'elevator'
  | 'accessible'
  | 'is_roadside'
  | 'within_50m';

export interface LandlordMediaUploadItem {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  room?: string | null;
  muted?: boolean;
  thumbnailUrl?: string | null;
}

export interface CreateLandlordListingPayload {
  title: string;
  property_type: string;
  city: string;
  district: string;
  address_text: string;
  google_address: string | null;
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  formatted_address: string | null;
  price_per_month: number;
  deposit_amount: number | null;
  min_lease_months: number | null;
  description: string;
  is_available: boolean;
  capacity: number;
  cover_photo_url?: string | null;
}

export interface LandlordListingWithRelations {
  listing: ListingRow;
  rooms: ListingRoom | null;
  features: ListingFeature[];
  media: ListingMedia[];
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

const LONG_TERM_RENTAL_KIND = 'long_term';

const AMENITY_FEATURE_MAP: Partial<Record<string, ListingFeatureBooleanColumn>> = {
  ac: 'has_ac',
  wifi: 'has_wifi',
  parking: 'has_parking',
  generator: 'generator',
  'prepaid-meter': 'prepay_meter',
  'sonel-meter': 'sonnel_meter',
  borehole: 'water_well',
  'water-heater': 'water_heater',
  guard: 'security_guard',
  cctv: 'cctv',
  fan: 'fan',
  tv: 'tv',
  'smart-tv': 'smart_tv',
  netflix: 'netflix',
  washer: 'washing_machine',
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
  'road-direct': 'is_roadside',
  'road-50': 'within_50m',
};

const ROAD_DISTANCE_AMENITIES = new Map([
  ['road-100', 'within_100m'],
  ['road-200', 'beyond_200m'],
]);

const sanitizeNullableString = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const buildListingFeaturesPayload = (
  listingId: string,
  amenities: string[],
): TablesInsert<'listing_features'> => {
  const payload: TablesInsert<'listing_features'> = {
    listing_id: listingId,
    near_main_road: null,
  };

  amenities.forEach((amenity) => {
    if (ROAD_DISTANCE_AMENITIES.has(amenity)) {
      payload.near_main_road = ROAD_DISTANCE_AMENITIES.get(amenity) ?? null;
      return;
    }

    const column = AMENITY_FEATURE_MAP[amenity];
    if (column) {
      payload[column] = true;
    }
  });

  return payload;
};

const uploadFileToBucket = async (path: string, fileUri: string) => {
  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error('upload_fetch_failed');
  }

  const isVideo = path.endsWith('.mp4');
  const contentType = response.headers.get('Content-Type') || (isVideo ? 'video/mp4' : 'image/jpeg');
  const fileBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from(LISTING_MEDIA_BUCKET).upload(path, fileBuffer, {
    upsert: true,
    cacheControl: '3600',
    contentType,
  });
  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from(LISTING_MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) {
    throw new Error('missing_public_url');
  }
  return data.publicUrl;
};

const buildCoverStoragePath = (listingId: string, fileName?: string | null) => {
  if (fileName) {
    return `${listingId}/cover-${fileName}`;
  }
  return `${listingId}/cover-${Date.now()}.jpg`;
};

const ensureCoverUrl = async (listingId: string, coverUri?: string | null) => {
  if (!coverUri) {
    return null;
  }
  if (isRemoteUri(coverUri)) {
    return coverUri;
  }
  const coverPath = buildCoverStoragePath(listingId);
  return uploadFileToBucket(coverPath, coverUri);
};

const buildMediaStoragePath = (listingId: string, media: LandlordMediaUploadItem, position: number) => {
  const extension = media.type === 'video' ? 'mp4' : 'jpg';
  return `${listingId}/${position}-${media.id}.${extension}`;
};

const orderMediaForUpload = (media: LandlordMediaUploadItem[]) => {
  const videos = media.filter((item) => item.type === 'video');
  const photos = media.filter((item) => item.type === 'photo');
  const ordered: LandlordMediaUploadItem[] = [];
  if (videos.length > 0) {
    ordered.push(videos[0]);
  }
  ordered.push(...photos, ...videos.slice(1));
  return ordered;
};

const buildMediaRowsForSave = async (
  listingId: string,
  media: LandlordMediaUploadItem[],
): Promise<TablesInsert<'listing_media'>[]> => {
  if (!media.length) {
    return [];
  }

  const ordered = orderMediaForUpload(media);
  const rows: TablesInsert<'listing_media'>[] = [];

  for (let index = 0; index < ordered.length; index += 1) {
    const mediaItem = ordered[index];
    let mediaUrl = mediaItem.uri;

    if (!isRemoteUri(mediaUrl)) {
      const path = buildMediaStoragePath(listingId, mediaItem, index);
      mediaUrl = await uploadFileToBucket(path, mediaUrl);
    }

    rows.push({
      listing_id: listingId,
      media_url: mediaUrl,
      media_type: mediaItem.type,
      position: index,
      media_tag: mediaItem.room ?? null,
      thumbnail_url: mediaItem.thumbnailUrl ?? null,
    });
  }

  return rows;
};

export const saveListingMedia = async ({
  listingId,
  media,
  coverUri,
  deleteExisting = false,
}: {
  listingId: string;
  media: LandlordMediaUploadItem[];
  coverUri?: string | null;
  deleteExisting?: boolean;
}) => {
  // Supprimer les anciens médias AVANT de construire les nouvelles lignes
  if (deleteExisting) {
    const { error: deleteError } = await supabase
      .from('listing_media')
      .delete()
      .eq('listing_id', listingId);
    if (deleteError) {
      throw buildSupabaseError('saveListingMedia.delete', deleteError);
    }
  }

  const mediaRows = await buildMediaRowsForSave(listingId, media ?? []);

  const coverUrl = await ensureCoverUrl(listingId, coverUri);
  if (coverUrl) {
    const { error: coverError } = await supabase
      .from('listings')
      .update({ cover_photo_url: coverUrl })
      .eq('id', listingId);
    if (coverError) {
      throw buildSupabaseError('saveListingMedia.updateCover', coverError);
    }
  }

  if (!mediaRows.length) {
    return;
  }

  const { error: insertError } = await supabase.from('listing_media').insert(mediaRows);
  if (insertError) {
    throw buildSupabaseError('saveListingMedia.insert', insertError);
  }
};

const buildInsertPayload = (hostId: string, payload: CreateLandlordListingPayload): InsertListing => ({
  host_id: hostId,
  title: payload.title,
  property_type: payload.property_type,
  city: payload.city,
  district: payload.district,
  address_text: payload.address_text.trim(),
  google_address: sanitizeNullableString(payload.google_address),
  place_id: sanitizeNullableString(payload.place_id),
  latitude: payload.latitude,
  longitude: payload.longitude,
  formatted_address: sanitizeNullableString(payload.formatted_address),
  price_per_night: 0,
  price_per_month: payload.price_per_month,
  deposit_amount: payload.deposit_amount,
  min_lease_months: payload.min_lease_months,
  description: payload.description,
  is_available: payload.is_available,
  is_furnished: false,
  capacity: payload.capacity,
  cover_photo_url: payload.cover_photo_url ?? '',
  rental_kind: LONG_TERM_RENTAL_KIND,
  status: payload.is_available ? 'published' : 'draft',
  music_enabled: false,
  music_id: null,
});

const buildUpdatePayload = (payload: CreateLandlordListingPayload): UpdateListing => ({
  title: payload.title,
  property_type: payload.property_type,
  city: payload.city,
  district: payload.district,
  address_text: payload.address_text.trim(),
  google_address: sanitizeNullableString(payload.google_address),
  place_id: sanitizeNullableString(payload.place_id),
  latitude: payload.latitude,
  longitude: payload.longitude,
  formatted_address: sanitizeNullableString(payload.formatted_address),
  price_per_night: 0,
  price_per_month: payload.price_per_month,
  deposit_amount: payload.deposit_amount,
  min_lease_months: payload.min_lease_months,
  description: payload.description,
  is_available: payload.is_available,
  is_furnished: false,
  capacity: payload.capacity,
  cover_photo_url: payload.cover_photo_url ?? '',
  rental_kind: LONG_TERM_RENTAL_KIND,
  status: payload.is_available ? 'published' : 'draft',
  music_enabled: false,
  music_id: null,
});

const buildSupabaseError = (operation: string, error: any) => {
  console.error(`[LandlordListings][${operation}] Supabase error`, error);
  const messageParts = [error?.message, error?.details, error?.hint].filter(Boolean);
  return new Error(messageParts.join(' - ') || 'Erreur Supabase inconnue');
};

export const createLandlordListing = async (hostId: string, payload: CreateLandlordListingPayload) => {
  const insertPayload = buildInsertPayload(hostId, payload);
  const { data, error } = await supabase
    .from('listings')
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw buildSupabaseError('createLandlordListing', error);
  return data;
};

export const updateLandlordListing = async (id: string, payload: CreateLandlordListingPayload) => {
  const updatePayload = buildUpdatePayload(payload);
  const { data, error } = await supabase
    .from('listings')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw buildSupabaseError('updateLandlordListing', error);
  return data;
};

export const getLandlordListingById = async (id: string): Promise<LandlordListingWithRelations | null> => {
  // Récupérer l'annonce principale
  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .select('*')
    .eq('id', id)
    .eq('rental_kind', 'long_term')
    .single();

  if (listingError || !listing) return null;

  // Récupérer les pièces
  const { data: rooms, error: roomsError } = await supabase
    .from('listing_rooms')
    .select('*')
    .eq('listing_id', listing.id)
    .single();

  // Récupérer les features
  const { data: features, error: featuresError } = await supabase
    .from('listing_features')
    .select('*')
    .eq('listing_id', listing.id);

  // Récupérer les médias
  const { data: media, error: mediaError } = await supabase
    .from('listing_media')
    .select('*')
    .eq('listing_id', id)
    .order('position', { ascending: true });

  const { count: viewCount = 0 } = await supabase
    .from('listing_views')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', id);

  const { count: likeCount = 0 } = await supabase
    .from('listing_likes')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', id);

  const { count: commentCount = 0 } = await supabase
    .from('listing_comments')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', id);

  return {
    listing,
    rooms: roomsError ? null : rooms,
    features: featuresError ? [] : features || [],
    media: mediaError ? [] : media || [],
    viewCount: viewCount ?? 0,
    likeCount: likeCount ?? 0,
    commentCount: commentCount ?? 0,
  };
};

export const getLandlordListingsByProfileId = async (profileId: string): Promise<LandlordListingWithRelations[]> => {
  // Récupérer toutes les annonces du landlord
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('*')
    .eq('host_id', profileId)
    .eq('rental_kind', 'long_term')
    .order('created_at', { ascending: false });

  if (listingsError || !listings) return [];

  // Pour chaque annonce, récupérer les relations
  const listingsWithRelations = await Promise.all(
    listings.map(async (listing: ListingRow) => {
      const [
        { data: rooms },
        { data: features },
        { data: media },
        { count: viewsCount = 0 },
        { count: likesCount = 0 },
        { count: commentsCount = 0 },
      ] = await Promise.all([
        supabase
          .from('listing_rooms')
          .select('*')
          .eq('listing_id', listing.id)
          .single(),
        supabase
          .from('listing_features')
          .select('*')
          .eq('listing_id', listing.id),
        supabase
          .from('listing_media')
          .select('*')
          .eq('listing_id', listing.id)
          .order('position', { ascending: true }),
        supabase
          .from('listing_views')
          .select('id', { count: 'exact', head: true })
          .eq('listing_id', listing.id),
        supabase
          .from('listing_likes')
          .select('id', { count: 'exact', head: true })
          .eq('listing_id', listing.id),
        supabase
          .from('listing_comments')
          .select('id', { count: 'exact', head: true })
          .eq('listing_id', listing.id),
      ]);

      return {
        listing,
        rooms: rooms || null,
        features: features || [],
        media: media || [],
        viewCount: viewsCount ?? 0,
        likeCount: likesCount ?? 0,
        commentCount: commentsCount ?? 0,
      };
    })
  );

  return listingsWithRelations;
};

export const upsertListingRooms = async (listingId: string, rooms: InsertListingRoom) => {
  const payload = {
    ...rooms,
    listing_id: rooms.listing_id || listingId,
  };
  
  const { data, error } = await supabase
    .from('listing_rooms')
    .upsert(payload, { onConflict: 'listing_id' })
    .select()
    .single();

  if (error) throw buildSupabaseError('upsertListingRooms', error);
  return data;
};

export const updateListingFeatures = async (listingId: string, amenities: string[]) => {
  // Supprimer toutes les features existantes pour ce listing
  await supabase
    .from('listing_features')
    .delete()
    .eq('listing_id', listingId);

  if (amenities.length === 0) {
    return null;
  }

  const insertPayload = buildListingFeaturesPayload(listingId, amenities);

  const { data, error } = await supabase
    .from('listing_features')
    .insert(insertPayload)
    .select()
    .single();

  if (error) throw buildSupabaseError('updateListingFeatures', error);
  return data;
};

export const deleteLandlordListing = async (id: string) => {
  // Supprimer d'abord les relations
  await supabase.from('listing_rooms').delete().eq('listing_id', id);
  await supabase.from('listing_features').delete().eq('listing_id', id);
  await supabase.from('listing_media').delete().eq('listing_id', id);

  // Supprimer l'annonce principale
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id);

  if (error) throw buildSupabaseError('deleteLandlordListing', error);
};
