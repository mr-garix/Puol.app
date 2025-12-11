import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Switch,
  Alert,
  Platform,
  ActionSheetIOS,
  Modal,
  Dimensions,
  ActivityIndicator,
  TouchableWithoutFeedback,
  LayoutChangeEvent,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { StatusBar } from 'expo-status-bar';
import { Audio, Video, ResizeMode, InterruptionModeIOS, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { PROPERTY_AMENITIES, type AmenityOption } from '@/src/constants/amenities';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
/*
import * as FileSystem from 'expo-file-system';
import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
*/

import { useAuth } from '@/src/contexts/AuthContext';
import { useFeed } from '@/src/contexts/FeedContext';
import { useListingDetails } from '@/src/features/listings/hooks';
import type { FullListing, ListingFeatureFlagKeys, ListingFeaturesRow } from '@/src/types/listings';
import { createListingWithRelations, updateListingWithRelations, deleteListingWithRelations } from '@/src/features/listings/services';
import { hasOutstandingPaymentsForListing } from '@/src/features/bookings/services';
import { MUSIC_LIBRARY } from '@/src/constants/music';
import {
  createPlacesSessionToken,
  fetchPlaceSuggestions,
  fetchPlaceDetails,
  type PlaceSuggestion,
  type PlaceDetails,
} from '@/src/features/search/services/googlePlaces';

const COLORS = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  muted: '#6B7280',
  dark: '#0F172A',
  accent: '#2ECC71',
  danger: '#DC2626',
};

const getPickerErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    if (error.message.includes('Camera is not supported on web')) {
      return 'La caméra n’est pas disponible sur ce simulateur. Testez sur un appareil physique.';
    }
    if (error.message.includes('User cancelled image picker')) {
      return 'Sélection annulée.';
    }
    return error.message;
  }
  return fallback;
};

const ROOM_COUNTERS = ['Salon', 'Chambre', 'Cuisine', 'Salle de bain', 'Salle à manger', 'Toilette'] as const;
const createEmptyRoomCounts = (): Record<(typeof ROOM_COUNTERS)[number], number> => ({
  Salon: 0,
  Chambre: 0,
  Cuisine: 0,
  'Salle de bain': 0,
  'Salle à manger': 0,
  Toilette: 0,
});
const AVAILABILITY_MODES = [
  { key: 'available', label: 'Dates disponibles', accent: COLORS.accent, tint: 'rgba(46,204,113,0.15)' },
  { key: 'blocked', label: 'Dates bloquées', accent: COLORS.danger, tint: 'rgba(220,38,38,0.15)' },
  { key: 'reserved', label: 'Dates réservées', accent: '#F97316', tint: 'rgba(249,115,22,0.2)' },
] as const;
const LISTING_TYPES = [
  'Appartement',
  'Studio',
  'Chambre',
  'Maison',
  'Villa',
  'Penthouse',
  'Duplex',
  'Suite',
  'Loft',
  'Maison d’hôtes',
  'Boutique',
  'Espace commercial',
  'Bureau',
  'Terrain',
] as const;

const CALENDAR_CELLS = 42; // 6 semaines visibles

const getIsoDateWithOffset = (offset: number) => {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + offset);
  return base.toISOString().split('T')[0];
};

const parseCityDistrict = (rawAddress: string) => {
  const parts = rawAddress
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const city = parts.pop()!;
    const district = parts.join(', ');
    return { city, district, isValid: true };
  }
  const fallback = parts[0] ?? '';
  return { city: fallback, district: fallback, isValid: false };
};

const formatSuggestionAddress = (suggestion: PlaceSuggestion) => {
  const normalize = (text?: string) =>
    (text ?? '')
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);

  const [cityFromSecondary] = normalize(suggestion.secondary);
  if (cityFromSecondary) {
    return `${suggestion.primary}, ${cityFromSecondary}`;
  }

  const descriptionParts = normalize(suggestion.description);
  if (descriptionParts.length >= 2) {
    return `${descriptionParts[0]}, ${descriptionParts[1]}`;
  }

  return suggestion.description?.trim() || suggestion.primary;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findComponentLongName = (components: PlaceDetails['components'], typeCandidates: string[]) => {
  if (!Array.isArray(components)) {
    return '';
  }
  const match = components.find((component) =>
    component?.types?.some((type: string) => typeCandidates.includes(type)),
  );
  return match?.long_name ?? '';
};

const resolveCityFromComponents = (components: PlaceDetails['components']) =>
  findComponentLongName(components, ['locality', 'administrative_area_level_2', 'administrative_area_level_1']);

const resolveDistrictFromComponents = (components: PlaceDetails['components']) =>
  findComponentLongName(components, ['sublocality_level_1', 'sublocality', 'neighborhood', 'political']);

const stripTrailingCity = (addressValue: string, cityValue: string) => {
  if (!addressValue || !cityValue) {
    return addressValue;
  }
  const pattern = new RegExp(`(,?\\s*)${escapeRegExp(cityValue)}$`, 'i');
  return addressValue.replace(pattern, '').trim();
};

const deriveDistrictValue = (params: { address: string; city: string; fallbackDistrict: string }) => {
  const addressValue = params.address.trim();
  const fallbackDistrict = params.fallbackDistrict.trim();
  const cityValue = params.city.trim();

  if (fallbackDistrict) {
    const cityLower = cityValue.toLowerCase();
    const districtLower = fallbackDistrict.toLowerCase();
    if (!cityLower || districtLower !== cityLower) {
      return fallbackDistrict;
    }
  }

  if (!addressValue) {
    return '';
  }

  if (cityValue) {
    const stripped = stripTrailingCity(addressValue, cityValue);
    if (stripped && stripped.toLowerCase() !== cityValue.toLowerCase()) {
      return stripped;
    }
  }

  const { district } = parseCityDistrict(addressValue);
  return district || addressValue;
};

type CalendarDay = {
  iso: string;
  shortWeekday: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isPast: boolean;
};

type CalendarMonth = {
  label: string;
  days: CalendarDay[];
};

const toLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildCalendarMonth = (monthOffset = 0): CalendarMonth => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today);
  monthStart.setDate(1);
  monthStart.setMonth(monthStart.getMonth() + monthOffset);

  const labelRaw = monthStart.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const label = labelRaw.charAt(0).toUpperCase() + labelRaw.slice(1);

  const firstWeekday = (monthStart.getDay() + 6) % 7; // lundi = 0
  const cursor = new Date(monthStart);
  cursor.setDate(monthStart.getDate() - firstWeekday);

  const days: CalendarDay[] = [];
  for (let index = 0; index < CALENDAR_CELLS; index += 1) {
    cursor.setHours(0, 0, 0, 0);
    const iso = toLocalIsoDate(cursor);
    const shortWeekday = cursor.toLocaleDateString('fr-FR', { weekday: 'short' });
    const dayNumber = cursor.getDate();
    const inCurrentMonth = cursor.getMonth() === monthStart.getMonth();
    const isPast = cursor < today;
    days.push({ iso, shortWeekday, dayNumber, inCurrentMonth, isPast });
    cursor.setDate(cursor.getDate() + 1);
  }

  return { label, days };
};

type FeatherIconName = React.ComponentProps<typeof Feather>['name'];
type MaterialIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];
type IconDescriptor = { library: 'Feather'; name: FeatherIconName } | { library: 'MaterialCommunityIcons'; name: MaterialIconName };

const AMENITY_OPTIONS: AmenityOption[] = [...PROPERTY_AMENITIES];

const renderAmenityIcon = (icon: IconDescriptor, color: string): React.ReactNode => {
  if (icon.library === 'Feather') {
    return <Feather name={icon.name} size={16} color={color} />;
  }
  return <MaterialCommunityIcons name={icon.name} size={16} color={color} />;
};

const VOLUME_PRESETS = [
  { id: 'low', label: 'Faible', value: 0.35 },
  { id: 'medium', label: 'Medium', value: 0.65 },
  { id: 'high', label: 'Fort', value: 0.9 },
] as const;

type VolumePresetId = (typeof VOLUME_PRESETS)[number]['id'];

type RoomType = (typeof ROOM_COUNTERS)[number];
type ListingType = '' | (typeof LISTING_TYPES)[number];
type AmenityId = (typeof AMENITY_OPTIONS)[number]['id'];
type AvailabilityModeKey = (typeof AVAILABILITY_MODES)[number]['key'];

type MediaItem = {
  id: string;
  type: 'photo' | 'video';
  uri: string;
  room: RoomType | null;
  muted: boolean;
  duration: number;
  source: 'camera' | 'library';
  coverUri?: string;
};

type FieldErrorKey =
  | 'media'
  | 'cover'
  | 'title'
  | 'price'
  | 'address'
  | 'city'
  | 'listingType'
  | 'rooms'
  | 'description'
  | 'amenities';

const createFieldErrors = (): Record<FieldErrorKey, string | null> => ({
  media: null,
  cover: null,
  title: null,
  price: null,
  address: null,
  city: null,
  listingType: null,
  rooms: null,
  description: null,
  amenities: null,
});

const REQUIRED_FIELD_ORDER: FieldErrorKey[] = ['media', 'cover', 'title', 'price', 'address', 'city', 'listingType', 'rooms', 'description', 'amenities'];

const LONG_CLIP_THRESHOLD = 90; // seconds
const PHOTO_TARGET_RATIO = 9 / 16;
const PHOTO_RATIO_TOLERANCE = 0.01;
const COVER_TARGET_RATIO = 1;
const COVER_RATIO_TOLERANCE = 0.02;

const ensurePhotoAspectRatio = async (asset: ImagePicker.ImagePickerAsset) => {
  if (!asset || asset.type?.toLowerCase().includes('video')) {
    return asset;
  }
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  if (!width || !height) {
    return asset;
  }
  const ratio = width / height;
  if (Math.abs(ratio - PHOTO_TARGET_RATIO) <= PHOTO_RATIO_TOLERANCE) {
    return asset;
  }
  let cropWidth = width;
  let cropHeight = height;
  if (ratio > PHOTO_TARGET_RATIO) {
    cropWidth = Math.round(height * PHOTO_TARGET_RATIO);
  } else {
    cropHeight = Math.round(width / PHOTO_TARGET_RATIO);
  }
  const originX = Math.max(0, Math.round((width - cropWidth) / 2));
  const originY = Math.max(0, Math.round((height - cropHeight) / 2));
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [
      {
        crop: {
          originX,
          originY,
          width: cropWidth,
          height: cropHeight,
        },
      },
    ],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
  );
  return {
    ...asset,
    uri: result.uri,
    width: cropWidth,
    height: cropHeight,
  } as ImagePicker.ImagePickerAsset;
};

