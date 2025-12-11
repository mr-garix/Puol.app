import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/src/constants/storageKeys';
import { supabase } from '@/src/supabaseClient';
import type { Database } from '@/src/types/supabase.generated';

const LISTING_MEDIA_BUCKET = 'listing-media';
const isRemoteUri = (uri?: string | null) => typeof uri === 'string' && /^https?:\/\//.test(uri);

const AVAILABILITY_STATUS = {
  BLOCKED: 'blocked' as const,
  RESERVED: 'reserved' as const,
};

const AVAILABILITY_SOURCE = {
  MANUAL: 'manual' as const,
  BOOKING: 'booking' as const,
};

type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];

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
  | 'accessible';

export type MediaUploadItem = {
  id: string;
  uri: string;
  type: 'photo' | 'video';
  room?: string | null;
  muted?: boolean;
};

export type CreateListingPayload = {
  hostId: string;
  title: string;
  city: string;
  district: string;
  addressText: string;
  googleAddress?: string | null;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  propertyType: string;
  pricePerNight: number;
  capacity: number;
  description: string;
  coverPhotoUri: string;
  coverFileName?: string;
  musicEnabled: boolean;
  musicId?: string | null;
  amenities: string[];
  rooms: {
    living: number;
    bedrooms: number;
    kitchen: number;
    bathrooms: number;
    dining: number;
    toilets: number;
  };
  blockedDates: Set<string>;
  reservedDates: Set<string>;
  promotion?: {
    nights: number;
    discountPercent: number;
  } | null;
  media: MediaUploadItem[];
  publish?: boolean;
};

export type CreateListingResult = {
  listingId: string;
};

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
};

const ROAD_AMENITIES = new Set(['road-100', 'road-200']);

const getUserRole = async (): Promise<'host' | 'landlord'> => {
  try {
    const storedRole = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
    if (storedRole === 'landlord') {
      return 'landlord';
    }
    return 'host';
  } catch (error) {
    console.warn('[ListingService] Failed to read user role, defaulting to host', error);
    return 'host';
  }
};