const ensureCoverAspectRatio = async (asset: ImagePicker.ImagePickerAsset) => {
  if (!asset || asset.type?.toLowerCase().includes('video')) {
    return asset;
  }
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  if (!width || !height) {
    return asset;
  }
  const ratio = width / height;
  if (Math.abs(ratio - COVER_TARGET_RATIO) <= COVER_RATIO_TOLERANCE) {
    return asset;
  }
  const side = Math.min(width, height);
  const originX = Math.max(0, Math.round((width - side) / 2));
  const originY = Math.max(0, Math.round((height - side) / 2));
  const result = await ImageManipulator.manipulateAsync(
    asset.uri,
    [
      {
        crop: {
          originX,
          originY,
          width: side,
          height: side,
        },
      },
    ],
    { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
  );
  return {
    ...asset,
    uri: result.uri,
    width: side,
    height: side,
  } as ImagePicker.ImagePickerAsset;
};

const formatDuration = (totalSeconds: number) => {
  if (!totalSeconds || Number.isNaN(totalSeconds)) {
    return '0:00';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, Math.round(totalSeconds - minutes * 60));
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getVolumeValue = (presetId: VolumePresetId) =>
  VOLUME_PRESETS.find((preset) => preset.id === presetId)?.value ?? 0.65;

const VIDEO_MEDIA_TYPES = ['videos'] as unknown as ImagePicker.MediaTypeOptions;
const PHOTO_MEDIA_TYPES = ['images'] as unknown as ImagePicker.MediaTypeOptions;
const LIBRARY_MEDIA_TYPES = ['videos', 'images'] as unknown as ImagePicker.MediaTypeOptions;

const buildMediaItemFromAsset = (
  asset: ImagePicker.ImagePickerAsset,
  source: MediaItem['source'],
): MediaItem => {
  const uri = asset?.uri;
  if (!uri) {
    throw new Error('URI indisponible');
  }
  const isVideo = asset?.type?.toLowerCase().includes('video');
  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: isVideo ? 'video' : 'photo',
    uri,
    room: null,
    muted: false,
    duration: isVideo ? asset.duration ?? 0 : 0,
    source,
  };
};

const ensureLeadVideo = (items: MediaItem[]) => {
  const firstVideoIndex = items.findIndex((item) => item.type === 'video');
  if (firstVideoIndex <= 0) {
    return items;
  }
  const nextItems = [...items];
  const [leadVideo] = nextItems.splice(firstVideoIndex, 1);
  return [leadVideo, ...nextItems];
};

/*
const VIDEO_OPTIMIZATION = {
  width: 1080,
  fps: 30,
  bitrate: 1500,
  maxrate: 2000,
  bufsize: 4000,
};

const stripFileScheme = (uri: string) => (uri?.startsWith('file://') ? uri.replace('file://', '') : uri);

const ensureCachePath = () => {
  const basePath = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!basePath) {
    throw new Error('cache_dir_unavailable');
  }
  return `${basePath}puol-video-${Date.now()}.mp4`;
};
*/

const FEATURE_COLUMN_TO_AMENITY: Partial<Record<ListingFeatureFlagKeys, AmenityId>> = {
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
};

const mapFeaturesToAmenities = (features: ListingFeaturesRow | null): AmenityId[] => {
  if (!features) {
    return [];
  }

  const amenities: AmenityId[] = [];
  (Object.entries(features) as [keyof ListingFeaturesRow, boolean | string | null][]).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    if (key === 'near_main_road') {
      if (value === 'within_100m') {
        amenities.push('road-100');
      } else if (value === 'beyond_200m') {
        amenities.push('road-200');
      }
      return;
    }

    const amenityId = FEATURE_COLUMN_TO_AMENITY[key as ListingFeatureFlagKeys];
    if (amenityId) {
      amenities.push(amenityId);
    }
  });

  return amenities;
};

const mapRoomsToCounts = (rooms?: FullListing['rooms']) => {
  const base = createEmptyRoomCounts();
  if (!rooms) {
    return base;
  }
  return {
    ...base,
    Salon: rooms.living ?? base.Salon,
    Chambre: rooms.bedrooms ?? base.Chambre,
    Cuisine: rooms.kitchen ?? base.Cuisine,
    'Salle de bain': rooms.bathrooms ?? base['Salle de bain'],
    'Salle à manger': rooms.dining ?? base['Salle à manger'],
    Toilette: rooms.toilets ?? base.Toilette,
  };
};

const mapAvailability = (availability?: FullListing['availability']) => {
  const blocked = new Set<string>();
  const reserved = new Set<string>();
  availability?.forEach((entry) => {
    if (!entry.date) {
      return;
    }
    if (entry.status === 'blocked') {
      blocked.add(entry.date);
    }
    if (entry.status === 'reserved') {
      reserved.add(entry.date);
    }
  });
  return { blocked, reserved };
};

export default function HostListingEditScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const headerTopPadding = Math.max(insets.top - 40, 2);
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isCreateMode = !id;
  const { firebaseUser } = useAuth();
  const { refreshListings: refreshFeedListings } = useFeed();
  const {
    data: existingListing,
    isLoading: isLoadingListing,
    error: loadError,
    refresh: refreshListing,
  } = useListingDetails(id);

  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [address, setAddress] = useState('');
  const [googleAddress, setGoogleAddress] = useState('');
  const [description, setDescription] = useState('');
  const [listingType, setListingType] = useState<ListingType>(LISTING_TYPES[0]);
  const [roomCounts, setRoomCounts] = useState<Record<RoomType, number>>(() => createEmptyRoomCounts() as Record<RoomType, number>);
  const [amenities, setAmenities] = useState<AmenityId[]>([]);
  const [selectedAvailabilityMode, setSelectedAvailabilityMode] = useState<AvailabilityModeKey>('available');
  const [guestCapacity, setGuestCapacity] = useState(0);
  const [promoNights, setPromoNights] = useState(isCreateMode ? '' : '7');
  const [promoDiscount, setPromoDiscount] = useState(isCreateMode ? '' : '10');
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const calendarMonth = useMemo(() => buildCalendarMonth(calendarMonthOffset), [calendarMonthOffset]);
  const calendarDays = calendarMonth.days;
  const [blockedDates, setBlockedDates] = useState<Set<string>>(() =>
    isCreateMode ? new Set() : new Set([getIsoDateWithOffset(7), getIsoDateWithOffset(8), getIsoDateWithOffset(20), getIsoDateWithOffset(35)]),
  );
  const [reservedDates, setReservedDates] = useState<Set<string>>(() =>
    isCreateMode ? new Set() : new Set([getIsoDateWithOffset(2), getIsoDateWithOffset(5), getIsoDateWithOffset(12), getIsoDateWithOffset(40)]),
  );
  const [selectedCalendarDates, setSelectedCalendarDates] = useState<Set<string>>(new Set());
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [selectedMusicId, setSelectedMusicId] = useState<string>(MUSIC_LIBRARY[0].id);
  const [volumePreset, setVolumePreset] = useState<VolumePresetId>('medium');
  const [coverPhotoUri, setCoverPhotoUri] = useState<string>('');
  const [addressSearch, setAddressSearch] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<PlaceSuggestion[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const addressSessionTokenRef = useRef<string | null>(null);
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cityInput, setCityInput] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<PlaceSuggestion[]>([]);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [isCityLoading, setIsCityLoading] = useState(false);
  const citySessionTokenRef = useRef<string | null>(null);
  const cityDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityBlurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const addressDetailsRequestRef = useRef<string | null>(null);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedLatitude, setSelectedLatitude] = useState<number | null>(null);
  const [selectedLongitude, setSelectedLongitude] = useState<number | null>(null);
  const [formattedAddress, setFormattedAddress] = useState('');
  const [resolvedDistrict, setResolvedDistrict] = useState('');
  const soundRef = useRef<Audio.Sound | null>(null);
  const previewVideoRef = useRef<Video | null>(null);
  const previewWasPlayingRef = useRef(true);
  const previewCompletedRef = useRef(false);
  const previewVisibleRef = useRef(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const fieldPositionsRef = useRef<Partial<Record<FieldErrorKey, number>>>({});
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  const [previewSeekMillis, setPreviewSeekMillis] = useState(0);
  const [previewVideoLoading, setPreviewVideoLoading] = useState(false);
  const [previewDurationMillis, setPreviewDurationMillis] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [publishSuccessVisible, setPublishSuccessVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastCreatedListingId, setLastCreatedListingId] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState(createFieldErrors());

  const resetForm = useCallback(() => {
    setTitle('');
    setPrice('');
    setAddress('');
    setGoogleAddress('');
    setDescription('');
    setListingType('' as ListingType);
    setRoomCounts(createEmptyRoomCounts() as Record<RoomType, number>);
    setGuestCapacity(1);
    setAddress('');
    setAddressSearch('');
    setAddressSuggestions([]);
    setShowAddressDropdown(false);
    setIsAddressLoading(false);
    setCityInput('');
    setCitySuggestions([]);
    setShowCityDropdown(false);
    setIsCityLoading(false);
    setGoogleAddress('');
    setDescription('');
    setAmenities([]);
    setBlockedDates(new Set());
    setSelectedCalendarDates(new Set());
    setPromoDiscount('');
    setMusicEnabled(true);
    setSelectedMusicId(MUSIC_LIBRARY[0].id);
    setVolumePreset('medium');
    setCoverPhotoUri('');
    setSelectedPlaceId(null);
    setSelectedLatitude(null);
    setSelectedLongitude(null);
    setFormattedAddress('');
    setResolvedDistrict('');
    addressSessionTokenRef.current = null;
    citySessionTokenRef.current = null;
    addressDetailsRequestRef.current = null;
    setFieldErrors(createFieldErrors());
    setPreviewMedia(null);
  }, []);

  const stopPreview = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
      } catch (error) {
        // ignore
      }
      try {
        await soundRef.current.unloadAsync();
      } catch (error) {
        // ignore
      }
      soundRef.current = null;
    }
    setCurrentlyPlayingId(null);
  }, []);

  const handleGoBack = useCallback(() => {
    stopPreview().catch(() => null);
    router.back();
  }, [router, stopPreview]);

  const updateMedia = useCallback((updater: (current: MediaItem[]) => MediaItem[]) => {
    setMedia((current) => ensureLeadVideo(updater(current)));
  }, []);

  useEffect(() => {
    if (!existingListing || isCreateMode) {
      return;
    }

    const { listing, media: listingMedia, rooms, features, availability } = existingListing;
    setTitle(listing.title ?? '');
    setPrice(listing.price_per_night ? String(listing.price_per_night) : '');
    const fallbackAddress = [listing.district, listing.city].filter(Boolean).join(', ');
    const parsedLocation = parseCityDistrict(listing.address_text ?? fallbackAddress);
    setAddress(listing.address_text ?? fallbackAddress);
    setGoogleAddress(listing.google_address ?? '');
    setDescription(listing.description ?? '');
    setListingType((listing.property_type as ListingType) ?? LISTING_TYPES[0]);
    setGuestCapacity(listing.capacity ?? 0);
    setCityInput(listing.city ?? parsedLocation.city ?? '');
    setResolvedDistrict(listing.district ?? parsedLocation.district ?? '');
    setSelectedPlaceId(listing.place_id ?? null);
    setSelectedLatitude(listing.latitude ?? null);
    setSelectedLongitude(listing.longitude ?? null);
    setFormattedAddress(listing.formatted_address ?? listing.address_text ?? fallbackAddress);
    setAmenities(mapFeaturesToAmenities(features));
    setRoomCounts(mapRoomsToCounts(rooms));
    const { blocked, reserved } = mapAvailability(availability);
    setBlockedDates(blocked);
    setReservedDates(reserved);
    setCoverPhotoUri(listing.cover_photo_url ?? '');
    setAddressSearch(listing.address_text ?? fallbackAddress);
    setMusicEnabled(Boolean(listing.music_enabled));
    if (listing.music_id) {
      setSelectedMusicId(listing.music_id);
    }

    if (listingMedia?.length) {
      setMedia(
        ensureLeadVideo(
          listingMedia.map((item) => ({
            id: item.id,
            type: item.type,
            uri: item.url,
            room: (item.tag as RoomType | null) ?? null,
            muted: false,
            duration: 0,
            source: 'library',
          })),
        ),
      );
    }
  }, [ensureLeadVideo, existingListing, isCreateMode]);

  useEffect(() => {
    if (addressDebounceRef.current) {
      clearTimeout(addressDebounceRef.current);
      addressDebounceRef.current = null;
    }

    const query = addressSearch.trim();
    if (!query) {
      setAddressSuggestions([]);
      setIsAddressLoading(false);
      addressSessionTokenRef.current = null;
      return () => undefined;
    }

    setIsAddressLoading(true);
    let isActive = true;

    addressDebounceRef.current = setTimeout(() => {
      const sessionToken = addressSessionTokenRef.current ?? createPlacesSessionToken();
      addressSessionTokenRef.current = sessionToken;

      fetchPlaceSuggestions(query, sessionToken)
        .then((suggestions) => {
          if (!isActive) {
            return;
          }
          setAddressSuggestions(suggestions);
          if (suggestions.length === 0) {
            setShowAddressDropdown(false);
          }
        })
        .catch((error) => {
          if (!isActive) {
            return;
          }
          console.warn('[HostListingEdit] address suggestions error', error);
          setAddressSuggestions([]);
          setShowAddressDropdown(false);
        })
        .finally(() => {
          if (!isActive) {
            return;
          }
          setIsAddressLoading(false);
        });
    }, 350);

    return () => {
      isActive = false;
      if (addressDebounceRef.current) {
        clearTimeout(addressDebounceRef.current);
        addressDebounceRef.current = null;
      }
    };
  }, [addressSearch]);

  useEffect(() => {
    if (cityDebounceRef.current) {
      clearTimeout(cityDebounceRef.current);
      cityDebounceRef.current = null;
    }

    const query = cityInput.trim();
    if (!query) {
      setCitySuggestions([]);
      setIsCityLoading(false);
      citySessionTokenRef.current = null;
      setShowCityDropdown(false);
      return () => undefined;
    }

    setIsCityLoading(true);
    let isActive = true;

    cityDebounceRef.current = setTimeout(() => {
      const sessionToken = citySessionTokenRef.current ?? createPlacesSessionToken();
      citySessionTokenRef.current = sessionToken;

      fetchPlaceSuggestions(query, sessionToken, { types: '(cities)' })
        .then((suggestions) => {
          if (!isActive) {
            return;
          }
          setCitySuggestions(suggestions);
          if (suggestions.length === 0) {
            setShowCityDropdown(false);
          }
        })
        .catch((error) => {
          if (!isActive) {
            return;
          }
          console.warn('[HostListingEdit] city suggestions error', error);
          setCitySuggestions([]);
          setShowCityDropdown(false);
        })
        .finally(() => {
          if (!isActive) {
            return;
          }
          setIsCityLoading(false);
        });
    }, 350);

    return () => {
      isActive = false;
      if (cityDebounceRef.current) {
        clearTimeout(cityDebounceRef.current);
        cityDebounceRef.current = null;
      }
    };
  }, [cityInput]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      shouldDuckAndroid: true,
    }).catch((error) => console.warn('[HostListingEdit] audio mode error', error));
  }, []);

  useEffect(() => {
    return () => {
      if (addressBlurTimeoutRef.current) {
        clearTimeout(addressBlurTimeoutRef.current);
        addressBlurTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (cityBlurTimeoutRef.current) {
        clearTimeout(cityBlurTimeoutRef.current);
        cityBlurTimeoutRef.current = null;
      }
    };
  }, []);

  const toggleSelection = (value: string, collection: string[], setter: (next: string[]) => void) => {
    setter(
      collection.includes(value)
        ? collection.filter((item) => item !== value)
        : [...collection, value],
    );
  };

  const appendMediaFromAsset = useCallback(
    (asset: ImagePicker.ImagePickerAsset, source: MediaItem['source']) => {
      try {
        const nextItem = buildMediaItemFromAsset(asset, source);
        if (nextItem.type === 'photo' && !media.some((item) => item.type === 'video')) {
          Alert.alert('Vidéo obligatoire', 'Ajoutez une vidéo en premier : elle sert de média principal.');
          return;
        }
        updateMedia((current) => [...current, nextItem]);
      } catch (error) {
        console.warn('[HostListingEdit] invalid asset', error);
        Alert.alert('Import impossible', "Le média sélectionné n'a pas pu être ajouté.");
      }
    },
    [media, updateMedia],
  );

  const optimizeVideoAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => asset, []);

  /*
  const optimizeVideoAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset?.uri) {
      throw new Error('video_asset_missing_uri');
    }
    const outputUri = ensureCachePath();
    const inputPath = stripFileScheme(asset.uri);
    const outputPath = stripFileScheme(outputUri);
    const filter = `scale=${VIDEO_OPTIMIZATION.width}:-2,fps=${VIDEO_OPTIMIZATION.fps}`;
    const command = [
      '-y',
      `-i "${inputPath}"`,
      `-vf "${filter}"`,
      '-c:v libx264',
      '-preset medium',
      '-profile:v high',
      '-level 4.1',
      `-b:v ${VIDEO_OPTIMIZATION.bitrate}k`,
      `-maxrate ${VIDEO_OPTIMIZATION.maxrate}k`,
      `-bufsize ${VIDEO_OPTIMIZATION.bufsize}k`,
      '-c:a aac',
      '-b:a 128k',
      '-movflags +faststart',
      `"${outputPath}"`,
    ].join(' ');

    console.log('[HostListingEdit] optimizing video with command:', command);
    const session = await FFmpegKit.execute(command);
    const returnCode = await session.getReturnCode();
    if (!ReturnCode.isSuccess(returnCode)) {
      const failStack = await session.getFailStackTrace();
      console.warn('[HostListingEdit] video optimization failed', failStack);
      throw new Error('video_optimization_failed');
    }
    return {
      ...asset,
      uri: outputUri,
    };
  }, []);
  */

  const handlePickFromLibrary = useCallback(async () => {
    setIsProcessingMedia(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Accès requis', 'Autorisez l’accès à vos photos pour importer vos pièces.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: LIBRARY_MEDIA_TYPES,
        allowsEditing: false,
        quality: 1,
        videoMaxDuration: 120,
      });
      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        const isImage = asset.type?.toLowerCase().includes('image');
        if (isImage) {
          const processed = await ensurePhotoAspectRatio(asset);
          appendMediaFromAsset(processed, 'library');
        } else {
          const optimized = await optimizeVideoAsset(asset);
          appendMediaFromAsset(optimized, 'library');
        }
      }
    } catch (error) {
      console.warn('[HostListingEdit] pick error', error);
      Alert.alert('Import impossible', getPickerErrorMessage(error, 'Impossible de sélectionner ce média.'));
    } finally {
      setIsProcessingMedia(false);
    }
  }, [appendMediaFromAsset, optimizeVideoAsset]);

  const handleSetCoverFromAsset = useCallback(async (asset: ImagePicker.ImagePickerAsset) => {
    const processed = await ensureCoverAspectRatio(asset);
    setCoverPhotoUri(processed.uri);
  }, []);

  const handlePickCoverFromLibrary = useCallback(async () => {
    setIsProcessingMedia(true);
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Accès requis', 'Autorisez l’accès à vos photos pour choisir votre couverture.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: PHOTO_MEDIA_TYPES,
        allowsEditing: false,
        quality: 1,
      });
      if (!result.canceled && result.assets?.length) {
        await handleSetCoverFromAsset(result.assets[0]);
      }
    } catch (error) {
      console.warn('[HostListingEdit] cover pick error', error);
      Alert.alert('Import impossible', getPickerErrorMessage(error, 'Impossible de définir cette photo comme couverture.'));
    } finally {
      setIsProcessingMedia(false);
    }
  }, [handleSetCoverFromAsset]);

  const handleCaptureCoverPhoto = useCallback(async () => {
    setIsProcessingMedia(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Autorisation requise', 'Activez la caméra pour prendre une photo de couverture.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: PHOTO_MEDIA_TYPES,
        quality: 1,
      });
      if (!result.canceled && result.assets?.length) {
        await handleSetCoverFromAsset(result.assets[0]);
      }
    } catch (error) {
      console.warn('[HostListingEdit] cover capture error', error);
      Alert.alert('Capture impossible', getPickerErrorMessage(error, 'Impossible de prendre cette photo.'));
    } finally {
      setIsProcessingMedia(false);
    }
  }, [handleSetCoverFromAsset]);

  const handleSelectCoverPhoto = useCallback(() => {
    if (isProcessingMedia) {
      return;
    }
    const openCamera = () => handleCaptureCoverPhoto();
    const openLibrary = () => handlePickCoverFromLibrary();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Filmer une photo', 'Choisir depuis la galerie', 'Annuler'],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) openCamera();
          if (index === 1) openLibrary();
        },
      );
    } else {
      Alert.alert('Photo de couverture', 'Sélectionnez votre mode de capture', [
        { text: 'Filmer une photo', onPress: openCamera },
        { text: 'Choisir depuis la galerie', onPress: openLibrary },
        { text: 'Annuler', style: 'cancel' },
      ]);
    }
  }, [handleCaptureCoverPhoto, handlePickCoverFromLibrary, isProcessingMedia]);

  const captureVideo = useCallback(async () => {
    setIsProcessingMedia(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Autorisation requise', 'Activez la caméra pour prendre des photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: VIDEO_MEDIA_TYPES,
        quality: 1,
        videoMaxDuration: 120,
        aspect: [9, 16],
      });
      if (!result.canceled && result.assets?.length) {
        const optimized = await optimizeVideoAsset(result.assets[0]);
        appendMediaFromAsset(optimized, 'camera');
      }
    } catch (error) {
      console.warn('[HostListingEdit] capture error', error);
      Alert.alert('Capture impossible', getPickerErrorMessage(error, 'Impossible de capturer ce média.'));
    } finally {
      setIsProcessingMedia(false);
    }
  }, [appendMediaFromAsset, optimizeVideoAsset]);

  const capturePhoto = useCallback(async () => {
    setIsProcessingMedia(true);
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Autorisation requise', 'Activez la caméra pour prendre des photos.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: PHOTO_MEDIA_TYPES,
        quality: 1,
      });
      if (!result.canceled && result.assets?.length) {
        const processed = await ensurePhotoAspectRatio(result.assets[0]);
        appendMediaFromAsset(processed, 'camera');
      }
    } catch (error) {
      console.warn('[HostListingEdit] photo capture error', error);
      Alert.alert('Capture impossible', getPickerErrorMessage(error, 'Impossible de prendre cette photo.'));
    } finally {
      setIsProcessingMedia(false);
    }
  }, [appendMediaFromAsset]);

  const handleOpenCamera = useCallback(() => {
    if (isProcessingMedia) {
      return;
    }
    const openVideo = () => captureVideo();
    const openPhoto = () => capturePhoto();
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Filmer une vidéo', 'Prendre une photo', 'Annuler'],
          cancelButtonIndex: 2,
        },
        (index) => {
          if (index === 0) openVideo();
          if (index === 1) openPhoto();
        },
      );
      return;
    }
    Alert.alert('Caméra', 'Choisissez votre mode de capture', [
      { text: 'Filmer une vidéo', onPress: openVideo },
      { text: 'Prendre une photo', onPress: openPhoto },
      { text: 'Annuler', style: 'cancel' },
    ]);
  }, [capturePhoto, captureVideo, isProcessingMedia]);

  const handleDeleteMedia = useCallback((mediaId: string) => {
    updateMedia((current) => {
      const next = current.filter((item) => item.id !== mediaId);
      if (next.length > 0 && !next.some((item) => item.type === 'video')) {
        Alert.alert('Vidéo obligatoire', 'Le premier média doit rester une vidéo. Ajoutez-en une nouvelle avant de supprimer celle-ci.');
        return current;
      }
      return next;
    });
  }, [updateMedia]);

  const handleAssignRoom = useCallback((mediaId: string, room: RoomType) => {
    updateMedia((current) =>
      current.map((item) =>
        item.id === mediaId
          ? {
              ...item,
              room: item.room === room ? null : room,
            }
          : item,
      ),
    );
  }, [updateMedia]);

  const handleToggleMute = useCallback((mediaId: string, muted: boolean) => {
    updateMedia((current) => current.map((item) => (item.id === mediaId ? { ...item, muted } : item)));
  }, [updateMedia]);

  const handleFieldLayout = useCallback(
    (key: FieldErrorKey) => (event: LayoutChangeEvent) => {
      fieldPositionsRef.current[key] = event.nativeEvent.layout.y;
    },
    [],
  );

  const scrollToError = useCallback((key: FieldErrorKey) => {
    const y = fieldPositionsRef.current[key] ?? 0;
    scrollViewRef.current?.scrollTo({ y: Math.max(y - 32, 0), animated: true });
  }, []);

  const validateForm = useCallback(() => {
    const errors = createFieldErrors();
    const hasVideo = media.some((item) => item.type === 'video');
    const roomsTotal = Object.values(roomCounts).reduce((sum, value) => sum + value, 0);

    if (media.length < 4 || !hasVideo) {
      errors.media = 'Ajoutez au moins 4 médias dont une vidéo.';
    }
    if (!coverPhotoUri.trim()) {
      errors.cover = 'Ajoutez une photo de couverture.';
    }
    if (!title.trim()) {
      errors.title = 'Le titre de l’annonce est obligatoire.';
    }
    if (!price.trim()) {
      errors.price = 'Indiquez un tarif.';
    } else {
      const numericPrice = Number(price.replace(/[^0-9.,]/g, '').replace(',', '.'));
      if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
        errors.price = 'Entrez un montant valide.';
      }
    }
    if (!address.trim()) {
      errors.address = 'Renseignez le quartier / la ville.';
    } else {
      const { isValid } = parseCityDistrict(address);
      if (!isValid) {
        errors.address = 'Séparez le quartier et la ville avec une virgule.';
      }
    }
    if (!cityInput.trim()) {
      errors.city = 'Sélectionnez ou tapez une ville.';
    }
    if (!listingType.trim()) {
      errors.listingType = 'Sélectionnez un type de bien.';
    }
    if (roomsTotal === 0) {
      errors.rooms = 'Déclarez au moins une pièce.';
    }
    if (description.trim().length < 100) {
      errors.description = 'La description doit contenir au moins 100 caractères.';
    }
    if (amenities.length === 0) {
      errors.amenities = 'Sélectionnez au moins un équipement.';
    }

    setFieldErrors(errors);
    const firstErrorKey = REQUIRED_FIELD_ORDER.find((key) => errors[key]);
    if (firstErrorKey) {
      scrollToError(firstErrorKey);
      return false;
    }
    return true;
  }, [amenities.length, coverPhotoUri, description, address, cityInput, listingType, media, price, roomCounts, scrollToError, title]);

  useEffect(() => {
    setFieldErrors((prev) => {
      let next: typeof prev | null = null;
      const hasVideo = media.some((item) => item.type === 'video');
      const roomsTotal = Object.values(roomCounts).reduce((sum, value) => sum + value, 0);

      const clearIfValid = (key: FieldErrorKey, condition: boolean) => {
        if (condition && prev[key]) {
          if (!next) {
            next = { ...prev };
          }
          next[key] = null;
        }
      };

      clearIfValid('media', media.length >= 4 && hasVideo);
      clearIfValid('cover', coverPhotoUri.trim().length > 0);
      clearIfValid('title', title.trim().length > 0);
      clearIfValid('price', price.trim().length > 0);
      clearIfValid('address', address.trim().length > 0);
      clearIfValid('city', cityInput.trim().length > 0);
      clearIfValid('listingType', !!listingType.trim());
      clearIfValid('rooms', roomsTotal > 0);
      clearIfValid('description', description.trim().length >= 100);
      clearIfValid('amenities', amenities.length > 0);

      return next ?? prev;
    });
  }, [amenities.length, coverPhotoUri, description, address, cityInput, listingType, media, price, roomCounts, title]);

  const handlePreviewMusic = useCallback(
    async (trackId: string) => {
      if (currentlyPlayingId === trackId) {
        await stopPreview();
        return;
      }
      const track = MUSIC_LIBRARY.find((item) => item.id === trackId);
      if (!track) {
        return;
      }
      await stopPreview();
      try {
        const { sound } = await Audio.Sound.createAsync({ uri: track.uri }, { shouldPlay: false, volume: getVolumeValue(volumePreset) });
        soundRef.current = sound;
        setCurrentlyPlayingId(trackId);
        await sound.playAsync();
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            stopPreview().catch(() => null);
          }
        });
      } catch (error) {
        console.warn('[HostListingEdit] preview error', error);
        Alert.alert('Lecture impossible', 'Nous ne pouvons pas lire ce morceau pour le moment.');
        await stopPreview();
      }
    },
    [currentlyPlayingId, volumePreset, stopPreview],
  );

  useEffect(() => {
    if (soundRef.current) {
      soundRef.current.setVolumeAsync(getVolumeValue(volumePreset)).catch(() => null);
    }
  }, [volumePreset]);

  useEffect(() => {
    return () => {
      stopPreview().catch(() => null);
    };
  }, [stopPreview]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        stopPreview().catch(() => null);
      };
    }, [stopPreview]),
  );

  useEffect(() => {
    if (!musicEnabled && currentlyPlayingId) {
      stopPreview().catch(() => null);
    }
  }, [musicEnabled, currentlyPlayingId, stopPreview]);

  useEffect(() => {
    previewVisibleRef.current = !!previewMedia;
  }, [previewMedia]);

  const handleSave = async ({ publish = true }: { publish?: boolean } = {}) => {
    if (isSaving) {
      return;
    }
    await stopPreview();
    if (!validateForm()) {
      Alert.alert('Champs manquants', 'Complétez tous les champs obligatoires avant de continuer.');
      return;
    }
    if (!firebaseUser?.uid) {
      Alert.alert('Connexion requise', 'Veuillez vous reconnecter pour publier votre annonce.');
      return;
    }
    const isEditingExisting = !isCreateMode && !!existingListing;

    const sanitizedPrice = Number(price.replace(/[^0-9.,]/g, '').replace(',', '.'));
    if (!Number.isFinite(sanitizedPrice) || sanitizedPrice <= 0) {
      setFieldErrors((prev) => ({ ...prev, price: 'Entrez un montant valide.' }));
      Alert.alert('Tarif invalide', 'Indiquez un montant numérique valide.');
      return;
    }
    const trimmedAddress = address.trim();
    const parsedLocation = parseCityDistrict(trimmedAddress);
    const finalCity = cityInput.trim() || parsedLocation.city;
    const derivedDistrict = deriveDistrictValue({
      address: trimmedAddress,
      city: finalCity,
      fallbackDistrict: resolvedDistrict || parsedLocation.district || '',
    });
    const addressText = trimmedAddress || formattedAddress || '';
    const coverFileName = coverPhotoUri.split('/').pop();
    const promotion = promoNights && promoDiscount ? { nights: Number(promoNights), discountPercent: Number(promoDiscount) } : null;

    const payload = {
      hostId: firebaseUser.uid,
      title: title.trim(),
      city: finalCity,
      district: derivedDistrict,
      addressText,
      googleAddress: googleAddress.trim() || null,
      placeId: selectedPlaceId,
      latitude: selectedLatitude,
      longitude: selectedLongitude,
      formattedAddress: formattedAddress.trim() ? formattedAddress.trim() : null,
      propertyType: listingType || LISTING_TYPES[0],
      pricePerNight: Math.round(sanitizedPrice),
      capacity: Math.max(1, guestCapacity || 1),
      description: description.trim(),
      coverPhotoUri,
      coverFileName,
      musicEnabled,
      musicId: musicEnabled ? selectedMusicId : null,
      amenities,
      rooms: {
        living: roomCounts.Salon ?? 0,
        bedrooms: roomCounts.Chambre ?? 0,
        kitchen: roomCounts.Cuisine ?? 0,
        bathrooms: roomCounts['Salle de bain'] ?? 0,
        dining: roomCounts['Salle à manger'] ?? 0,
        toilets: roomCounts.Toilette ?? 0,
      },
      blockedDates,
      reservedDates,
      promotion: promotion && promotion.nights > 0 && promotion.discountPercent > 0 ? promotion : null,
      media: media.map((item) => ({
        id: item.id,
        uri: item.uri,
        type: item.type,
        room: item.room,
        muted: item.muted,
      })),
      publish,
    };

    let successTitle = '';
    let successMessage = '';
    setIsSaving(true);
    try {
      if (isEditingExisting) {
        if (!existingListing?.listing?.id) {
          throw new Error('listing_introuvable');
        }
        await updateListingWithRelations({ ...payload, listingId: existingListing.listing.id });
        await refreshListing().catch(() => null);
        await refreshFeedListings().catch(() => null);
        setLastCreatedListingId(existingListing.listing.id);
        if (publish) {
          setPublishSuccessVisible(true);
          successTitle = 'Annonce mise à jour';
          successMessage = 'Vos modifications sont en ligne et visibles immédiatement.';
        } else {
          Alert.alert('Brouillon enregistré', "L’annonce a été sauvegardée en brouillon.");
          router.back();
        }
      } else {
        const { listingId } = await createListingWithRelations(payload);
        setLastCreatedListingId(listingId);
        resetForm();
        await refreshFeedListings().catch(() => null);
        if (publish) {
          setPublishSuccessVisible(true);
          successTitle = 'Annonce publiée';
          successMessage = 'Votre annonce est maintenant visible par les clients sur PUOL.';
        } else {
          Alert.alert('Brouillon enregistré', 'Votre brouillon est prêt, vous pourrez le publier plus tard.');
          router.back();
        }
      }

      if (successTitle) {
        Alert.alert(successTitle, successMessage);
      }
    } catch (error) {
      console.error('[HostListingEdit] save error', error);
      const message = error instanceof Error ? error.message : "Une erreur est survenue pendant la publication.";
      Alert.alert('Publication impossible', message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClosePublishModal = useCallback(() => {
    stopPreview().catch(() => null);
    setPublishSuccessVisible(false);
  }, [stopPreview]);

  const withHostPaymentGuard = useCallback(
    async (action: 'draft' | 'delete', onConfirm: () => void) => {
      const listingId = existingListing?.listing?.id ?? null;

      if (listingId) {
        try {
          const hasOutstanding = await hasOutstandingPaymentsForListing(listingId);
          if (hasOutstanding) {
            Alert.alert(
              'Action impossible',
              "Impossible de modifier le statut car certaines réservations attendent encore un paiement. Attendez l'encaissement complet avant de mettre l’annonce en brouillon ou de la supprimer.",
            );
            return;
          }
        } catch (error) {
          console.error('[HostListingEdit] outstanding payment check failed', error);
          Alert.alert(
            'Vérification indisponible',
            "Une erreur est survenue lors de la vérification des paiements. Réessayez dans un instant.",
          );
          return;
        }
      }

      const note =
        "Les réservations déjà confirmées restent actives et devront être honorées, même si l’annonce change de statut.";
      const title = action === 'draft' ? 'Mettre en brouillon' : "Supprimer l’annonce";
      const message =
        action === 'draft'
          ? `Souhaitez-vous enregistrer cette annonce en brouillon ?\n\n${note}`
          : `Souhaitez-vous supprimer cette annonce ? Cette action est définitive.\n\n${note}`;

      Alert.alert(title, message, [
        { text: 'Annuler', style: 'cancel' },
        {
          text: action === 'draft' ? 'Mettre en brouillon' : 'Supprimer',
          style: action === 'delete' ? 'destructive' : 'default',
          onPress: onConfirm,
        },
      ]);
    },
    [existingListing?.listing?.id],
  );

  const handleSaveDraft = useCallback(() => {
    void withHostPaymentGuard('draft', () => {
      void handleSave({ publish: false });
    });
  }, [handleSave, withHostPaymentGuard]);

  const handlePublish = useCallback(() => {
    void handleSave({ publish: true });
  }, [handleSave]);

  const handleDelete = useCallback(() => {
    if (!existingListing?.listing?.id) {
      return;
    }

    const listingId = existingListing.listing.id;

    void withHostPaymentGuard('delete', () => {
      setIsSaving(true);
      stopPreview().catch(() => null);
      deleteListingWithRelations(listingId)
        .then(async () => {
          await refreshFeedListings().catch(() => null);
          Alert.alert('Annonce supprimée', 'Votre annonce a été supprimée.');
          router.back();
        })
        .catch((error) => {
          console.error('[HostListingEdit] delete error', error);
          Alert.alert('Suppression impossible', 'Veuillez réessayer plus tard.');
        })
        .finally(() => {
          setIsSaving(false);
        });
    });
  }, [existingListing?.listing?.id, refreshFeedListings, router, stopPreview, withHostPaymentGuard]);

  const handleViewPublishedListing = useCallback(() => {
    stopPreview().catch(() => null);
    setPublishSuccessVisible(false);
    const targetId = id || lastCreatedListingId;
    if (targetId) {
      router.push(`/property/${targetId}` as never);
      return;
    }
    router.push('/host-listings' as never);
  }, [id, lastCreatedListingId, router, stopPreview]);

  const handleRoomAdjust = (room: (typeof ROOM_COUNTERS)[number], delta: 1 | -1) => {
    setRoomCounts((prev) => {
      const nextValue = Math.max(0, (prev[room] ?? 0) + delta);
      return { ...prev, [room]: nextValue };
    });
  };

  const cancelAddressDropdownClose = useCallback(() => {
    if (addressBlurTimeoutRef.current) {
      clearTimeout(addressBlurTimeoutRef.current);
      addressBlurTimeoutRef.current = null;
    }
  }, []);

  const scheduleAddressDropdownClose = useCallback(() => {
    cancelAddressDropdownClose();
    addressBlurTimeoutRef.current = setTimeout(() => {
      setShowAddressDropdown(false);
    }, 275);
  }, [cancelAddressDropdownClose]);

  const cancelCityDropdownClose = useCallback(() => {
    if (cityBlurTimeoutRef.current) {
      clearTimeout(cityBlurTimeoutRef.current);
      cityBlurTimeoutRef.current = null;
    }
  }, []);

  const scheduleCityDropdownClose = useCallback(() => {
    cancelCityDropdownClose();
    cityBlurTimeoutRef.current = setTimeout(() => {
      setShowCityDropdown(false);
    }, 275);
  }, [cancelCityDropdownClose]);

  const handleAddressSuggestionSelect = useCallback(
    async (suggestion: PlaceSuggestion) => {
      cancelAddressDropdownClose();
      const formattedValue = formatSuggestionAddress(suggestion);
      setAddressSearch(formattedValue);
      setAddress(formattedValue);
      setShowAddressDropdown(false);
      setAddressSuggestions([]);
      setIsAddressLoading(false);
      addressSessionTokenRef.current = null;
      const fallbackLocation = parseCityDistrict(formattedValue);
      setFieldErrors((prev) => ({ ...prev, address: null }));
      addressDetailsRequestRef.current = suggestion.id;
      try {
        const details = await fetchPlaceDetails(suggestion.id);
        if (addressDetailsRequestRef.current !== suggestion.id) {
          return;
        }
        if (details) {
          const resolvedCity = resolveCityFromComponents(details.components) || fallbackLocation.city;
          const resolvedDistrictValue =
            resolveDistrictFromComponents(details.components) || fallbackLocation.district || '';
          setCityInput(resolvedCity);
          setFieldErrors((prev) => ({ ...prev, city: null }));
          setSelectedPlaceId(details.placeId);
          setSelectedLatitude(details.latitude);
          setSelectedLongitude(details.longitude);
          setFormattedAddress(details.formattedAddress);
          setResolvedDistrict(resolvedDistrictValue);
        } else {
          setSelectedPlaceId(null);
          setSelectedLatitude(null);
          setSelectedLongitude(null);
          setFormattedAddress('');
          setResolvedDistrict(fallbackLocation.district || '');
        }
      } catch (error) {
        console.warn('[HostListingEdit] place details error', error);
        setResolvedDistrict(fallbackLocation.district || '');
      } finally {
        addressDetailsRequestRef.current = null;
      }
    },
    [cancelAddressDropdownClose, setFieldErrors],
  );

  const handleCitySuggestionSelect = useCallback(
    (suggestion: PlaceSuggestion) => {
      cancelCityDropdownClose();
      const value = suggestion.primary;
      setCityInput(value);
      setShowCityDropdown(false);
      setCitySuggestions([]);
      setIsCityLoading(false);
      citySessionTokenRef.current = null;
      setFieldErrors((prev) => ({ ...prev, city: null }));
    },
    [cancelCityDropdownClose],
  );

  const currentAvailabilityMode = useMemo(() => {
    return AVAILABILITY_MODES.find((mode) => mode.key === selectedAvailabilityMode) ?? AVAILABILITY_MODES[0];
  }, [selectedAvailabilityMode]);

  const calendarButtonLabel = useMemo(() => {
    if (selectedAvailabilityMode === 'blocked') {
      return 'Bloquer des dates';
    }
    if (selectedAvailabilityMode === 'available') {
      return 'Débloquer des dates';
    }
    return 'Voir les réservations';
  }, [selectedAvailabilityMode]);

  const getCalendarStatus = useCallback(
    (iso: string): AvailabilityModeKey => {
      if (reservedDates.has(iso)) {
        return 'reserved';
      }
      if (blockedDates.has(iso)) {
        return 'blocked';
      }
      return 'available';
    },
    [blockedDates, reservedDates],
  );

  const handleCalendarDayPress = useCallback(
    (iso: string, status: AvailabilityModeKey) => {
      if (selectedAvailabilityMode === 'reserved') {
        return;
      }
      setSelectedCalendarDates((prev) => {
        const next = new Set(prev);
        if (next.has(iso)) {
          next.delete(iso);
        } else if (selectedAvailabilityMode === 'available' && status === 'blocked') {
          next.add(iso);
        } else if (selectedAvailabilityMode === 'blocked' && status === 'available') {
          next.add(iso);
        } else if (selectedAvailabilityMode === status) {
          next.add(iso);
        }
        return next;
      });
    },
    [selectedAvailabilityMode],
  );

  const handleCalendarAction = useCallback(() => {
    if (selectedAvailabilityMode === 'reserved' || selectedCalendarDates.size === 0) {
      return;
    }
    if (selectedAvailabilityMode === 'blocked') {
      setBlockedDates((current) => new Set([...current, ...selectedCalendarDates]));
    } else if (selectedAvailabilityMode === 'available') {
      setBlockedDates((current) => {
        const next = new Set(current);
        selectedCalendarDates.forEach((date) => next.delete(date));
        return next;
      });
    }
    setSelectedCalendarDates(new Set());
  }, [selectedAvailabilityMode, selectedCalendarDates]);

  const handleViewReservations = useCallback(() => {
    router.push('/host-reservations' as never);
  }, [router]);

  const CalendarCard = () => (
    <View style={styles.calendarCard}>
      <View style={styles.calendarHeader}>
        <View>
          <Text style={styles.calendarTitle}>Calendrier</Text>
          <Text style={styles.calendarSubtitle}>{calendarMonth.label}</Text>
        </View>
        <View style={styles.calendarHeaderActions}>
          <TouchableOpacity
            style={[styles.calendarNavButton, calendarMonthOffset <= 0 && styles.calendarNavButtonDisabled]}
            activeOpacity={calendarMonthOffset <= 0 ? 1 : 0.8}
            onPress={() => calendarMonthOffset > 0 && setCalendarMonthOffset((value) => Math.max(0, value - 1))}
          >
            <Feather
              name="chevron-left"
              size={16}
              color={calendarMonthOffset <= 0 ? COLORS.border : COLORS.dark}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.calendarNavButton}
            activeOpacity={0.8}
            onPress={() => setCalendarMonthOffset((value) => value + 1)}
          >
            <Feather name="chevron-right" size={16} color={COLORS.dark} />
          </TouchableOpacity>
          <Text
            style={[
              styles.calendarBadge,
              { backgroundColor: currentAvailabilityMode.tint, color: currentAvailabilityMode.accent },
            ]}
          >
            {currentAvailabilityMode.label}
          </Text>
        </View>
      </View>
      <View style={styles.availabilityLegend}>
        {AVAILABILITY_MODES.map((mode) => (
          <View key={mode.key} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: mode.accent }]} />
            <Text style={styles.legendLabel}>{mode.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {calendarDays.map((day) => {
          const status = getCalendarStatus(day.iso);
          const isSelected = selectedCalendarDates.has(day.iso);
          const disabled = status === 'reserved' || day.isPast;
          return (
            <TouchableOpacity
              key={day.iso}
              style={[
                styles.calendarDay,
                styles[`calendarDay_${status}`],
                !day.inCurrentMonth && styles.calendarDayFaded,
                day.isPast && styles.calendarDayPast,
                isSelected && styles.calendarDaySelected,
              ]}
              onPress={() => handleCalendarDayPress(day.iso, status)}
              activeOpacity={0.85}
              disabled={disabled}
            >
              <Text style={styles.calendarDayWeek}>{day.shortWeekday}</Text>
              <Text style={styles.calendarDayNumber}>{day.dayNumber}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[
          styles.calendarButton,
          { backgroundColor: currentAvailabilityMode.accent },
          selectedAvailabilityMode !== 'reserved' && selectedCalendarDates.size === 0 && styles.calendarButtonDisabled,
        ]}
        activeOpacity={0.9}
        disabled={selectedAvailabilityMode !== 'reserved' && selectedCalendarDates.size === 0}
        onPress={selectedAvailabilityMode === 'reserved' ? handleViewReservations : handleCalendarAction}
      >
        <Feather name="calendar" size={16} color="#FFFFFF" />
        <Text style={styles.calendarButtonText}>{calendarButtonLabel}</Text>
      </TouchableOpacity>
    </View>
  );

  const { videoOrderMap, photoOrderMap } = useMemo(() => {
    const videoMap: Record<string, number> = {};
    const photoMap: Record<string, number> = {};
    let videoCounter = 1;
    let photoCounter = 1;
    media.forEach((item) => {
      if (item.type === 'video') {
        videoMap[item.id] = videoCounter;
        videoCounter += 1;
      } else if (item.type === 'photo') {
        photoMap[item.id] = photoCounter;
        photoCounter += 1;
      }
    });
    return { videoOrderMap: videoMap, photoOrderMap: photoMap };
  }, [media]);

  const activePreviewMedia = useMemo(() => {
    if (!previewMedia) {
      return null;
    }
    return media.find((item) => item.id === previewMedia.id) ?? previewMedia;
  }, [media, previewMedia]);

  const previewDurationSeconds = useMemo(() => {
    if (previewDurationMillis > 0) {
      return previewDurationMillis / 1000;
    }
    return activePreviewMedia?.duration ?? 0;
  }, [activePreviewMedia?.duration, previewDurationMillis]);
  const previewSliderMax = Math.max(previewDurationMillis || previewDurationSeconds * 1000, 1000);
  useEffect(() => {
    if (!previewMedia || previewMedia.type !== 'video') {
      setPreviewSeekMillis(0);
      setPreviewVideoLoading(false);
      setPreviewDurationMillis(0);
      setIsPreviewPlaying(false);
      previewWasPlayingRef.current = false;
      previewCompletedRef.current = false;
      return;
    }
    setPreviewSeekMillis(0);
    setPreviewVideoLoading(true);
    setPreviewDurationMillis(0);
    setIsPreviewPlaying(false);
    previewWasPlayingRef.current = false;
    previewCompletedRef.current = false;
  }, [previewMedia?.id, previewMedia?.type]);

  const handlePreviewStatus = useCallback(
    (status: AVPlaybackStatus) => {
      console.log('[PreviewStatus]', JSON.stringify(status));
      if (!status.isLoaded) {
        return;
      }
      if (typeof status.positionMillis === 'number') {
        setPreviewSeekMillis(status.positionMillis);
      }
      if (typeof status.durationMillis === 'number' && status.durationMillis > 0) {
        setPreviewDurationMillis(status.durationMillis);
      }
      if ('didJustFinish' in status && status.didJustFinish) {
        setIsPreviewPlaying(false);
        previewWasPlayingRef.current = false;
        previewCompletedRef.current = true;
        previewVideoRef.current?.setStatusAsync({ positionMillis: 0, shouldPlay: false }).catch(() => null);
        setPreviewSeekMillis(0);
        return;
      }
      if (status.isLoaded) {
        setPreviewVideoLoading(false);
      }
    },
    [],
  );

  const handlePreviewPlayPause = useCallback(() => {
    setIsPreviewPlaying((current) => {
      const next = !current;
      previewWasPlayingRef.current = next;
      if (next) {
        const status: { positionMillis?: number; shouldPlay: boolean } = { shouldPlay: true };
        if (previewCompletedRef.current) {
          status.positionMillis = 0;
          previewCompletedRef.current = false;
          setPreviewSeekMillis(0);
        }
        previewVideoRef.current?.setStatusAsync(status).catch(() => null);
      } else {
        previewVideoRef.current?.setStatusAsync({ shouldPlay: false }).catch(() => null);
      }
      return next;
    });
  }, []);

  const handlePreviewSlidingStart = useCallback(() => {
    previewWasPlayingRef.current = isPreviewPlaying;
    previewVideoRef.current?.setStatusAsync({ shouldPlay: false }).catch(() => null);
    setIsPreviewPlaying(false);
  }, [isPreviewPlaying]);

  const handlePreviewSlidingComplete = useCallback((value: number) => {
    setPreviewSeekMillis(value);
    previewVideoRef.current
      ?.setStatusAsync({ positionMillis: value, shouldPlay: previewWasPlayingRef.current })
      .catch(() => null);
    setIsPreviewPlaying(previewWasPlayingRef.current);
  }, []);

  if (loadError && !isCreateMode) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: headerTopPadding }]} > 
        <StatusBar hidden />
        <View style={[styles.header, { paddingTop: headerTopPadding }]} > 
          <TouchableOpacity style={styles.headerButton} onPress={handleGoBack} activeOpacity={0.85}>
            <Feather name="chevron-left" size={20} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Modifier l’annonce</Text>
          </View>
        </View>
        <View style={[styles.sectionCard, { margin: 16, alignItems: 'center', gap: 12 }]} > 
          <Feather name="alert-triangle" size={24} color={COLORS.danger} />
          <Text style={styles.sectionTitle}>Impossible de charger l’annonce</Text>
          <Text style={styles.sectionSubtitle}>{loadError}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.back()} activeOpacity={0.85}> 
            <Text style={styles.primaryButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoadingListing && !isCreateMode) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: headerTopPadding }]} > 
        <StatusBar hidden />
        <View style={[styles.header, { paddingTop: headerTopPadding }]} > 
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.85}>
            <Feather name="chevron-left" size={20} color={COLORS.dark} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Modifier l’annonce</Text>
          </View>
        </View>
        <View style={[styles.sectionCard, { margin: 16, alignItems: 'center', gap: 12 }]} > 
          <ActivityIndicator color={COLORS.accent} size="large" />
          <Text style={styles.sectionSubtitle}>Chargement de l’annonce…</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isDraftStatus = isCreateMode || (existingListing?.listing?.status ?? '').toLowerCase() !== 'published';
  const headerStatusLabel = isDraftStatus ? 'Brouillon' : 'Publié';
  const headerStatusIcon: keyof typeof Feather.glyphMap = isDraftStatus ? 'edit-3' : 'zap';

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: headerTopPadding }]} > 
      <StatusBar hidden />
      <View style={[styles.header, { paddingTop: headerTopPadding }]}> 
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()} activeOpacity={0.85}>
          <Feather name="chevron-left" size={20} color={COLORS.dark} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{isCreateMode ? 'Création d’annonce' : 'Modifier l’annonce'}</Text>
        </View>
        <View
          style={[styles.headerStatusPill, isDraftStatus ? styles.headerStatusDraft : styles.headerStatusPublished]}
        >
          <Feather name={headerStatusIcon} size={12} color={COLORS.accent} />
          <Text style={styles.headerStatusText}>{headerStatusLabel}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        ref={scrollViewRef}
      >
        <View
          style={[styles.sectionCard, fieldErrors.media && styles.sectionCardError]}
          onLayout={handleFieldLayout('media')}
        >
          <SectionHeader
            title="Photos & vidéos"
            subtitle="Ajoutez des médias par pièce pour un rendu immersif"
          />
          {fieldErrors.media && <Text style={styles.fieldErrorText}>{fieldErrors.media}</Text>}
          <View style={styles.mediaGrid}>
            {media.map((item) => (
              <TouchableOpacity key={item.id} style={styles.mediaTile} activeOpacity={0.9} onPress={() => setPreviewMedia(item)}>
                {item.type === 'photo' || item.coverUri ? (
                  <Image source={{ uri: item.coverUri ?? item.uri }} style={styles.mediaImage} />
                ) : (
                  <Video
                    source={{ uri: item.uri }}
                    style={styles.mediaImage}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted
                    useNativeControls={false}
                  />
                )}
                <View style={styles.mediaTopRow}>
                  {item.room && (
                    <View style={styles.mediaRoomPill}>
                      <Feather name="tag" size={12} color={COLORS.accent} />
                      <Text style={styles.mediaRoomText}>{item.room}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.mediaDelete}
                  activeOpacity={0.85}
                  onPress={() => handleDeleteMedia(item.id)}
                >
                  <Feather name="trash-2" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.mediaActionsRow}>
            <TouchableOpacity
              style={[styles.mediaActionButton, styles.mediaActionPrimary, isProcessingMedia && styles.mediaActionButtonDisabled]}
              onPress={handleOpenCamera}
              activeOpacity={0.9}
              disabled={isProcessingMedia}
            >
              <View style={styles.mediaActionIcon}>
                <Feather name="video" size={16} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mediaActionText}>
                  {isProcessingMedia ? 'Traitement en cours…' : 'Ouvrir la caméra'}
                </Text>
                <Text style={styles.mediaActionSubtext}>Choisissez vidéo ou photo, ratio 9:16 recommandé</Text>
              </View>
              <Feather name="chevron-right" size={18} color={COLORS.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mediaActionButton, isProcessingMedia && styles.mediaActionButtonDisabled]}
              onPress={handlePickFromLibrary}
              activeOpacity={0.9}
              disabled={isProcessingMedia}
            >
              <View style={styles.mediaActionIconSecondary}>
                <Feather name="image" size={16} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mediaActionText}>Ajouter depuis la galerie</Text>
                <Text style={styles.mediaActionSubtext}>Recadrage automatique en 9:16</Text>
              </View>
              <Feather name="plus-circle" size={18} color={COLORS.accent} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.mediaActionButton,
                styles.coverActionButton,
                fieldErrors.cover && styles.mediaActionButtonError,
                isProcessingMedia && styles.mediaActionButtonDisabled,
              ]}
              onPress={handleSelectCoverPhoto}
              activeOpacity={0.9}
              disabled={isProcessingMedia}
            >
              <View style={styles.mediaActionIconSecondary}>
                <Feather name="star" size={16} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mediaActionText}>Photo de couverture</Text>
                <Text style={styles.mediaActionSubtext}>
                  {coverPhotoUri ? 'Actualisez votre image vitrine' : 'Choisissez une photo paysage accrocheuse'}
                </Text>
              </View>
              <Feather name="camera" size={18} color={COLORS.accent} />
            </TouchableOpacity>
          </View>
          {coverPhotoUri ? (
            <View style={styles.coverPreviewCard}>
              <Image source={{ uri: coverPhotoUri }} style={styles.coverPreviewImage} />
              <View style={{ flex: 1 }}>
                <Text style={styles.coverPreviewTitle}>Photo de couverture</Text>
                <Text style={styles.coverPreviewSubtitle}>
                  Choisissez une photo paysage, lumineuse et soignée : c’est elle qui s’affichera en premier dans les
                  résultats de recherche et qui donnera envie aux clients d’ouvrir votre annonce.
                </Text>
                <TouchableOpacity style={styles.coverPreviewAction} onPress={handleSelectCoverPhoto} activeOpacity={0.85}>
                  <Feather name="refresh-ccw" size={14} color={COLORS.accent} />
                  <Text style={styles.coverPreviewActionText}>Changer de photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
          <View style={styles.mediaControlList}>
            {media.map((item) => (
              <View key={`controls-${item.id}`} style={styles.mediaControlCard}>
                <View style={styles.mediaControlHeader}>
                  <Text style={styles.mediaControlTitle}>
                    {item.type === 'video'
                      ? `Clip vidéo ${videoOrderMap[item.id] ? `#${videoOrderMap[item.id]}` : ''}`
                      : `Photo ${photoOrderMap[item.id] ? `#${photoOrderMap[item.id]}` : ''}`}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roomChipRow}>
                  {ROOM_COUNTERS.map((room) => {
                    const active = item.room === room;
                    return (
                      <TouchableOpacity
                        key={`${item.id}-${room}`}
                        style={[styles.roomChip, active && styles.roomChipActive]}
                        onPress={() => handleAssignRoom(item.id, room)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.roomChipText, active && styles.roomChipTextActive]}>{room}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
                {item.type === 'video' && (
                  <View style={styles.muteRow}>
                    <Text style={styles.muteLabel}>{item.muted ? 'Son coupé' : 'Son actif'}</Text>
                    <Switch value={!item.muted} onValueChange={(value) => handleToggleMute(item.id, !value)} />
                  </View>
                )}
                </View>
            ))}
          </View>
        </View>

        <View style={[styles.sectionCard, fieldErrors.cover && styles.sectionCardError]} onLayout={handleFieldLayout('cover')}>
          <SectionHeader
            title="Ambiance musicale"
            subtitle="Ajoutez une musique maison qui jouera pendant les swipes"
          />
          {fieldErrors.cover && <Text style={styles.fieldErrorText}>{fieldErrors.cover}</Text>}
          <View style={styles.musicToggleRow}>
            <Text style={styles.musicToggleText}>Activer la musique</Text>
            <Switch value={musicEnabled} onValueChange={setMusicEnabled} />
          </View>
          {musicEnabled && (
            <>
              <View style={styles.volumeRow}>
                {VOLUME_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles.volumeChip, volumePreset === preset.id && styles.volumeChipActive]}
                    onPress={() => setVolumePreset(preset.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.volumeChipText, volumePreset === preset.id && styles.volumeChipTextActive]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.musicList}>
                {MUSIC_LIBRARY.map((track) => {
                  const isSelected = selectedMusicId === track.id;
                  const isPlaying = currentlyPlayingId === track.id;
                  return (
                    <View key={track.id} style={[styles.musicItem, isSelected && styles.musicItemSelected]}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.musicTitle}>{track.title}</Text>
                        <Text style={styles.musicSubtitle}>
                          {track.artist} • {track.duration}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.musicActionButton, isSelected && styles.musicActionButtonActive]}
                        onPress={() => setSelectedMusicId(track.id)}
                        activeOpacity={0.85}
                      >
                        <Text style={[styles.musicActionText, isSelected && styles.musicActionTextActive]}>
                          {isSelected ? 'Sélectionné' : 'Choisir'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.previewButton}
                        onPress={() => handlePreviewMusic(track.id)}
                        activeOpacity={0.85}
                      >
                        <Feather name={isPlaying ? 'pause' : 'play'} size={16} color={COLORS.accent} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>

        <View style={[styles.sectionCard, fieldErrors.title && styles.sectionCardError]} onLayout={handleFieldLayout('title')}>
          <SectionHeader
            title="Informations principales"
            subtitle="Titre, adresse et tarifs visibles côté clients"
          />
          {fieldErrors.title && <Text style={styles.fieldErrorText}>{fieldErrors.title}</Text>}
          <LabeledInput label="Titre de l’annonce" value={title} onChangeText={setTitle} placeholder="Ex : Appartement Moderne" error={fieldErrors.title} />
          <View style={{ marginBottom: 16 }}>
            <Label text="Type de bien" />
            <TouchableOpacity
              style={[styles.selectInput, (fieldErrors.listingType && styles.selectInputError) || (isTypePickerOpen && styles.selectInputActive)]}
              activeOpacity={0.85}
              onPress={() => setIsTypePickerOpen((current) => !current)}
            >
              <Text
                style={[styles.selectInputValue, !listingType && styles.selectInputValuePlaceholder]}
              >
                {listingType || 'Sélectionner un type'}
              </Text>
              <Feather name={isTypePickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.dark} />
            </TouchableOpacity>
            {isTypePickerOpen && (
              <View style={styles.dropdownContainer}>
                {LISTING_TYPES.map((typeOption) => {
                  const active = listingType === typeOption;
                  return (
                    <TouchableOpacity
                      key={typeOption}
                      style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                      activeOpacity={0.85}
                      onPress={() => {
                        setListingType(typeOption);
                        setIsTypePickerOpen(false);
                      }}
                    >
                      <Text style={[styles.dropdownOptionText, active && styles.dropdownOptionTextActive]}>{typeOption}</Text>
                      {active && <Feather name="check" size={14} color={COLORS.accent} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
          <LabeledInput label="Tarif" value={price} onChangeText={setPrice} keyboardType="numeric" error={fieldErrors.price} />
          <View style={{ marginBottom: 16 }}>
            <Label text="Quartier, ville" />
            <View style={[styles.addressInputWrapper, styles.addressInputWrapperTop]}>
              <TextInput
                style={[styles.addressInput, fieldErrors.address && styles.inputError]}
                placeholder="Ex. Bonapriso, Douala"
                placeholderTextColor="#9CA3AF"
                value={addressSearch}
                onFocus={() => {
                  cancelAddressDropdownClose();
                  setShowAddressDropdown(true);
                  setFieldErrors((prev) => ({ ...prev, address: null }));
                }}
                onBlur={scheduleAddressDropdownClose}
                onChangeText={(text) => {
                  setAddressSearch(text);
                  setAddress(text);
                  setShowAddressDropdown(true);
                  setSelectedPlaceId(null);
                  setSelectedLatitude(null);
                  setSelectedLongitude(null);
                  setFormattedAddress('');
                  setResolvedDistrict('');
                  addressDetailsRequestRef.current = null;
                }}
              />
              {showAddressDropdown && (addressSuggestions.length > 0 || isAddressLoading) && (
                <View style={styles.addressDropdown}>
                  {addressSuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={styles.addressDropdownItem}
                      onPressIn={cancelAddressDropdownClose}
                      onPress={() => handleAddressSuggestionSelect(suggestion)}
                    >
                      <Text style={styles.addressDropdownTitle}>{suggestion.primary}</Text>
                      {!!suggestion.secondary && (
                        <Text style={styles.addressDropdownSubtitle}>{suggestion.secondary}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                  {isAddressLoading && (
                    <View style={styles.addressDropdownFooter}>
                      <ActivityIndicator size="small" color={COLORS.accent} />
                      <Text style={styles.addressDropdownFooterText}>Recherche de quartiers…</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            {fieldErrors.address && <Text style={styles.fieldErrorText}>{fieldErrors.address}</Text>}
          </View>
          <View style={{ marginBottom: 16 }} onLayout={handleFieldLayout('city')}>
            <Label text="Ville" />
            <View style={[styles.addressInputWrapper, styles.addressInputWrapperMid]}>
              <TextInput
                style={[styles.addressInput, fieldErrors.city && styles.inputError]}
                placeholder="Ex. Douala"
                placeholderTextColor="#9CA3AF"
                value={cityInput}
                onFocus={() => {
                  cancelCityDropdownClose();
                  setShowCityDropdown(true);
                  setFieldErrors((prev) => ({ ...prev, city: null }));
                }}
                onBlur={scheduleCityDropdownClose}
                onChangeText={(text) => {
                  setCityInput(text);
                  setFieldErrors((prev) => ({ ...prev, city: null }));
                  setShowCityDropdown(true);
                }}
              />
              {showCityDropdown && (citySuggestions.length > 0 || isCityLoading) && (
                <View style={styles.addressDropdown}>
                  {citySuggestions.map((suggestion) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={styles.addressDropdownItem}
                      onPressIn={cancelCityDropdownClose}
                      onPress={() => handleCitySuggestionSelect(suggestion)}
                    >
                      <Text style={styles.addressDropdownTitle}>{suggestion.primary}</Text>
                      {!!suggestion.secondary && (
                        <Text style={styles.addressDropdownSubtitle}>{suggestion.secondary}</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                  {isCityLoading && (
                    <View style={styles.addressDropdownFooter}>
                      <ActivityIndicator size="small" color={COLORS.accent} />
                      <Text style={styles.addressDropdownFooterText}>Recherche de villes…</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
            {fieldErrors.city && <Text style={styles.fieldErrorText}>{fieldErrors.city}</Text>}
          </View>
          <LabeledInput
            label="Adresse Google"
            value={googleAddress}
            onChangeText={setGoogleAddress}
            placeholder="Lien Google Maps"
          />
        </View>

        <View style={[styles.sectionCard, fieldErrors.rooms && styles.sectionCardError]} onLayout={handleFieldLayout('rooms')}>
          <SectionHeader
            title="Répartition des pièces"
            subtitle="Déclarez précisément le nombre de pièces"
          />
          {fieldErrors.rooms && <Text style={styles.fieldErrorText}>{fieldErrors.rooms}</Text>}
          <View style={{ gap: 12 }}>
            {ROOM_COUNTERS.map((room) => (
              <View key={room} style={styles.counterRow}>
                <Text style={styles.counterLabel}>{room}</Text>
                <View style={styles.counterControls}>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => handleRoomAdjust(room, -1)}
                    activeOpacity={0.8}
                  >
                    <Feather name="minus" size={16} color={COLORS.dark} />
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>{roomCounts[room] ?? 0}</Text>
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => handleRoomAdjust(room, 1)}
                    activeOpacity={0.8}
                  >
                    <Feather name="plus" size={16} color={COLORS.dark} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
          <Text style={styles.supportText}>Ajustez les nombres pour refléter fidèlement votre bien.</Text>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            title="Nombre de personnes"
            subtitle="Indiquez combien de clients peuvent être accueillis confortablement"
          />
          <View style={styles.guestCapacityRow}>
            <Text style={styles.counterLabel}>Nombre de clients</Text>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setGuestCapacity((value) => Math.max(1, value - 1))}
                activeOpacity={0.8}
              >
                <Feather name="minus" size={16} color={COLORS.dark} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{guestCapacity}</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setGuestCapacity((value) => value + 1)}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={16} color={COLORS.dark} />
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.supportText}>Ce nombre sera affiché sur la fiche pour informer les clients.</Text>
        </View>

        <View style={[styles.sectionCard, fieldErrors.description && styles.sectionCardError]} onLayout={handleFieldLayout('description')}>
          <SectionHeader
            title="Description détaillée"
            subtitle="Présentez les points forts de votre logement et ajoutez toutes les informations utiles au client"
          />
          {fieldErrors.description && <Text style={styles.fieldErrorText}>{fieldErrors.description}</Text>}
          <Text style={[styles.supportText, styles.noteText]}>
            N.B. : Ne communiquez jamais l’adresse exacte ni un numéro de téléphone dans cette description, sous peine de
            bannissement.
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        <View style={[styles.sectionCard, fieldErrors.amenities && styles.sectionCardError]} onLayout={handleFieldLayout('amenities')}>
          <SectionHeader
            title="Équipements & services"
            subtitle="Choisissez les hashtags qui décrivent réellement ce meublé pour maximiser votre visibilité."
          />
          {fieldErrors.amenities && <Text style={styles.fieldErrorText}>{fieldErrors.amenities}</Text>}
          <View style={styles.amenitiesScrollContainer}>
            <ScrollView
              style={styles.amenitiesScroll}
              contentContainerStyle={styles.amenitiesGrid}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {AMENITY_OPTIONS.map((option) => {
                const active = amenities.includes(option.id);
                return (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.amenityChip, active && styles.amenityChipActive]}
                    onPress={() => toggleSelection(option.id, amenities, setAmenities)}
                    activeOpacity={0.85}
                  >
                    <View style={[styles.amenityIconHolder, active && styles.amenityIconHolderActive]}>
                      {renderAmenityIcon(option.icon, active ? '#FFFFFF' : COLORS.accent)}
                    </View>
                    <Text style={[styles.amenityLabel, active && styles.amenityLabelActive]}>{option.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            title="Disponibilités"
            subtitle="Choisissez un mode, touchez les jours puis validez pour bloquer ou débloquer. Les dates vertes sont libres par défaut."
          />
          <View style={styles.badgeGrid}>
            {AVAILABILITY_MODES.map((mode) => (
              <TouchableOpacity
                key={mode.key}
                style={[styles.badge, selectedAvailabilityMode === mode.key && styles.badgeActive]}
                onPress={() => setSelectedAvailabilityMode(mode.key)}
              >
                <Text
                  style={[styles.badgeText, selectedAvailabilityMode === mode.key && styles.badgeTextActive]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <CalendarCard />
        </View>

        <View style={styles.sectionCard}>
          <SectionHeader
            title="Promotion automatique"
            subtitle="Appliquez une remise au-delà d’un certain nombre de nuits"
          />
          <Text style={[styles.supportText, styles.supportTextTight]}>
            Définissez en combien de nuits la remise s’active, puis le pourcentage. Nous calculerons la réduction lors des
            réservations longues.
          </Text>
          <View style={styles.promoRow}>
            <View style={{ flex: 1 }}>
              <Label text="Nombre de nuits" />
              <TextInput
                style={styles.promoInput}
                value={promoNights}
                onChangeText={setPromoNights}
                keyboardType="numeric"
              />
            </View>
            <View style={{ width: 18 }} />
            <View style={{ flex: 1 }}>
              <Label text="Remise (%)" />
              <TextInput
                style={styles.promoInput}
                value={promoDiscount}
                onChangeText={setPromoDiscount}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        <View style={[styles.sectionCard, { marginBottom: 48 }]}>
          <SectionHeader
            title="Publication"
            subtitle={isCreateMode ? 'Publiez votre annonce quand tout est prêt' : 'Mettez à jour ou dépubliez votre annonce'}
          />
          {isCreateMode ? (
            <>
              <View style={[styles.footerActions, styles.footerActionsColumn]}>
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.secondaryButtonFullWidth]}
                  activeOpacity={0.85}
                  onPress={() => handleSaveDraft()}
                  disabled={isSaving}
                >
                  <Text style={styles.secondaryButtonText}>Enregistrer en brouillon</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[styles.publishButton, isSaving && styles.buttonDisabled]}
                activeOpacity={0.9}
                onPress={() => handlePublish()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Feather name="check-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.publishButtonText}>Publier l’annonce</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.footerActions}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  activeOpacity={0.85}
                  onPress={() => handleSaveDraft()}
                  disabled={isSaving}
                >
                  <Text style={styles.secondaryButtonText}>Enregistrer en brouillon</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
                  activeOpacity={0.9}
                  onPress={() => handlePublish()}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {isDraftStatus ? "Publier l’annonce" : 'Mettre à jour'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.dangerButton}
                activeOpacity={0.85}
                onPress={() => handleDelete()}
                disabled={isSaving}
              >
                <Feather name="alert-triangle" size={14} color="#FFFFFF" />
                <Text style={styles.dangerButtonText}>
                  {isDraftStatus ? 'Supprimer le brouillon' : "Supprimer l’annonce"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!activePreviewMedia}
        animationType="fade"
        presentationStyle="fullScreen"
        hardwareAccelerated
        onRequestClose={() => setPreviewMedia(null)}
      >
        <View style={styles.previewFullscreen}>
          <View style={[styles.previewMediaArea, { paddingTop: insets.top }]}>
            {activePreviewMedia?.type === 'photo' ? (
              <Image
                source={{ uri: activePreviewMedia?.uri }}
                style={styles.previewFullscreenMedia}
                resizeMode="contain"
              />
            ) : (
              <>
                <TouchableWithoutFeedback onPress={handlePreviewPlayPause}>
                  <Video
                    key={activePreviewMedia?.id ?? 'preview-video'}
                    ref={previewVideoRef}
                    source={{ uri: activePreviewMedia?.uri ?? '' }}
                    style={styles.previewFullscreenMedia}
                    resizeMode={ResizeMode.CONTAIN}
                    shouldPlay={isPreviewPlaying}
                    isMuted={activePreviewMedia?.muted ?? false}
                    onPlaybackStatusUpdate={handlePreviewStatus}
                    onLoadStart={() => setPreviewVideoLoading(true)}
                    onLoad={() => setPreviewVideoLoading(false)}
                    onError={(error) => {
                      setPreviewVideoLoading(false);
                      console.warn('[PreviewVideo] error', error);
                      if (!previewVisibleRef.current) {
                        return;
                      }
                      Alert.alert('Lecture impossible', 'Vidéo introuvable ou incompatible. Consultez les logs Expo pour le détail.');
                    }}
                  />
                </TouchableWithoutFeedback>
                {previewVideoLoading && (
                  <View style={styles.previewLoadingOverlay}>
                    <ActivityIndicator color="#FFFFFF" size="large" />
                    <Text style={styles.previewLoadingText}>Chargement de la vidéo…</Text>
                  </View>
                )}
                {!isPreviewPlaying && !previewVideoLoading && (
                  <TouchableOpacity
                    style={styles.previewCenterPlayButton}
                    onPress={handlePreviewPlayPause}
                    activeOpacity={0.9}
                  >
                    <Feather name="play" size={26} color={COLORS.dark} />
                  </TouchableOpacity>
                )}
              </>
            )}
            <View style={[styles.previewOverlayTop, { paddingTop: insets.top + 8 }]}>
              <TouchableOpacity style={styles.previewBackButton} onPress={() => setPreviewMedia(null)} activeOpacity={0.85}>
                <Feather name="chevron-left" size={18} color="#FFFFFF" />
              </TouchableOpacity>
              {activePreviewMedia?.room ? (
                <View style={styles.previewTagPill}>
                  <Feather name="tag" size={14} color="#FFFFFF" />
                  <Text style={styles.previewTagText}>{activePreviewMedia.room}</Text>
                </View>
              ) : (
                <View style={{ width: 44, height: 44 }} />
              )}
            </View>
            {activePreviewMedia?.type === 'video' && !previewVideoLoading && previewDurationMillis > 0 && (
              <View style={styles.previewOverlayBottom}>
                <View style={styles.previewTimelineRow}>
                  <Text style={styles.previewTimeText}>{formatDuration(Math.floor(previewSeekMillis / 1000))}</Text>
                  <Slider
                    style={styles.previewSlider}
                    minimumValue={0}
                    maximumValue={previewSliderMax}
                    minimumTrackTintColor={COLORS.accent}
                    maximumTrackTintColor="rgba(255,255,255,0.25)"
                    thumbTintColor={COLORS.accent}
                    value={previewSeekMillis}
                    onValueChange={(value) => setPreviewSeekMillis(value)}
                    onSlidingStart={handlePreviewSlidingStart}
                    onSlidingComplete={handlePreviewSlidingComplete}
                  />
                  <Text style={styles.previewTimeText}>
                    {formatDuration(Math.floor((previewDurationMillis || previewSliderMax) / 1000))}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={publishSuccessVisible}
        transparent
        animationType="fade"
        onRequestClose={handleClosePublishModal}
      >
        <View style={styles.publishModalOverlay}>
          <View style={styles.publishModalCard}>
            <TouchableOpacity style={styles.publishModalClose} onPress={handleClosePublishModal} activeOpacity={0.85}>
              <Feather name="x" size={18} color={COLORS.dark} />
            </TouchableOpacity>
            <View style={styles.publishModalIcon}>
              <Feather name="check-circle" size={32} color={COLORS.accent} />
            </View>
            <Text style={styles.publishModalTitle}>{isCreateMode ? 'Annonce publiée !' : 'Annonce mise à jour !'}</Text>
            <Text style={styles.publishModalMessage}>
              {isCreateMode
                ? 'Votre annonce est maintenant en ligne et prête à être consultée.'
                : 'Vos modifications ont bien été enregistrées.'}
            </Text>
            <TouchableOpacity style={styles.publishModalPrimary} activeOpacity={0.9} onPress={handleViewPublishedListing}>
              <Text style={styles.publishModalPrimaryText}>Voir l’annonce</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const Label = ({ text }: { text: string }) => <Text style={styles.label}>{text}</Text>;

type LabeledInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
  [key: string]: any;
};

const LabeledInput = ({ label, value, onChangeText, placeholder, error, ...rest }: LabeledInputProps) => (
  <View style={{ marginBottom: 16 }}>
    <Label text={label} />
    <TextInput
      style={[styles.input, error && styles.inputError]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={COLORS.muted}
      {...rest}
    />
    {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
  </View>
);

const SectionHeader = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <View style={{ marginBottom: 16 }}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <Text style={styles.sectionSubtitle}>{subtitle}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  headerTitle: {
    fontFamily: 'Manrope',
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.dark,
  },
  headerStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.35)',
    backgroundColor: '#FFFFFF',
    shadowColor: '#2ECC71',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  headerStatusPublished: {
    borderColor: 'rgba(46,204,113,0.35)',
  },
  headerStatusDraft: {
    borderColor: 'rgba(46,204,113,0.25)',
  },
  headerStatusText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 64,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 12,
  },
  sectionCardError: {
    borderColor: COLORS.danger,
  },
  sectionTitle: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
  },
  sectionSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  label: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.muted,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    backgroundColor: '#FFFFFF',
  },
  addressInputWrapper: {
    marginTop: 8,
    position: 'relative',
    zIndex: 10,
    overflow: 'visible',
  },
  addressInputWrapperTop: {
    zIndex: 40,
  },
  addressInputWrapperMid: {
    zIndex: 30,
  },
  addressInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    backgroundColor: '#FFFFFF',
  },
  addressDropdown: {
    position: 'absolute',
    top: '105%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    zIndex: 1000,
    overflow: 'hidden',
  },
  addressDropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(15,23,42,0.08)',
  },
  addressDropdownTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  addressDropdownSubtitle: {
    marginTop: 2,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  addressDropdownFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addressDropdownFooterText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  fieldErrorText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.danger,
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mediaTile: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#111827',
  },
  mediaTopRow: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mediaRoomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  mediaRoomText: {
    fontFamily: 'Manrope',
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.accent,
  },
  mediaDurationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.65)',
  },
  mediaDurationText: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  videoTile: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  videoLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  mediaDelete: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  mediaActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.12)',
  },
  mediaActionPrimary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.35)',
    shadowColor: '#2ECC71',
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  mediaActionButtonDisabled: {
    opacity: 0.6,
  },
  mediaActionButtonError: {
    borderColor: COLORS.danger,
  },
  coverActionButton: {
    backgroundColor: 'rgba(46,204,113,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.2)',
  },
  mediaActionText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accent,
  },
  mediaActionSubtext: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: COLORS.muted,
  },
  mediaActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(46,204,113,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaActionIconSecondary: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(46,204,113,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaControlList: {
    marginTop: 16,
    gap: 12,
  },
  mediaControlCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 18,
    padding: 14,
    gap: 12,
    backgroundColor: '#FFFFFF',
  },
  mediaControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mediaControlTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  roomChipRow: {
    gap: 8,
    paddingVertical: 4,
  },
  roomChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
  },
  roomChipActive: {
    borderColor: 'rgba(46,204,113,0.4)',
    backgroundColor: 'rgba(46,204,113,0.15)',
  },
  roomChipText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  roomChipTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  muteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muteLabel: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
  },
  coverPreviewCard: {
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    padding: 14,
    flexDirection: 'row',
    gap: 14,
  },
  coverPreviewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#0F172A',
  },
  coverPreviewTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  coverPreviewSubtitle: {
    marginTop: 4,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  coverPreviewAction: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coverPreviewActionText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenitiesScrollContainer: {
    marginTop: 12,
    maxHeight: 240,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  amenitiesScroll: {
    maxHeight: 216,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(46,204,113,0.35)',
    backgroundColor: 'rgba(46,204,113,0.08)',
  },
  amenityChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  amenityIconHolder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46,204,113,0.15)',
  },
  amenityIconHolderActive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  amenityLabel: {
    fontFamily: 'Manrope',
    fontSize: 10.5,
    fontWeight: '600',
    color: COLORS.accent,
  },
  amenityLabelActive: {
    color: '#FFFFFF',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  badgeActive: {
    borderColor: 'rgba(46,204,113,0.35)',
    backgroundColor: 'rgba(46,204,113,0.15)',
  },
  badgeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  badgeTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  supportText: {
    marginTop: 8,
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  noteText: {
    fontSize: 11,
    color: COLORS.danger,
    marginTop: 4,
  },
  supportTextTight: {
    marginTop: -10,
  },
  musicToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  musicToggleText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    fontWeight: '600',
  },
  volumeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  volumeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  volumeChipActive: {
    borderColor: 'rgba(46,204,113,0.4)',
    backgroundColor: 'rgba(46,204,113,0.12)',
  },
  volumeChipText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  volumeChipTextActive: {
    color: COLORS.accent,
    fontWeight: '700',
  },
  musicList: {
    marginTop: 12,
    gap: 10,
  },
  musicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
  },
  musicItemSelected: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(46,204,113,0.08)',
  },
  musicTitle: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.dark,
  },
  musicSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  musicActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  musicActionButtonActive: {
    borderColor: COLORS.accent,
    backgroundColor: 'rgba(46,204,113,0.15)',
  },
  musicActionText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.dark,
  },
  musicActionTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: COLORS.dark,
  },
  dropdownOptionTextActive: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  selectInput: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  selectInputActive: {
    borderColor: COLORS.accent,
  },
  selectInputError: {
    borderColor: COLORS.danger,
  },
  selectInputValue: {
    fontSize: 15,
    color: COLORS.dark,
    fontWeight: '600',
  },
  selectInputValuePlaceholder: {
    color: COLORS.muted,
    fontWeight: '500',
  },
  dropdownContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownOptionActive: {
    backgroundColor: 'rgba(46, 204, 113, 0.08)',
  },
  previewButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  previewFullscreen: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTopControls: {
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  previewOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  previewBackButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  previewTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  previewTagText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  previewOverlayBottom: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    alignItems: 'center',
    gap: 12,
  },
  previewTimelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  previewSlider: {
    flex: 1,
  },
  previewTimeText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: '#FFFFFF',
    minWidth: 48,
    textAlign: 'center',
  },
  previewCenterPlayButton: {
    position: 'absolute',
    top: '45%',
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  previewMediaArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLoadingOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 20,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewLoadingText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  previewCoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: COLORS.accent,
  },
  previewCoverButtonText: {
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.surface,
  },
  previewFullscreenMedia: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: '#000',
  },
  previewClose: {
    alignSelf: 'flex-end',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.06)',
  },
  previewFooter: {
    width: '100%',
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  previewDismissButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(15,23,42,0.55)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  previewDismissButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.surface,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  counterLabel: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
  },
  counterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
  },
  counterValue: {
    fontFamily: 'Manrope',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.dark,
    minWidth: 24,
    textAlign: 'center',
  },
  guestCapacityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  calendarCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(15,23,42,0.02)',
    gap: 12,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  calendarTitle: {
    fontFamily: 'Manrope',
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.dark,
  },
  calendarSubtitle: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 2,
  },
  calendarHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarNavButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  calendarNavButtonDisabled: {
    opacity: 0.4,
  },
  calendarBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(46,204,113,0.12)',
    fontFamily: 'Manrope',
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.accent,
  },
  availabilityLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontFamily: 'Manrope',
    fontSize: 12,
    color: COLORS.muted,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
    gap: 8,
  },
  calendarDay: {
    width: '14%',
    aspectRatio: 0.75,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  calendarDay_available: {
    backgroundColor: 'rgba(46,204,113,0.12)',
    borderColor: 'rgba(46,204,113,0.35)',
  },
  calendarDay_blocked: {
    backgroundColor: 'rgba(220,38,38,0.08)',
    borderColor: COLORS.danger,
  },
  calendarDay_reserved: {
    backgroundColor: 'rgba(249,115,22,0.1)',
    borderColor: '#F97316',
  },
  calendarDaySelected: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  calendarDayFaded: {
    opacity: 0.35,
  },
  calendarDayPast: {
    opacity: 0.4,
  },
  calendarDayWeek: {
    fontFamily: 'Manrope',
    fontSize: 11,
    color: COLORS.muted,
  },
  calendarDayNumber: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.dark,
  },
  calendarButton: {
    marginTop: 4,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    gap: 8,
  },
  calendarButtonDisabled: {
    opacity: 0.4,
  },
  calendarButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  promoRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  promoInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.dark,
    backgroundColor: '#FFFFFF',
  },
  footerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  footerActionsColumn: {
    flexDirection: 'column',
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonFullWidth: {
    width: '100%',
  },
  secondaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    color: COLORS.dark,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerButton: {
    marginTop: 16,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    flexDirection: 'row',
    gap: 8,
  },
  dangerButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  publishButton: {
    marginTop: 16,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  publishButtonText: {
    fontFamily: 'Manrope',
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  publishModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  publishModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  publishModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishModalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(46,204,113,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  publishModalTitle: {
    fontFamily: 'Manrope',
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.dark,
    textAlign: 'center',
  },
  publishModalMessage: {
    fontFamily: 'Manrope',
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  publishModalPrimary: {
    marginTop: 4,
    width: '100%',
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishModalPrimaryText: {
    fontFamily: 'Manrope',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