const uploadFileToBucket = async (path: string, fileUri: string) => {
  const response = await fetch(fileUri);
  if (!response.ok) {
    throw new Error('upload_fetch_failed');
  }

  const contentType = response.headers.get('Content-Type') || (path.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg');
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

const buildMediaStoragePath = (listingId: string, media: MediaUploadItem, position: number) => {
  const extension = media.type === 'video' ? 'mp4' : 'jpg';
  return `${listingId}/${position}-${media.id}.${extension}`;
};

const buildCoverStoragePath = (listingId: string, fileName?: string) => {
  if (fileName) {
    return `${listingId}/cover-${fileName}`;
  }
  return `${listingId}/cover-${Date.now()}.jpg`;
};

const ensureCoverUrl = async (listingId: string, coverUri: string, coverFileName?: string) => {
  if (!coverUri) {
    throw new Error('cover_missing');
  }
  if (isRemoteUri(coverUri)) {
    return coverUri;
  }
  const coverPath = buildCoverStoragePath(listingId, coverFileName);
  return uploadFileToBucket(coverPath, coverUri);
};

const buildFeaturePayload = (listingId: string, amenities: string[]): TablesInsert<'listing_features'> => {
  const payload: TablesInsert<'listing_features'> = {
    listing_id: listingId,
    near_main_road: null,
  };
  amenities.forEach((amenity) => {
    if (ROAD_AMENITIES.has(amenity)) {
      payload.near_main_road = amenity === 'road-100' ? 'within_100m' : 'beyond_200m';
      return;
    }
    const column = AMENITY_FEATURE_MAP[amenity];
    if (column) {
      payload[column] = true;
    }
  });
  return payload;
};

const buildRoomsPayload = (listingId: string, rooms: CreateListingPayload['rooms']): TablesInsert<'listing_rooms'> => ({
  listing_id: listingId,
  living_room: rooms.living,
  bedrooms: rooms.bedrooms,
  kitchen: rooms.kitchen,
  bathrooms: rooms.bathrooms,
  dining_room: rooms.dining,
  toilets: rooms.toilets,
});

const buildAvailabilityRows = (listingId: string, blocked: Set<string>, reserved: Set<string>): TablesInsert<'listing_availability'>[] => {
  const rows: TablesInsert<'listing_availability'>[] = [];
  blocked.forEach((iso) => {
    rows.push({
      listing_id: listingId,
      date: iso,
      status: AVAILABILITY_STATUS.BLOCKED,
      source: AVAILABILITY_SOURCE.MANUAL,
    });
  });
  reserved.forEach((iso) => {
    rows.push({
      listing_id: listingId,
      date: iso,
      status: AVAILABILITY_STATUS.RESERVED,
      source: AVAILABILITY_SOURCE.BOOKING,
    });
  });
  return rows;
};

const buildPromotionPayload = (
  listingId: string,
  promo?: CreateListingPayload['promotion'] | null,
): TablesInsert<'listing_promotions'> | null => {
  if (!promo || !promo.nights || !promo.discountPercent) {
    return null;
  }
  return {
    listing_id: listingId,
    nights_required: promo.nights,
    discount_percent: promo.discountPercent,
  };
};

const orderMediaForUpload = (media: MediaUploadItem[]): MediaUploadItem[] => {
  const videos = media.filter((item) => item.type === 'video');
  const photos = media.filter((item) => item.type === 'photo');
  const primaryVideo = videos[0];
  const secondaryVideos = videos.slice(1);
  const ordered: MediaUploadItem[] = [];
  if (primaryVideo) {
    ordered.push(primaryVideo);
  }
  ordered.push(...photos, ...secondaryVideos);
  return ordered;
};

const buildMediaRowsForSave = async (
  listingId: string,
  media: MediaUploadItem[],
): Promise<TablesInsert<'listing_media'>[]> => {
  const orderedMedia = orderMediaForUpload(media);
  if (orderedMedia.length === 0) {
    throw new Error('media_missing');
  }

  const rows: TablesInsert<'listing_media'>[] = [];
  for (let index = 0; index < orderedMedia.length; index += 1) {
    const mediaItem = orderedMedia[index];
    let mediaUrl = mediaItem.uri;
    if (!isRemoteUri(mediaItem.uri)) {
      const path = buildMediaStoragePath(listingId, mediaItem, index);
      mediaUrl = await uploadFileToBucket(path, mediaItem.uri);
    }
    rows.push({
      listing_id: listingId,
      media_url: mediaUrl,
      media_type: mediaItem.type,
      position: index,
      media_tag: mediaItem.room ?? null,
    });
  }

  return rows;
};

export const createListingWithRelations = async (payload: CreateListingPayload): Promise<CreateListingResult> => {
  const role = await getUserRole();
  const isFurnished = role === 'host';

  const { data: listingData, error: listingError } = await supabase
    .from('listings')
    .insert({
      host_id: payload.hostId,
      title: payload.title,
      property_type: payload.propertyType,
      price_per_night: payload.pricePerNight,
      city: payload.city,
      district: payload.district,
      address_text: payload.addressText,
      google_address: payload.googleAddress ?? null,
      place_id: payload.placeId ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      formatted_address: payload.formattedAddress ?? null,
      capacity: payload.capacity,
      description: payload.description,
      cover_photo_url: '',
      music_enabled: payload.musicEnabled,
      music_id: payload.musicId ?? null,
      is_furnished: isFurnished,
      status: payload.publish === false ? 'draft' : 'published',
    })
    .select('id')
    .single();

  if (listingError || !listingData?.id) {
    throw listingError ?? new Error('listing_insert_failed');
  }

  const listingId = listingData.id;

  const coverUrl = await ensureCoverUrl(listingId, payload.coverPhotoUri, payload.coverFileName);

  const mediaRows = await buildMediaRowsForSave(listingId, payload.media);

  const featurePayload = payload.amenities.length > 0 ? buildFeaturePayload(listingId, payload.amenities) : null;
  const roomsPayload = buildRoomsPayload(listingId, payload.rooms);
  const availabilityRows = buildAvailabilityRows(listingId, payload.blockedDates, payload.reservedDates);
  const promotionPayload = buildPromotionPayload(listingId, payload.promotion ?? null);

  const { error: coverUpdateError } = await supabase
    .from('listings')
    .update({ cover_photo_url: coverUrl })
    .eq('id', listingId);
  if (coverUpdateError) {
    throw coverUpdateError;
  }

  const { error: mediaError } = await supabase.from('listing_media').insert(mediaRows);
  if (mediaError) {
    throw mediaError;
  }

  const { error: roomsError } = await supabase.from('listing_rooms').insert(roomsPayload);
  if (roomsError) {
    throw roomsError;
  }

  if (featurePayload) {
    const { error } = await supabase.from('listing_features').insert(featurePayload);
    if (error) {
      throw error;
    }
  }

  if (availabilityRows.length > 0) {
    const { error } = await supabase.from('listing_availability').insert(availabilityRows);
    if (error) {
      throw error;
    }
  }

  if (promotionPayload) {
    const { error } = await supabase.from('listing_promotions').insert(promotionPayload);
    if (error) {
      throw error;
    }
  }

  return { listingId };
};

export const deleteListingWithRelations = async (listingId: string): Promise<void> => {
  if (!listingId) {
    throw new Error('missing_listing_id');
  }

  await supabase.from('listing_media').delete().eq('listing_id', listingId);
  await supabase.from('listing_rooms').delete().eq('listing_id', listingId);
  await supabase.from('listing_features').delete().eq('listing_id', listingId);
  await supabase.from('listing_availability').delete().eq('listing_id', listingId);
  await supabase.from('listing_promotions').delete().eq('listing_id', listingId);

  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', listingId);

  if (error) {
    throw error;
  }
};

export type UpdateListingPayload = CreateListingPayload & {
  listingId: string;
};

export const updateListingWithRelations = async (payload: UpdateListingPayload): Promise<void> => {
  const { listingId } = payload;
  if (!listingId) {
    throw new Error('missing_listing_id');
  }

  const coverUrl = await ensureCoverUrl(listingId, payload.coverPhotoUri, payload.coverFileName);

  const { error: listingError } = await supabase
    .from('listings')
    .update({
      title: payload.title,
      property_type: payload.propertyType,
      price_per_night: payload.pricePerNight,
      city: payload.city,
      district: payload.district,
      address_text: payload.addressText,
      google_address: payload.googleAddress ?? null,
      place_id: payload.placeId ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      formatted_address: payload.formattedAddress ?? null,
      capacity: payload.capacity,
      description: payload.description,
      cover_photo_url: coverUrl,
      music_enabled: payload.musicEnabled,
      music_id: payload.musicId ?? null,
      status: payload.publish === false ? 'draft' : 'published',
    })
    .eq('id', listingId);

  if (listingError) {
    throw listingError;
  }

  const mediaRows = await buildMediaRowsForSave(listingId, payload.media);
  const featurePayload = payload.amenities.length > 0 ? buildFeaturePayload(listingId, payload.amenities) : null;
  const roomsPayload = buildRoomsPayload(listingId, payload.rooms);
  const availabilityRows = buildAvailabilityRows(listingId, payload.blockedDates, payload.reservedDates);
  const promotionPayload = buildPromotionPayload(listingId, payload.promotion ?? null);

  const { error: mediaDeleteError } = await supabase.from('listing_media').delete().eq('listing_id', listingId);
  if (mediaDeleteError) {
    throw mediaDeleteError;
  }
  if (mediaRows.length > 0) {
    const { error } = await supabase.from('listing_media').insert(mediaRows);
    if (error) {
      throw error;
    }
  }

  const { error: roomsDeleteError } = await supabase.from('listing_rooms').delete().eq('listing_id', listingId);
  if (roomsDeleteError) {
    throw roomsDeleteError;
  }
  const { error: roomsError } = await supabase.from('listing_rooms').insert(roomsPayload);
  if (roomsError) {
    throw roomsError;
  }

  const { error: featuresDeleteError } = await supabase.from('listing_features').delete().eq('listing_id', listingId);
  if (featuresDeleteError) {
    throw featuresDeleteError;
  }
  if (featurePayload) {
    const { error } = await supabase.from('listing_features').insert(featurePayload);
    if (error) {
      throw error;
    }
  }

  const { error: availabilityDeleteError } = await supabase.from('listing_availability').delete().eq('listing_id', listingId);
  if (availabilityDeleteError) {
    throw availabilityDeleteError;
  }
  if (availabilityRows.length > 0) {
    const { error } = await supabase.from('listing_availability').insert(availabilityRows);
    if (error) {
      throw error;
    }
  }

  const { error: promotionDeleteError } = await supabase.from('listing_promotions').delete().eq('listing_id', listingId);
  if (promotionDeleteError) {
    throw promotionDeleteError;
  }
  if (promotionPayload) {
    const { error } = await supabase.from('listing_promotions').insert(promotionPayload);
    if (error) {
      throw error;
    }
  }
};
